# AI Builders Studio — Empire Orchestrator

Give the Orchestrator one idea. It breaks the mission into specialist tasks,
runs each specialist, checks the results for consistency, and hands you back
one package: a book outline, website copy, a branding brief (or an actual
logo image, if configured), a marketing pack, a video ad script, and a
launch strategy.

This is a separate app from Reviewledger — its own frontend, its own
serverless API, deployed independently.

## How it works

1. You type one mission, e.g. "Build me a dog training business."
2. `POST /api/orchestrate` runs a **planning** pass (Claude, acting as
   project manager) that turns the mission into a short task list tailored
   to it.
3. The specialist tasks run — in parallel, since they don't depend on each
   other — each with its own role-specific system prompt:
   - 📖 **Book** — ebook outline + opening chapter
   - 🌐 **Website** — homepage copy and section structure
   - 🎨 **Branding** — logo/visual identity
   - 📣 **Marketing** — launch emails + social posts
   - 🎬 **Video** — a short ad script/storyboard
   - 🚀 **Launch strategy** — first-30-days plan
4. A final **QC** pass (Claude again) checks the pieces share one consistent
   name/tone/tagline before they're handed back.
5. The frontend renders everything as folders and lets you download the
   whole package as one Markdown file (plus a PNG if a logo image was
   generated).

## Tool detection & fallback

Every specialist role is powered by Claude (`ANTHROPIC_API_KEY`) by
default — that's the always-available fallback the spec calls for. Image
generation is the one role with a real alternate provider wired up: if
`OPENAI_API_KEY` is set, Branding calls OpenAI's image API for an actual
logo; if it isn't, Branding falls back to Claude producing a detailed
text design brief instead. The mission never stops for a missing key — it
degrades to the next capable tool.

`api/providers/` is where new specialist providers get added (a real Grok
image endpoint, a video-generation API, etc.) — each provider is a small
module with an `isAvailable()` check and a `run()` call, and
`api/orchestrate.js` picks whichever is available for a given role.

## Local development

```
npm install
cp env.example .env.local   # then fill in ANTHROPIC_API_KEY (required)
npm run dev
```

## Deploying

Same flow as Reviewledger: push this folder to its own Vercel project (or
add it as a second project pointed at this subdirectory), set
`ANTHROPIC_API_KEY` (and optionally `OPENAI_API_KEY`) in the project's
environment variables, deploy.
