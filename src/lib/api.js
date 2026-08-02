// Thin client for the /api/generate serverless function.

async function post(body) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function analyzeSource({ source, meta }) {
  return post({ action: "analyze", source, meta });
}

export function strategizeContent({ source, meta, analysis }) {
  return post({ action: "strategize", source, meta, analysis });
}

export function generateGroup({ group, outputs, source, meta, analysis, strategy }) {
  return post({ action: "group", group, outputs, source, meta, analysis, strategy });
}
