// Vercel serverless function: /api/stripe/create-portal-session
// Sends an existing subscriber to Stripe's hosted billing portal to manage
// or cancel their subscription.

import { getStripe, getOrigin } from "./_lib/stripeClient.js";

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
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: getOrigin(req),
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error("create-portal-session error:", err);
    return res.status(502).json({ error: err.message || "Could not open billing portal" });
  }
}
