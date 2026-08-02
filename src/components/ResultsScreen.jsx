import { useState, useMemo } from "react";
import { PackageCheck, Settings2 } from "lucide-react";
import { OUTPUT_GROUPS, STRATEGY_OUTPUTS } from "../lib/outputFormats.js";
import AssetCard from "./AssetCard.jsx";

export default function ResultsScreen({ project, onSaveAsset, onRegenerate, onDownloadAsset, onDownloadAll, onEditSettings }) {
  const tabs = useMemo(() => {
    const strategyTab = { id: "strategy", label: "Strategy", outputs: STRATEGY_OUTPUTS };
    const groupTabs = OUTPUT_GROUPS.filter((g) => g.outputs.some((o) => project.selectedOutputs.includes(o.id))).map((g) => ({
      id: g.id,
      label: g.label,
      outputs: g.outputs.filter((o) => project.selectedOutputs.includes(o.id)),
    }));
    return [strategyTab, ...groupTabs];
  }, [project.selectedOutputs]);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "strategy");
  const active = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">{project.name}</h2>
          <p className="text-sm text-white/40 mt-0.5">
            {project.meta.audience ? `For ${project.meta.audience}` : "Your content package is ready"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEditSettings}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:border-white/30 transition-colors"
          >
            <Settings2 size={15} /> Edit &amp; Rebuild
          </button>
          <button
            onClick={onDownloadAll}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:-translate-y-0.5 transition-transform"
          >
            <PackageCheck size={16} /> Download All (ZIP)
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "bg-white text-black" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {active?.outputs.map((o) => {
          const asset = project.assets[o.id];
          return (
            <AssetCard
              key={o.id}
              label={o.label}
              outputId={o.id}
              asset={asset}
              error={project.stageErrors?.[o.id]}
              onSave={(content) => onSaveAsset(o.id, content)}
              onRegenerate={() => onRegenerate(o.id)}
              onDownload={() => onDownloadAsset(o.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
