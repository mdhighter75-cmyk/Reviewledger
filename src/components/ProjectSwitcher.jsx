import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, FolderOpen } from "lucide-react";

export default function ProjectSwitcher({ projects, currentId, onSelect, onCreate, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = projects.find((p) => p.id === currentId);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
      >
        <FolderOpen size={15} />
        <span className="max-w-[160px] truncate">{current?.name || "Projects"}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/10 bg-[#111118] shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <button
            onClick={() => {
              onCreate();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-violet-300 hover:bg-violet-500/10 border-b border-white/10"
          >
            <Plus size={15} /> New Project
          </button>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {projects.length === 0 && <p className="px-4 py-4 text-xs text-white/30">No projects yet.</p>}
            {projects.map((p) => (
              <div
                key={p.id}
                className={`group flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  p.id === currentId ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => {
                  onSelect(p.id);
                  setOpen(false);
                }}
              >
                <div className="min-w-0">
                  <p className="truncate">{p.name}</p>
                  <p className="text-[11px] text-white/30 capitalize">{p.status}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${p.name}"? This can't be undone.`)) onDelete(p.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-red-400 transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
