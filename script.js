// ===================== NAV (your existing menu code) =====================
const btn = document.querySelector(".nav-toggle");
const menu = document.querySelector("#mobileMenu");

btn?.addEventListener("click", () => {
  const open = btn.classList.toggle("is-open");
  menu.classList.toggle("is-open", open);
  btn.setAttribute("aria-expanded", open ? "true" : "false");
  btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

// Close menu when a link is clicked (mobile UX)
menu?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    btn.classList.remove("is-open");
    menu.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Open menu");
  });
});

// ===================== CART LOGIC =====================
const CART_KEY = "chika_cart_v1";
const currencySymbol = "$";

const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || "[]");
const setCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const formatMoney = (n) => `${currencySymbol}${Number(n).toFixed(2)}`;

function cartCount(cart) {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal(cart) {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function addToCart({ id, name, price }) {
  if (!id) return;

  const cart = getCart();
  const existing = cart.find((i) => i.id === id);

  if (existing) existing.qty += 1;
  else cart.push({ id, name, price: Number(price), qty: 1 });

  setCart(cart);
  renderCart();
  openCart();
}

function removeFromCart(id) {
  const cart = getCart().filter((i) => i.id !== id);
  setCart(cart);
  renderCart();
}

function setQty(id, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  item.qty = Number(qty);
  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }

  setCart(cart);
  renderCart();
}

// ===================== CART UI =====================
const cartBtns = document.querySelectorAll(".cart-btn");
const cartCountEls = document.querySelectorAll(".cart-count");

const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartClose = document.getElementById("cartClose");

const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

function openCart() {
  cartDrawer?.classList.add("is-open");
  cartDrawer?.setAttribute("aria-hidden", "false");
  if (cartOverlay) cartOverlay.hidden = false;

  // prevent background scroll when cart is open
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartDrawer?.classList.remove("is-open");
  cartDrawer?.setAttribute("aria-hidden", "true");
  if (cartOverlay) cartOverlay.hidden = true;

  document.body.style.overflow = "";
}

cartBtns.forEach((b) => b.addEventListener("click", openCart));
cartClose?.addEventListener("click", closeCart);
cartOverlay?.addEventListener("click", closeCart);

// Close cart with ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cartDrawer?.classList.contains("is-open")) closeCart();
});

// Add-to-cart buttons (event delegation)
document.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".add-to-cart");
  if (!addBtn) return;

  const card = addBtn.closest(".drop-card");
  if (!card) return;

  addToCart({
    id: card.dataset.id,
    name: card.dataset.name,
    price: card.dataset.price,
  });
});

function renderCart() {
  const cart = getCart();

  // update ALL count badges (desktop + mobile)
  cartCountEls.forEach((el) => (el.textContent = cartCount(cart)));

  if (!cartItemsEl || !cartTotalEl || !checkoutBtn) return;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<p style="padding:12px;">Your cart is empty.</p>`;
    cartTotalEl.textContent = formatMoney(0);
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.disabled = false;

  cartItemsEl.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item">
        <div class="cart-item-main">
          <div>
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${formatMoney(item.price)}</div>
          </div>

          <button class="cart-remove" type="button" data-remove="${item.id}">
            Remove
          </button>
        </div>

        <div class="cart-qty">
          <button type="button" data-dec="${item.id}" aria-label="Decrease quantity">-</button>
          <span aria-label="Quantity">${item.qty}</span>
          <button type="button" data-inc="${item.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
    `
    )
    .join("");

  cartTotalEl.textContent = formatMoney(cartTotal(cart));

  // bind remove + qty
  cartItemsEl.querySelectorAll("[data-remove]").forEach((b) => {
    b.addEventListener("click", () => removeFromCart(b.dataset.remove));
  });

  cartItemsEl.querySelectorAll("[data-inc]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.inc;
      const cart = getCart();
      const item = cart.find((i) => i.id === id);
      setQty(id, (item?.qty || 0) + 1);
    });
  });

  cartItemsEl.querySelectorAll("[data-dec]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.dec;
      const cart = getCart();
      const item = cart.find((i) => i.id === id);
      setQty(id, (item?.qty || 0) - 1);
    });
  });
}

// ===================== STRIPE (VERCEL) =====================
checkoutBtn?.addEventListener("click", async () => {
  const cart = getCart();

  if (!cart || cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  const originalText = checkoutBtn.textContent;

  try {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Redirecting...";

    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
    });

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("Non-JSON response from API:", text);
      throw new Error("Checkout API returned non-JSON. Check Vercel Function logs.");
    }

    if (!res.ok) throw new Error(data.error || "Checkout failed");
    if (!data.url) throw new Error("No Stripe Checkout URL returned.");

    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    alert(err.message);
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = originalText;
  }
});

// Initial render
renderCart();
