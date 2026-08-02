# Empire Content Factory

Upload one source file — a rough draft, transcript, raw notes, article, product
description, or topic outline — and get a complete multi-channel content
package back: blog post, social posts, short-form video scripts, a full
YouTube script, email copy, ad copy, SEO metadata, and image-generation
prompts, all grounded in what you actually gave it.

One machine, one build button, one ZIP at the end.

## How it works

```
UPLOAD → CHOOSE OUTPUTS → BUILD → REVIEW → DOWNLOAD PACKAGE
```

Under the hood, the "BUILD CONTENT PACKAGE" button runs a pipeline of
specialized AI stages, each with a narrow job:

1. **Source Analyzer** — extracts key ideas, facts, offers, audience signals, and themes from your source material.
2. **Content Strategist** — decides the strongest angle and the hooks that will grab attention across formats.
3. **Long-Form Writer** — blog/article, newsletter, product description, landing-page copy.
4. **Social Media Creator** — Facebook, Instagram, LinkedIn, X/Twitter posts, hashtags.
5. **Short-Form Video Writer** — TikTok, Reels, and YouTube Shorts hooks/scripts.
6. **YouTube Writer** — full video script (with chapters + title ideas) and description.
7. **Email Creator** — newsletter-style campaign + follow-up sequence, and a sales email.
8. **Ad Copy Creator** — multiple ad angles with headlines, primary text, and CTAs.
9. **SEO Packager** — SEO title, meta description, slug, keywords, tags, FAQs.
10. **Creative Director** — image prompts and thumbnail prompts for AI image tools.

Stages 3–10 only run for the output formats you actually selected, and each
group runs independently — if one stage fails, the rest of your package still
finishes. You can regenerate any single asset later without rebuilding
anything else.

Every stage is instructed to work only from the facts in your source material
and the extracted analysis — it's not supposed to invent names, numbers, or
claims that aren't there.

## What's in this project

- `src/` — React frontend (Vite + Tailwind), a dark single-page app with three screens: Dashboard, Processing, Results.
- `src/lib/outputFormats.js` — the shared registry of every content format, its group/agent, and export folder. Shared by the frontend and the API.
- `src/lib/pipeline.js` — client-side orchestration: calls the API stage by stage, reports progress, supports single-asset regeneration.
- `src/lib/storage.js` — project persistence (currently `localStorage`; see below for upgrading it).
- `src/lib/zipExport.js` — builds the downloadable ZIP with correctly named folders.
- `api/generate.js` — the one serverless function that talks to the Anthropic API. Keeps your API key server-side.
- `api/_lib/prompts.js` — system prompts / per-stage writing instructions.
- `vercel.json` — routing config for deployment on Vercel.

## Local development

```bash
npm install
cp env.example .env.local   # then paste in your Anthropic key
npm run dev
```

This project uses [Vercel's local dev server](https://vercel.com/docs/cli) to
run the `api/` serverless function alongside the frontend, so `vercel dev` is
the easiest way to run everything together:

```bash
npm install -g vercel
vercel dev
```

(Plain `npm run dev` also works for frontend-only work, but `/api/generate`
calls will fail unless something is serving that route — `vercel dev` handles
both.)

## Deploying to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo. Vercel auto-detects Vite.
3. Before deploying, add an environment variable: **Settings → Environment Variables**
   - `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
4. Deploy.

That's the only environment variable required.

## Project memory

Projects (source text, uploaded file name, selected outputs, brand voice,
audience, generated assets, edits, and per-stage status) are saved to the
browser's `localStorage` as you work, so closing the tab and coming back
reloads exactly where you left off. Use the project switcher in the header to
create new projects or jump between existing ones.

This is intentionally a thin storage layer (`src/lib/storage.js`) with a small,
explicit interface — `listProjects`, `getProject`, `saveProject`,
`deleteProject`, `createProject`. To upgrade to a real database later, swap
the implementation behind that same interface (e.g. call a new `/api/projects`
route backed by Postgres/SQLite) — nothing in the UI needs to change.

## Exporting your content

- **Download** on any individual asset saves that one file (`.md`/`.txt`).
- **Download All (ZIP)** on the Results screen bundles everything into folders:

```
project-name/
  source/            original source text
  strategy/          source analysis, content strategy (angle + hooks)
  long-form/         blog, newsletter, product description, landing page
  social/            Facebook, Instagram, LinkedIn, X, hashtags
  video/              TikTok/Reels/Shorts scripts + full YouTube script/description
  email/             email campaign, sales email
  ads/               ad copy
  seo/               SEO metadata
  creative/          image prompts, thumbnail prompts
  project.json       full structured export of everything above
```

## Notes on this build

- No billing, accounts, or analytics — this is the core content engine only.
- Failures are isolated per content group, so one broken generation doesn't take down the rest of the package.
- The pipeline is modular: to add a new content worker, add an entry to `OUTPUT_GROUPS` in `src/lib/outputFormats.js` and its writing instructions in `api/_lib/prompts.js`.
