// Vercel serverless function: /api/stripe/verify-session
// Confirms a just-completed Checkout Session server-side before granting
// access - never trust the success redirect alone.

import { getStripe } from "./_lib/stripeClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Missing sessionId" });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    const subscription = session.subscription;
    const active = subscription?.status === "active";

    return res.status(200).json({
      active,
      status: subscription?.status || null,
      customerId: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
      subscriptionId: typeof subscription === "string" ? subscription : subscription?.id || null,
    });
  } catch (err) {
    console.error("verify-session error:", err);
    return res.status(502).json({ error: err.message || "Could not verify checkout session" });
  }
}
