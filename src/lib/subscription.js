// Client for the subscription paywall: talks to /api/stripe/* and manages
// the localStorage access flag. This is a convenience cache only - App.jsx
// always re-verifies against Stripe on mount before trusting it.

const STORAGE_KEY = "ecf.subscription.v1";

export function getStoredAccess() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAccess(access) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(access));
}

export function clearStoredAccess() {
  localStorage.removeItem(STORAGE_KEY);
}

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function startCheckout() {
  return post("/api/stripe/create-checkout-session");
}

export function verifyCheckoutSession(sessionId) {
  return post("/api/stripe/verify-session", { sessionId });
}

export function checkSubscription(customerId) {
  return post("/api/stripe/check-subscription", { customerId });
}

export function createPortalSession(customerId) {
  return post("/api/stripe/create-portal-session", { customerId });
}
