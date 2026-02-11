const Stripe = require("stripe");

const PRICE_BOOK = {
  "through-times-original": { name: "Through Times Journey — Original", amount: 22222 },
  "through-times-print": { name: "Through Times Journey — Print", amount: 5000 },

  "cherry-blossoms-original": { name: "Cherry Blossoms — Original", amount: 22222 },
  "cherry-blossoms-print": { name: "Cherry Blossoms — Print", amount: 5000 },

  "orchids-essence-original": { name: "Orchids Essence — Original", amount: 22222 },
  "orchids-essence-print": { name: "Orchids Essence — Print", amount: 5000 },

  "smoking-kills-original": { name: "Smoking Kills — Original", amount: 22222 },
  "smoking-kills-print": { name: "Smoking Kills — Print", amount: 5000 },

  "red-flower-original": { name: "Red Flower — Original", amount: 22222 },
  "red-flower-print": { name: "Red Flower — Print", amount: 5000 },
};

module.exports = async (req, res) => {
  try {
    // (Optional) If calling from GitHub Pages, keep these:
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    if (!process.env.sk_test_51SzknU9wpJuXQ1VczYfGc8JO7AFasgdfzPLahXCyRGno6J8WAwHetmkhLrAimyHmkZxZinvKSAKOinabDA3NSyrs00xLdeX541) {
      return res.status(500).json({ error: "Missing sk_test_51SzknU9wpJuXQ1VczYfGc8JO7AFasgdfzPLahXCyRGno6J8WAwHetmkhLrAimyHmkZxZinvKSAKOinabDA3NSyrs00xLdeX541 in Vercel env vars" });
    }

    const stripe = new Stripe(process.env.sk_test_51SzknU9wpJuXQ1VczYfGc8JO7AFasgdfzPLahXCyRGno6J8WAwHetmkhLrAimyHmkZxZinvKSAKOinabDA3NSyrs00xLdeX541);

    const { cart } = req.body || {};
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const line_items = cart.map((item) => {
      const product = PRICE_BOOK[item.id];
      if (!product) throw new Error(`Unknown product id: ${item.id}`);

      const qty = Math.max(1, Math.min(20, Number(item.qty || 1)));

      return {
        price_data: {
          currency: "usd",
          product_data: { name: product.name },
          unit_amount: product.amount,
        },
        quantity: qty,
      };
    });

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/success.html`,
      cancel_url: `${origin}/#shop`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
