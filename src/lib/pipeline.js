import { groupForOutputs, findOutput } from "./outputFormats.js";
import { analyzeSource, strategizeContent, generateGroup } from "./api.js";
import { analysisMarkdown, strategyMarkdown } from "./format.js";

export const CORE_STAGES = [
  { id: "analyze", label: "Source Analyzer", desc: "Reading your material and extracting key ideas, facts, and context." },
  { id: "strategize", label: "Content Strategist", desc: "Determining the strongest angle and hooks." },
];

export function buildStageList(selectedOutputs) {
  const groups = groupForOutputs(selectedOutputs);
  return [
    ...CORE_STAGES,
    ...groups.map((g) => ({
      id: g.id,
      label: g.agent,
      desc: `Creating ${g.label.toLowerCase()} content.`,
      group: g,
    })),
  ];
}

/**
 * Runs the full pipeline for a project: analyze -> strategize -> content groups
 * (in parallel). Callbacks fire as each stage starts/finishes so the caller can
 * update UI + persist incrementally. A failure in one content group does not
 * stop the others.
 */
export async function runPipeline(project, callbacks = {}) {
  const { onStageStart, onStageUpdate } = callbacks;
  const source = project.source.text;
  const meta = project.meta;

  onStageStart?.("analyze");
  let analysis;
  try {
    const r = await analyzeSource({ source, meta });
    analysis = r.analysis;
    onStageUpdate?.("analyze", {
      status: "done",
      analysis,
      assets: { source_analysis: { content: analysisMarkdown(analysis), updatedAt: Date.now(), edited: false } },
    });
  } catch (err) {
    onStageUpdate?.("analyze", { status: "error", error: err.message });
    return; // nothing downstream can run without analysis
  }

  onStageStart?.("strategize");
  let strategy;
  try {
    const r = await strategizeContent({ source, meta, analysis });
    strategy = r.strategy;
    onStageUpdate?.("strategize", {
      status: "done",
      strategy,
      assets: {
        content_strategy: { content: strategyMarkdown(strategy), updatedAt: Date.now(), edited: false },
      },
    });
  } catch (err) {
    onStageUpdate?.("strategize", { status: "error", error: err.message });
    return; // groups need strategy context too
  }

  const groups = groupForOutputs(project.selectedOutputs);
  await Promise.allSettled(
    groups.map(async (group) => {
      const outputs = group.outputs.map((o) => o.id).filter((id) => project.selectedOutputs.includes(id));
      onStageStart?.(group.id);
      try {
        const r = await generateGroup({ group: group.id, outputs, source, meta, analysis, strategy });
        const assets = {};
        for (const [id, content] of Object.entries(r.assets)) {
          assets[id] = { content, updatedAt: Date.now(), edited: false };
        }
        onStageUpdate?.(group.id, { status: "done", assets });
      } catch (err) {
        onStageUpdate?.(group.id, { status: "error", error: err.message });
      }
    })
  );
}

/**
 * Regenerate a single output without touching the rest of the project.
 * Returns { content, analysis?, strategy? } - analysis/strategy are only
 * present when regenerating a strategy-stage asset, so the caller can decide
 * whether to refresh the project's stored context too.
 */
export async function regenerateOutput(project, outputId) {
  const { source, meta, analysis, strategy } = project;

  if (outputId === "source_analysis") {
    const r = await analyzeSource({ source: source.text, meta });
    return { content: analysisMarkdown(r.analysis), analysis: r.analysis };
  }

  if (outputId === "content_strategy") {
    const r = await strategizeContent({ source: source.text, meta, analysis });
    return { content: strategyMarkdown(r.strategy), strategy: r.strategy };
  }

  const def = findOutput(outputId);
  if (!def) throw new Error(`Unknown output: ${outputId}`);
  const r = await generateGroup({
    group: def.group.id,
    outputs: [outputId],
    source: source.text,
    meta,
    analysis,
    strategy,
  });
  return { content: r.assets[outputId] };
}
