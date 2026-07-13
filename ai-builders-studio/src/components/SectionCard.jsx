import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, Download } from "lucide-react";
import { downloadBase64Image, slugify } from "../lib/downloadPackage.js";

export default function SectionCard({ section }) {
  const [open, setOpen] = useState(true);
  const failed = section.status === "failed";

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="font-semibold text-slate-900">{section.label}</p>
          <p className="text-xs text-slate-500">{section.specialist}</p>
        </div>
        <div className="flex items-center gap-2">
          {failed && <AlertTriangle size={16} className="text-amber-500" />}
          {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          {failed ? (
            <p className="text-sm text-amber-700">This specialist couldn't finish: {section.error}</p>
          ) : section.type === "image" ? (
            <div className="space-y-3">
              <img
                src={`data:image/png;base64,${section.imageBase64}`}
                alt={`${section.label} concept`}
                className="w-40 h-40 rounded-lg border border-slate-200 object-cover"
              />
              <p className="text-xs text-slate-500">{section.imagePrompt}</p>
              <button
                onClick={() => downloadBase64Image(`${slugify(section.label)}.png`, section.imageBase64)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                <Download size={14} /> Download PNG
              </button>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{section.text}</pre>
          )}
        </div>
      )}
    </div>
  );
}
