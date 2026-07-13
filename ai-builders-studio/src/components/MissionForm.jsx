import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";

const EXAMPLES = [
  "Build me a dog training business.",
  "Launch a subscription box for hot sauce lovers.",
  "Start a freelance resume-writing service.",
];

export default function MissionForm({ onSubmit, isRunning }) {
  const [mission, setMission] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!mission.trim() || isRunning) return;
    onSubmit(mission.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={mission}
        onChange={(e) => setMission(e.target.value)}
        disabled={isRunning}
        placeholder='"Empire, assemble this project." Give the Orchestrator one idea…'
        rows={3}
        className="w-full rounded-xl border border-slate-300 p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
      />
      <div className="flex flex-wrap items-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            type="button"
            key={ex}
            disabled={isRunning}
            onClick={() => setMission(ex)}
            className="text-xs rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={isRunning || !mission.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
        {isRunning ? "Orchestrating…" : "Empire, assemble this project"}
      </button>
    </form>
  );
}
