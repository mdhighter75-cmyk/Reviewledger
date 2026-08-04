// Vercel serverless function: /api/stripe/create-checkout-session
// Starts a subscription Checkout Session for the Empire Content Factory plan.

import { getStripe, getOrigin } from "./_lib/stripeClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return res.status(500).json({ error: "Server is missing STRIPE_PRICE_ID" });
  }

  try {
    const stripe = getStripe();
    const origin = getOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Stripe substitutes {CHECKOUT_SESSION_ID} at redirect time - must stay unencoded.
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=canceled`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return res.status(502).json({ error: err.message || "Could not start checkout" });
  }
}
