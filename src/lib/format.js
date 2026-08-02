// Markdown formatters for the internal strategy-stage assets
// (source analysis / content strategy / content calendar), shared between
// the pipeline (to populate the Results screen) and the ZIP exporter.

export function analysisMarkdown(analysis) {
  if (!analysis) return "_Not generated._";
  return [
    "## Key Ideas",
    ...(analysis.key_ideas || []).map((i) => `- ${i}`),
    "\n## Facts",
    ...(analysis.facts || []).map((i) => `- ${i}`),
    "\n## Offers",
    ...(analysis.offers || []).map((i) => `- ${i}`),
    "\n## Audience Signals",
    analysis.audience_signals || "",
    "\n## Themes",
    ...(analysis.themes || []).map((i) => `- ${i}`),
    "\n## Important Context",
    analysis.important_context || "",
  ].join("\n");
}

export function strategyMarkdown(strategy) {
  if (!strategy) return "_Not generated._";
  return [
    "## Angle",
    strategy.angle || "",
    "\n## Hooks",
    ...(strategy.hooks || []).map((i) => `- ${i}`),
    "\n## Content Pillars",
    ...(strategy.content_pillars || []).map((i) => `- ${i}`),
    "\n## Publishing Strategy",
    strategy.publishing_strategy || "",
  ].join("\n");
}

export function calendarMarkdown(calendar) {
  if (!Array.isArray(calendar) || calendar.length === 0) return "_No calendar generated._";
  const rows = calendar.map((row) => `| ${row.day} | ${row.channel} | ${row.content_idea} |`).join("\n");
  return `| Day | Channel | Content Idea |\n| --- | --- | --- |\n${rows}`;
}
