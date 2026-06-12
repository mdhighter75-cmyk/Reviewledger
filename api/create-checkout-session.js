// Vercel serverless function: /api/create-checkout-session
// Requires env vars: STRIPE_SECRET_KEY, STRIPE_PRICE_ID
// STRIPE_PRICE_ID = the Price ID of your monthly subscription product in Stripe Dashboard

import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!stripeKey || !priceId) {
    return res.status(500).json({ error: "Stripe is not configured yet" });
  }

  const stripe = new Stripe(stripeKey);
  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: "Could not create checkout session", detail: String(err) });
  }
}
