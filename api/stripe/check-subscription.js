// Vercel serverless function: /api/stripe/check-subscription
// Re-verifies an existing customer's subscription status against Stripe -
// called once per app session so a cancellation or failed payment revokes
// access automatically instead of trusting a stale localStorage flag forever.

import { getStripe } from "./_lib/stripeClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { customerId } = req.body || {};
  if (!customerId || typeof customerId !== "string") {
    return res.status(400).json({ error: "Missing customerId" });
  }

  try {
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const subscription = subscriptions.data[0];

    return res.status(200).json({
      active: !!subscription,
      status: subscription?.status || "inactive",
      subscriptionId: subscription?.id || null,
    });
  } catch (err) {
    console.error("check-subscription error:", err);
    return res.status(502).json({ error: err.message || "Could not check subscription" });
  }
}
