import { useState } from "react";
import { Copy, Check, RefreshCw, Download, Pencil, Save, AlertTriangle, Loader2 } from "lucide-react";

export default function AssetCard({ label, outputId, asset, error, onSave, onRegenerate, onDownload }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(asset?.content || "");
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  function startEdit() {
    setDraft(asset?.content || "");
    setEditing(true);
  }

  function save() {
    onSave(draft);
    setEditing(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(asset?.content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">{label}</h3>
          {asset?.edited && <span className="text-[10px] uppercase tracking-wide text-violet-300/80 bg-violet-500/10 px-1.5 py-0.5 rounded">Edited</span>}
        </div>
        <div className="flex items-center gap-1">
          {asset?.content && !editing && (
            <button onClick={copy} title="Copy" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>
          )}
          {!editing && asset?.content && (
            <button onClick={startEdit} title="Edit" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <Pencil size={15} />
            </button>
          )}
          {editing && (
            <button onClick={save} title="Save" className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <Save size={15} />
            </button>
          )}
          <button
            onClick={regenerate}
            disabled={regenerating}
            title="Regenerate"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            {regenerating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          </button>
          {asset?.content && (
            <button onClick={onDownload} title="Download" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <Download size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="p-4">
        {regenerating ? (
          <div className="flex items-center gap-2 text-sm text-white/40 py-6 justify-center">
            <Loader2 size={16} className="animate-spin" /> Regenerating...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-sm text-red-400 py-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.min(24, Math.max(6, draft.split("\n").length + 1))}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/60 resize-y"
          />
        ) : asset?.content ? (
          <pre className="whitespace-pre-wrap break-words text-sm text-white/80 leading-relaxed font-sans">{asset.content}</pre>
        ) : (
          <p className="text-sm text-white/30 italic py-2">Not generated yet.</p>
        )}
      </div>
    </div>
  );
}
