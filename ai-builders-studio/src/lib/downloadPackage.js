function briefToMarkdown(brief) {
  const props = (brief.value_props || []).map((p) => `- ${p}`).join("\n");
  return `# ${brief.name}\n\n**Tagline:** ${brief.tagline}\n\n**Audience:** ${brief.audience}\n\n**Tone:** ${brief.tone}\n\n**Why it wins:**\n${props}\n`;
}

export function packageToMarkdown({ mission, brief, sections, qc }) {
  const parts = [
    `# Empire Orchestrator Package`,
    `_Mission: "${mission}"_`,
    briefToMarkdown(brief),
    `## Quality Control\n\n${qc || "—"}`,
  ];

  for (const section of sections) {
    parts.push(`## ${section.label}\n_${section.specialist}_`);
    if (section.status === "failed") {
      parts.push(`_This specialist couldn't finish: ${section.error}_`);
    } else if (section.type === "image") {
      parts.push(`_Logo image generated — see the downloaded PNG in this package._\n\nImage prompt used: ${section.imagePrompt}`);
    } else {
      parts.push(section.text || "");
    }
  }

  return parts.join("\n\n");
}

export function downloadTextFile(filename, contents) {
  const blob = new Blob([contents], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadBase64Image(filename, base64) {
  const a = document.createElement("a");
  a.href = `data:image/png;base64,${base64}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function slugify(text) {
  return (text || "package")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "package";
}
