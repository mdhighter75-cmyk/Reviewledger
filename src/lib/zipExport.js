import JSZip from "jszip";
import { findOutput, STRATEGY_OUTPUTS } from "./outputFormats.js";
import { analysisMarkdown, strategyMarkdown, calendarMarkdown } from "./format.js";

function slugify(name) {
  return (
    (name || "project")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project"
  );
}

export async function buildProjectZip(project) {
  const zip = new JSZip();
  const root = zip.folder(slugify(project.name));

  root.folder("source").file(project.source.fileName || "source.txt", project.source.text || "");

  const strategyFolder = root.folder("strategy");
  strategyFolder.file("source-analysis.md", analysisMarkdown(project.analysis));
  strategyFolder.file("content-strategy.md", strategyMarkdown(project.strategy));
  strategyFolder.file("content-calendar.md", calendarMarkdown(project.strategy?.content_calendar));

  for (const [outputId, asset] of Object.entries(project.assets || {})) {
    if (!asset || !asset.content) continue;
    if (STRATEGY_OUTPUTS.some((o) => o.id === outputId)) continue; // already handled above
    const def = findOutput(outputId);
    if (!def) continue;
    const folder = root.folder(def.group.folder);
    folder.file(`${outputId}.${def.ext || "md"}`, asset.content);
  }

  root.file(
    "project.json",
    JSON.stringify(
      {
        name: project.name,
        brandVoice: project.meta.brandVoice,
        audience: project.meta.audience,
        selectedOutputs: project.selectedOutputs,
        analysis: project.analysis,
        strategy: project.strategy,
        assets: project.assets,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      null,
      2
    )
  );

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${slugify(project.name)}.zip`);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadAsset(outputId, content) {
  const def = findOutput(outputId);
  const ext = def?.ext || "txt";
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${outputId}.${ext}`);
}
