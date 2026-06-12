// Vercel serverless function: /api/analyze
// Keeps the Anthropic API key on the server side.
// Requires env var ANTHROPIC_API_KEY set in your Vercel project settings.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Upstream API error", detail: errText });
    }

    const data = await response.json();
    const textBlock = data.content?.find((b) => b.type === "text");
    if (!textBlock) {
      return res.status(502).json({ error: "No text response from model" });
    }

    return res.status(200).json({ text: textBlock.text });
  } catch (err) {
    return res.status(500).json({ error: "Internal error", detail: String(err) });
  }
}
