import { CheckCircle2, Loader2, Circle, AlertTriangle } from "lucide-react";

const STATUS_ICON = {
  idle: <Circle size={18} className="text-white/20" />,
  running: <Loader2 size={18} className="text-violet-400 animate-spin" />,
  done: <CheckCircle2 size={18} className="text-emerald-400" />,
  error: <AlertTriangle size={18} className="text-red-400" />,
};

export default function ProcessingScreen({ stages, stageStatus, stageErrors, onViewResults, onBack, allSettled, hasAnyAsset }) {
  const doneCount = stages.filter((s) => stageStatus[s.id] === "done").length;
  const current = stages.find((s) => stageStatus[s.id] === "running");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center">
      <h2 className="text-2xl font-semibold text-white mb-1">Building your content package</h2>
      <p className="text-sm text-white/50 mb-8">
        {current ? `Currently: ${current.label}` : allSettled ? "Done." : "Starting up..."}
      </p>

      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-8">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${(doneCount / stages.length) * 100}%` }}
        />
      </div>

      <div className="w-full flex flex-col gap-2">
        {stages.map((stage) => {
          const status = stageStatus[stage.id] || "idle";
          return (
            <div
              key={stage.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                status === "running"
                  ? "border-violet-500/40 bg-violet-500/[0.06]"
                  : status === "error"
                  ? "border-red-500/30 bg-red-500/[0.06]"
                  : status === "done"
                  ? "border-white/10 bg-white/[0.02]"
                  : "border-white/5 bg-transparent"
              }`}
            >
              <div className="mt-0.5">{STATUS_ICON[status]}</div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${status === "idle" ? "text-white/40" : "text-white"}`}>{stage.label}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {status === "error" ? stageErrors[stage.id] || "Failed" : stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {allSettled && (
        <div className="mt-10 flex items-center gap-3">
          {hasAnyAsset && (
            <button
              type="button"
              onClick={onViewResults}
              className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:-translate-y-0.5 transition-transform"
            >
              View Results
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/15 px-6 py-3.5 text-sm text-white/70 hover:text-white hover:border-white/30 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
