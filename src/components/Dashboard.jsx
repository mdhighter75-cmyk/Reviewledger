import { useRef, useState } from "react";
import { UploadCloud, FileText, X, Sparkles, Loader2 } from "lucide-react";
import OutputSelector from "./OutputSelector.jsx";
import { extractPdfText } from "../lib/pdfText.js";

const VOICE_PRESETS = ["Bold & confident", "Friendly & casual", "Professional & polished", "Witty & playful", "Warm & empathetic"];

export default function Dashboard({ project, onUpdate, onBuild, buildDisabled }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFile(file) {
    setFileError("");
    if (!file) return;
    setParsing(true);
    try {
      let text = "";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        text = await extractPdfText(file);
        if (!text.trim()) throw new Error("Couldn't find any text in that PDF - try pasting the text directly instead.");
      } else {
        text = await file.text();
      }
      onUpdate({ source: { text, fileName: file.name } });
    } catch (err) {
      setFileError(err.message || "Couldn't read that file.");
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const wordCount = project.source.text ? project.source.text.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Project Name</label>
        <input
          value={project.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g. Q3 Product Launch"
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-lg font-medium text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Source Material</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`relative rounded-xl border-2 border-dashed transition-colors ${
            dragActive ? "border-violet-400 bg-violet-500/10" : "border-white/15 bg-white/[0.02]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
            {parsing ? (
              <Loader2 className="animate-spin text-violet-400" size={28} />
            ) : (
              <UploadCloud className="text-white/40" size={28} />
            )}
            <p className="text-sm text-white/70">
              Drag a file here, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-white/35">.txt, .md, or .pdf</p>
            {project.source.fileName && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/70">
                <FileText size={12} />
                {project.source.fileName}
                <button
                  type="button"
                  onClick={() => onUpdate({ source: { text: project.source.text, fileName: "" } })}
                  className="text-white/40 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {fileError && <p className="text-xs text-red-400">{fileError}</p>}
          </div>
        </div>

        <div className="mt-3">
          <textarea
            value={project.source.text}
            onChange={(e) => onUpdate({ source: { ...project.source, text: e.target.value } })}
            placeholder="...or paste your rough draft, transcript, notes, article, or outline here"
            rows={10}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60 resize-y font-mono leading-relaxed"
          />
          <p className="mt-1 text-xs text-white/35">{wordCount.toLocaleString()} words</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Brand Voice / Tone</label>
          <input
            value={project.meta.brandVoice}
            onChange={(e) => onUpdate({ meta: { ...project.meta, brandVoice: e.target.value } })}
            placeholder="e.g. Bold, confident, a little irreverent"
            list="voice-presets"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60"
          />
          <datalist id="voice-presets">
            {VOICE_PRESETS.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Target Audience</label>
          <input
            value={project.meta.audience}
            onChange={(e) => onUpdate({ meta: { ...project.meta, audience: e.target.value } })}
            placeholder="e.g. Busy small-business owners aged 30-50"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/50">Select Outputs</label>
          <span className="text-xs text-white/40">{project.selectedOutputs.length} selected</span>
        </div>
        <OutputSelector selected={project.selectedOutputs} onChange={(selectedOutputs) => onUpdate({ selectedOutputs })} />
      </div>

      {/* Spacer so the fixed build bar never covers the last field. */}
      <div className="h-16" />

      <div className="fixed bottom-6 left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
        <button
          type="button"
          disabled={buildDisabled}
          onClick={onBuild}
          className="group pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:shadow-violet-700/50 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
        >
          <Sparkles size={18} className="group-disabled:animate-none animate-pulse-glow" />
          Build Content Package
        </button>
      </div>
    </div>
  );
}
