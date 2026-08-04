import { useState } from "react";
import { Lock, Sparkles, Loader2, Factory } from "lucide-react";
import { startCheckout } from "../lib/subscription.js";

export default function PaywallScreen({ initialError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || "");

  async function handleUnlock() {
    setLoading(true);
    setError("");
    try {
      const { url } = await startCheckout();
      window.location.href = url;
    } catch (err) {
      setError(err.message || "Could not start checkout");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] bg-grid flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 mb-4">
          <Factory size={16} className="text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Empire Content Factory</h1>
        <p className="text-sm text-white/40 mb-8">One source in, a complete content business package out.</p>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-left">
          <div className="flex items-center gap-2 mb-4 text-white/40">
            <Lock size={14} />
            <span className="text-xs font-semibold uppercase tracking-wider">Subscription required</span>
          </div>
          <p className="text-4xl font-bold text-white mb-1">
            $49.99<span className="text-base font-medium text-white/40">/mo</span>
          </p>
          <p className="text-sm text-white/50 mb-6">Unlock Empire Content Factory</p>

          <button
            type="button"
            onClick={handleUnlock}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:shadow-violet-700/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Redirecting to checkout…" : "Unlock — $49.99/mo"}
          </button>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <p className="mt-6 text-xs text-white/30">Secure checkout powered by Stripe. Cancel anytime.</p>
      </div>
    </div>
  );
}
