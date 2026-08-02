// Vercel serverless function: /api/generate
// Single entry point for every stage of the content pipeline. Keeps the
// Anthropic API key server-side. The frontend calls this once per stage
// (analyze, strategize, or a content group) so a failure in one stage never
// takes down the others.

import { findGroup } from "../src/lib/outputFormats.js";
import { ANALYZER_SYSTEM, STRATEGIST_SYSTEM, GROUP_SYSTEM, GROUP_INSTRUCTIONS } from "./_lib/prompts.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_SOURCE_CHARS = 24000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  const body = req.body || {};
  const { action } = body;

  try {
    if (action === "analyze") return res.status(200).json(await runAnalyze(body, apiKey));
    if (action === "strategize") return res.status(200).json(await runStrategize(body, apiKey));
    if (action === "group") return res.status(200).json(await runGroup(body, apiKey));
    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error("generate error:", err);
    return res.status(502).json({ error: err.message || "Generation failed" });
  }
}

function clampSource(source) {
  const text = String(source || "").trim();
  if (text.length <= MAX_SOURCE_CHARS) return text;
  return text.slice(0, MAX_SOURCE_CHARS) + "\n\n[...source truncated for length...]";
}

function metaBlock(meta = {}) {
  return `PROJECT NAME: ${meta.name || "Untitled"}
BRAND VOICE / TONE: ${meta.brandVoice || "Not specified - use a clear, confident, natural voice"}
TARGET AUDIENCE: ${meta.audience || "Not specified - infer from the source material"}`;
}

// Tool-use JSON schemas describe the shape we *want*, but the API does not
// enforce them - the model can still return a string where an array was
// requested, drop a field, truncate mid-generation, or (rarely) echo
// something resembling its own tool-call syntax as literal text inside a
// field value. These helpers coerce known array/string fields back into the
// shape the rest of the app expects and strip any such leaked syntax, so a
// shape mismatch degrades gracefully instead of crashing or rendering junk.
const LEAKED_TOOL_SYNTAX = /<\/?(?:parameter|invoke|function_calls?|antml:[a-zA-Z_]+)\b[^>]*>/gi;

function stripLeakedToolSyntax(str, stage) {
  if (typeof str !== "string") return str;
  const cleaned = str.replace(LEAKED_TOOL_SYNTAX, "").trim();
  if (cleaned !== str.trim()) {
    console.warn(`[${stage || "generate"}] stripped leaked tool-call syntax from a field. Original (first 300 chars):`, str.slice(0, 300));
  }
  return cleaned;
}

function coerceArray(value, stage) {
  const arr = Array.isArray(value) ? value : value === null || value === undefined || value === "" ? [] : [value];
  return arr.map((item) => (typeof item === "string" ? stripLeakedToolSyntax(item, stage) : item));
}

function coerceString(value, stage) {
  let str;
  if (typeof value === "string") str = value;
  else if (value === null || value === undefined) str = "";
  else if (Array.isArray(value)) str = value.join("\n");
  else str = typeof value === "object" ? JSON.stringify(value) : String(value);
  return stripLeakedToolSyntax(str, stage);
}

async function callAnthropic({ apiKey, system, messages, tool, maxTokens, stage, _isRetry }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Upstream API error (${response.status}): ${errText.slice(0, 500)}`);
  }

  const data = await response.json();
  const toolUse = data.content?.find((b) => b.type === "tool_use" && b.name === tool.name);

  if (!toolUse) {
    console.error(`[${stage}] model did not return structured output (stop_reason: ${data.stop_reason}). Raw content:`, JSON.stringify(data.content).slice(0, 2000));
    throw new Error("Model did not return structured output");
  }

  // A truncated generation is the most common cause of "early fields look
  // fine, later fields are missing" - the model was still mid-JSON when it
  // ran out of budget, so anything after the cut point never got emitted.
  // Retry once with more room before giving up.
  if (data.stop_reason === "max_tokens") {
    console.warn(`[${stage}] response truncated at max_tokens=${maxTokens}. Partial input:`, JSON.stringify(toolUse.input).slice(0, 1000));
    if (!_isRetry) {
      const biggerBudget = Math.min(8192, maxTokens * 2);
      console.warn(`[${stage}] retrying once with max_tokens=${biggerBudget}`);
      return callAnthropic({ apiKey, system, messages, tool, maxTokens: biggerBudget, stage, _isRetry: true });
    }
    throw new Error(`${stage} response was cut off (ran out of generation budget) even after retrying with more room. Try regenerating, or shorten the source material.`);
  }

  // Log the shape actually returned (field name -> type) so a future schema
  // mismatch shows up in Vercel logs instead of just crashing the frontend.
  const shape = Object.fromEntries(Object.entries(toolUse.input || {}).map(([k, v]) => [k, Array.isArray(v) ? `array(${v.length})` : typeof v]));
  console.log(`[${stage}] tool_use shape:`, JSON.stringify(shape));

  return toolUse.input;
}

async function runAnalyze({ source, meta }, apiKey) {
  const tool = {
    name: "emit_analysis",
    description: "Structured extraction of the source material",
    input_schema: {
      type: "object",
      properties: {
        key_ideas: { type: "array", items: { type: "string" }, description: "The main ideas/points in the source" },
        facts: { type: "array", items: { type: "string" }, description: "Concrete facts, figures, names, numbers, dates" },
        offers: { type: "array", items: { type: "string" }, description: "Any products, offers, or CTAs present in the source (empty array if none)" },
        audience_signals: { type: "string", description: "Who this content seems to be for, based on the source" },
        themes: { type: "array", items: { type: "string" }, description: "Recurring themes/topics" },
        important_context: { type: "string", description: "Any other context downstream writers need (constraints, tone cues, notable entities)" },
      },
      required: ["key_ideas", "facts", "offers", "audience_signals", "themes", "important_context"],
    },
  };

  const messages = [
    {
      role: "user",
      content: `${metaBlock(meta)}\n\nSOURCE MATERIAL:\n"""\n${clampSource(source)}\n"""`,
    },
  ];

  const raw = await callAnthropic({ apiKey, system: ANALYZER_SYSTEM, messages, tool, maxTokens: 2000, stage: "analyze" });
  const analysis = {
    key_ideas: coerceArray(raw.key_ideas, "analyze"),
    facts: coerceArray(raw.facts, "analyze"),
    offers: coerceArray(raw.offers, "analyze"),
    audience_signals: coerceString(raw.audience_signals, "analyze"),
    themes: coerceArray(raw.themes, "analyze"),
    important_context: coerceString(raw.important_context, "analyze"),
  };
  return { analysis };
}

async function runStrategize({ source, meta, analysis }, apiKey) {
  const tool = {
    name: "emit_strategy",
    description: "Content strategy and publishing plan",
    input_schema: {
      type: "object",
      properties: {
        angle: { type: "string", description: "The strongest angle/positioning for this content package" },
        hooks: { type: "array", items: { type: "string" }, description: "4-6 hook lines that could open various pieces of content" },
        content_pillars: { type: "array", items: { type: "string" }, description: "3-5 recurring themes to build content around" },
        publishing_strategy: { type: "string", description: "How to sequence and use this content package across channels" },
        content_calendar: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "string" },
              channel: { type: "string" },
              content_idea: { type: "string" },
            },
            required: ["day", "channel", "content_idea"],
          },
          description: "7-10 entries covering roughly one to two weeks - keep each content_idea to one short sentence",
        },
      },
      required: ["angle", "hooks", "content_pillars", "publishing_strategy", "content_calendar"],
    },
  };

  const messages = [
    {
      role: "user",
      content: `${metaBlock(meta)}\n\nSOURCE ANALYSIS (JSON):\n${JSON.stringify(analysis, null, 2)}\n\nSOURCE MATERIAL (for reference):\n"""\n${clampSource(source)}\n"""`,
    },
  ];

  const raw = await callAnthropic({ apiKey, system: STRATEGIST_SYSTEM, messages, tool, maxTokens: 3200, stage: "strategize" });
  const strategy = {
    angle: coerceString(raw.angle, "strategize"),
    hooks: coerceArray(raw.hooks, "strategize"),
    content_pillars: coerceArray(raw.content_pillars, "strategize"),
    publishing_strategy: coerceString(raw.publishing_strategy, "strategize"),
    content_calendar: coerceArray(raw.content_calendar, "strategize").map((row) =>
      row && typeof row === "object"
        ? { day: coerceString(row.day, "strategize"), channel: coerceString(row.channel, "strategize"), content_idea: coerceString(row.content_idea, "strategize") }
        : { day: "", channel: "", content_idea: coerceString(row, "strategize") }
    ),
  };
  return { strategy };
}

async function runGroup({ group: groupId, outputs, source, meta, analysis, strategy }, apiKey) {
  const group = findGroup(groupId);
  if (!group) throw new Error(`Unknown content group: ${groupId}`);

  const requestedIds = (outputs || []).filter((id) => group.outputs.some((o) => o.id === id));
  if (requestedIds.length === 0) throw new Error("No valid outputs requested for this group");

  const properties = {};
  for (const id of requestedIds) {
    const def = group.outputs.find((o) => o.id === id);
    properties[id] = { type: "string", description: `Full markdown content for: ${def.label}` };
  }

  const tool = {
    name: "emit_content",
    description: `Finished content assets for the ${group.label} group`,
    input_schema: { type: "object", properties, required: requestedIds },
  };

  const instructions = GROUP_INSTRUCTIONS[groupId] || "";
  const system = GROUP_SYSTEM(group.agent, instructions);

  const messages = [
    {
      role: "user",
      content: `${metaBlock(meta)}\n\nSOURCE ANALYSIS (JSON):\n${JSON.stringify(analysis, null, 2)}\n\nCONTENT STRATEGY (JSON):\n${JSON.stringify(strategy, null, 2)}\n\nSOURCE MATERIAL (for reference/direct quotes if useful):\n"""\n${clampSource(source)}\n"""\n\nGenerate exactly these assets: ${requestedIds.join(", ")}`,
    },
  ];

  const maxTokens = Math.min(8000, 1200 * requestedIds.length + 800);
  const raw = await callAnthropic({ apiKey, system, messages, tool, maxTokens, stage: `group:${groupId}` });
  const assets = Object.fromEntries(requestedIds.map((id) => [id, coerceString(raw[id], `group:${groupId}`)]));
  return { assets };
}
