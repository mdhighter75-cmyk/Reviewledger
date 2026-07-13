// Vercel serverless function: /api/orchestrate
//
// Implements the Empire Orchestrator workflow end to end for one mission:
//   1. Plan  — turn the mission into a shared creative brief (Chat/PM role).
//   2. Work  — run every specialist in parallel against that shared brief,
//              so results share one name/tone/tagline instead of drifting.
//   3. QC    — review the finished sections for consistency (Chat again).
//
// Every text role runs on Claude. Branding is the one role with a real
// alternate provider: it uses OpenAI's image API when OPENAI_API_KEY is
// configured, and falls back to a Claude-written design brief otherwise.
// A failed specialist doesn't fail the mission — its section is marked
// "failed" and every other section still comes back.

import { isAvailable as anthropicAvailable, complete, completeJSON } from "./providers/anthropic.js";
import { isAvailable as openaiImageAvailable, generateLogo } from "./providers/openaiImage.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { mission } = req.body || {};
  if (!mission || typeof mission !== "string" || !mission.trim()) {
    return res.status(400).json({ error: "Missing mission" });
  }

  if (!anthropicAvailable()) {
    return res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY — the Orchestrator has no specialists available.",
    });
  }

  try {
    const brief = await completeJSON({
      system:
        "You are Chat, the Empire Orchestrator's project manager. You turn one raw business idea into a tight creative brief that every specialist AI on the team will build from, so their output stays consistent.",
      prompt: `Mission: "${mission.trim()}"\n\nReturn a JSON object with exactly these keys:\n{\n  "name": "a short, memorable business/product name",\n  "tagline": "one sentence tagline",\n  "audience": "who this is for, one sentence",\n  "tone": "3-5 words describing voice/tone",\n  "value_props": ["3 to 4 short bullet points on why this wins"]\n}`,
      maxTokens: 500,
    });

    const briefText = `Business name: ${brief.name}\nTagline: ${brief.tagline}\nAudience: ${brief.audience}\nTone: ${brief.tone}\nValue props: ${(brief.value_props || []).join("; ")}`;

    const specialistTasks = [
      {
        id: "book",
        label: "📖 Book",
        specialist: "Claude — long-form writing",
        run: () =>
          complete({
            system:
              "You are Claude, the Empire Orchestrator's long-form writing specialist. Write tight, useful, non-fluffy copy.",
            prompt: `Creative brief:\n${briefText}\n\nWrite: (1) a 6-8 chapter ebook outline for a short lead-magnet ebook that supports this business, one line per chapter, and (2) a complete opening chapter (300-500 words) in the brand's tone. Format as Markdown with "## Outline" and "## Chapter 1" headings.`,
            maxTokens: 1500,
          }),
      },
      {
        id: "website",
        label: "🌐 Website",
        specialist: "Neo — programming/websites",
        run: () =>
          complete({
            system:
              "You are Neo, the Empire Orchestrator's website specialist. Produce homepage copy plus the section structure a developer would build it from.",
            prompt: `Creative brief:\n${briefText}\n\nWrite complete homepage copy: hero headline + subheadline + CTA button text, 3 feature/benefit sections (heading + 2 sentences each), and an FAQ with 4 Q&As. Then list the page's section structure as a short outline a developer could turn straight into components. Format as Markdown.`,
            maxTokens: 1200,
          }),
      },
      {
        id: "marketing",
        label: "📣 Marketing",
        specialist: "Chat — marketing",
        run: () =>
          complete({
            system: "You are the Empire Orchestrator's marketing specialist. Write copy that sounds like a person, not a brand.",
            prompt: `Creative brief:\n${briefText}\n\nWrite: (1) a 3-email launch sequence (subject + body for each), and (2) 5 social posts (mix of X/Instagram/LinkedIn style) announcing the launch. Format as Markdown.`,
            maxTokens: 1200,
          }),
      },
      {
        id: "video",
        label: "🎬 Video",
        specialist: "Video AI — ads/shorts",
        run: () =>
          complete({
            system: "You are the Empire Orchestrator's video specialist. Write a shootable script/storyboard, not vague direction.",
            prompt: `Creative brief:\n${briefText}\n\nWrite a 30-second video ad script as a shot-by-shot storyboard: for each shot give the visual, the on-screen text (if any), and the voiceover line. 6-8 shots total, ending on a clear CTA. Format as a Markdown table with columns Shot | Visual | On-screen text | Voiceover.`,
            maxTokens: 900,
          }),
      },
      {
        id: "launch",
        label: "🚀 Launch strategy",
        specialist: "Chat — planning",
        run: () =>
          complete({
            system: "You are Chat, the Empire Orchestrator's planner. Give a concrete, dated plan, not generic advice.",
            prompt: `Creative brief:\n${briefText}\n\nWrite a first-30-days launch plan broken into Week 1-4, 3-5 concrete action items per week (name real channels/communities where relevant). Format as Markdown.`,
            maxTokens: 900,
          }),
      },
    ];

    const brandingTask = openaiImageAvailable()
      ? {
          id: "branding",
          label: "🎨 Branding",
          specialist: "Grok — images/branding",
          run: async () => {
            const imagePrompt = `Minimal, modern logo mark for "${brief.name}" — ${brief.tagline}. Tone: ${brief.tone}. Flat vector style, simple shape, transparent-friendly, no text unless it's the brand name.`;
            const imageBase64 = await generateLogo({ prompt: imagePrompt });
            return { type: "image", imagePrompt, imageBase64 };
          },
        }
      : {
          id: "branding",
          label: "🎨 Branding",
          specialist: "Grok — images/branding (no image provider configured, Claude filled in)",
          run: async () => {
            const text = await complete({
              system:
                "You are standing in for the Empire Orchestrator's branding/visual specialist. No image generator is configured, so produce a brief detailed enough that any designer or image AI could execute it exactly.",
              prompt: `Creative brief:\n${briefText}\n\nWrite a branding brief: logo concept (shape/symbol, why it fits), color palette (3-4 hex codes with names), font pairing (headline + body), and a one-paragraph mood description. Format as Markdown.`,
              maxTokens: 700,
            });
            return { type: "text", text };
          },
        };

    const allTasks = [...specialistTasks, brandingTask];
    const settled = await Promise.allSettled(allTasks.map((t) => t.run()));

    const sections = allTasks.map((task, i) => {
      const result = settled[i];
      if (result.status === "fulfilled") {
        const value = result.value;
        const payload = typeof value === "string" ? { type: "text", text: value } : value;
        return { id: task.id, label: task.label, specialist: task.specialist, status: "done", ...payload };
      }
      return {
        id: task.id,
        label: task.label,
        specialist: task.specialist,
        status: "failed",
        error: String(result.reason?.message || result.reason),
      };
    });

    const doneSections = sections.filter((s) => s.status === "done");
    const qcInput = doneSections
      .map((s) => `### ${s.label}\n${s.type === "image" ? `[image generated: ${s.imagePrompt}]` : (s.text || "").slice(0, 400)}`)
      .join("\n\n");

    let qc;
    try {
      qc = await complete({
        system: "You are Chat, the Empire Orchestrator's quality control and final approval step. Be brief and specific.",
        prompt: `Creative brief:\n${briefText}\n\nHere is what each specialist produced (truncated):\n\n${qcInput}\n\nIn under 120 words: confirm whether the name/tagline/tone are used consistently across sections, flag anything that clashes, and give a one-line final verdict (Approved / Approved with notes / Needs rework).`,
        maxTokens: 250,
      });
    } catch (err) {
      qc = `QC step failed: ${String(err.message || err)}`;
    }

    return res.status(200).json({ mission: mission.trim(), brief, sections, qc });
  } catch (err) {
    return res.status(500).json({ error: "Internal error", detail: String(err.message || err) });
  }
}
