// Claude is the Empire Orchestrator's always-on specialist: it powers every
// text-based role directly, and is the fallback whenever a role's preferred
// tool (e.g. an image or video provider) isn't configured.

export function isAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function complete({ system, prompt, maxTokens = 1200 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock) throw new Error("No text response from model");
  return textBlock.text;
}

export async function completeJSON({ system, prompt, maxTokens = 600 }) {
  const text = await complete({
    system,
    prompt: `${prompt}\n\nRespond with ONLY valid JSON. No markdown code fences, no commentary before or after.`,
    maxTokens,
  });
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  return JSON.parse(cleaned);
}
