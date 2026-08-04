// Shared helpers for every /api/stripe/* serverless function.

import Stripe from "stripe";

let stripe;

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("Server is missing STRIPE_SECRET_KEY");
  }
  if (!stripe) {
    stripe = new Stripe(apiKey);
  }
  return stripe;
}

// Derive the app's own origin from the request instead of trusting a
// client-supplied value, so this can't be abused to make Stripe redirect
// somewhere the deploy doesn't control.
export function getOrigin(req) {
  if (req.headers.origin) return req.headers.origin;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
}
