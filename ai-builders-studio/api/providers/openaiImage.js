// Optional branding/image provider. If OPENAI_API_KEY isn't set, the
// Branding role in api/orchestrate.js falls back to a Claude-written design
// brief instead — the mission continues either way.

export function isAvailable() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateLogo({ prompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI image API error: ${errText}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned");
  return b64;
}
