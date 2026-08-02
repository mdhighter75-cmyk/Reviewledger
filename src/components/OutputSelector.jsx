import { Check } from "lucide-react";
import { OUTPUT_GROUPS } from "../lib/outputFormats.js";

export default function OutputSelector({ selected, onChange }) {
  function toggle(id) {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  }

  function toggleGroup(group) {
    const ids = group.outputs.map((o) => o.id);
    const allSelected = ids.every((id) => selected.includes(id));
    if (allSelected) onChange(selected.filter((s) => !ids.includes(s)));
    else onChange(Array.from(new Set([...selected, ...ids])));
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {OUTPUT_GROUPS.map((group) => {
        const ids = group.outputs.map((o) => o.id);
        const allSelected = ids.every((id) => selected.includes(id));
        const someSelected = ids.some((id) => selected.includes(id));
        return (
          <div
            key={group.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-2"
          >
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="flex items-center justify-between text-left mb-1 group"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50 group-hover:text-white/80">
                {group.label}
              </span>
              <span
                className={`h-4 w-4 rounded border flex items-center justify-center ${
                  allSelected
                    ? "bg-violet-500 border-violet-500"
                    : someSelected
                    ? "bg-violet-500/30 border-violet-400"
                    : "border-white/20"
                }`}
              >
                {allSelected && <Check size={11} strokeWidth={3} className="text-white" />}
              </span>
            </button>
            <div className="flex flex-col gap-1">
              {group.outputs.map((o) => {
                const isOn = selected.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                      isOn ? "bg-violet-500/15 text-white" : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggle(o.id)}
                      className="sr-only"
                    />
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-sm border flex items-center justify-center ${
                        isOn ? "bg-violet-500 border-violet-500" : "border-white/25"
                      }`}
                    >
                      {isOn && <Check size={9} strokeWidth={3} className="text-white" />}
                    </span>
                    {o.label}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
