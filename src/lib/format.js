// Markdown formatters for the internal strategy-stage assets
// (source analysis / content strategy / content calendar), shared between
// the pipeline (to populate the Results screen) and the ZIP exporter.
//
// The model is asked for array fields via the tool schema, but tool-use
// schemas are a guide, not an enforced contract - a field can still come
// back as a string, null, or missing. Every array field is coerced defensively
// so a shape mismatch degrades to "show what we got" instead of crashing.

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

export function analysisMarkdown(analysis) {
  if (!analysis) return "_Not generated._";
  return [
    "## Key Ideas",
    ...toArray(analysis.key_ideas).map((i) => `- ${i}`),
    "\n## Facts",
    ...toArray(analysis.facts).map((i) => `- ${i}`),
    "\n## Offers",
    ...toArray(analysis.offers).map((i) => `- ${i}`),
    "\n## Audience Signals",
    analysis.audience_signals || "",
    "\n## Themes",
    ...toArray(analysis.themes).map((i) => `- ${i}`),
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
    ...toArray(strategy.hooks).map((i) => `- ${i}`),
    "\n## Content Pillars",
    ...toArray(strategy.content_pillars).map((i) => `- ${i}`),
    "\n## Publishing Strategy",
    strategy.publishing_strategy || "",
  ].join("\n");
}

export function calendarMarkdown(calendar) {
  const rows = toArray(calendar);
  if (rows.length === 0) return "_No calendar generated._";
  const lines = rows
    .map((row) => {
      if (row && typeof row === "object") return `| ${row.day || ""} | ${row.channel || ""} | ${row.content_idea || ""} |`;
      return `| | | ${row} |`;
    })
    .join("\n");
  return `| Day | Channel | Content Idea |\n| --- | --- | --- |\n${lines}`;
}
