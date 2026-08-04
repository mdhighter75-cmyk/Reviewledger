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
- `src/components/PaywallScreen.jsx` + `src/lib/subscription.js` — the subscription paywall UI and its client (see below).
- `api/stripe/` — serverless functions for Stripe Checkout, session verification, subscription re-checks, and the billing portal.
- `vercel.json` — routing config for deployment on Vercel.

## Local development

```bash
npm install
cp env.example .env.local   # then paste in your Anthropic and Stripe keys
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
3. Before deploying, add these environment variables: **Settings → Environment Variables**
   - `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
   - `STRIPE_SECRET_KEY` = your secret key from [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys
   - `STRIPE_PRICE_ID` = the Price ID (starts with `price_`) of your recurring Empire Content Factory subscription, from Stripe Dashboard → Product catalog
4. In Stripe Dashboard, make sure the [Customer Portal](https://dashboard.stripe.com/settings/billing/portal) is activated (Settings → Billing → Customer portal) — "Manage Subscription" won't work until it is.
5. Deploy.

## Subscription (paywall)

The app sits behind a $49.99/mo Stripe subscription. Flow:

1. First visit shows a landing/paywall screen ("Unlock — $49.99/mo"). Clicking it calls `/api/stripe/create-checkout-session`, which creates a Stripe Checkout Session in subscription mode using `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`, and the browser is redirected to Stripe.
2. On success, Stripe redirects back to the app with `?session_id=...` in the URL. The app calls `/api/stripe/verify-session`, which retrieves that Checkout Session **server-side** and only grants access if the attached subscription's status is `active`.
3. The resulting `{ customerId, subscriptionId, status }` is cached in `localStorage` purely as a convenience, so returning subscribers aren't re-verifying on every click.
4. On every fresh page load, the app re-checks that cached customer's subscription against Stripe via `/api/stripe/check-subscription` before trusting it — so a cancellation or failed payment revokes access automatically on the next visit, not just at signup. (A transient network error while re-checking doesn't immediately lock out a subscriber whose last known status was active; a genuine "not active" response from Stripe does.)
5. **Manage Subscription** in the header sends the user to Stripe's hosted billing portal (`/api/stripe/create-portal-session`) to update payment info or cancel.

This intentionally doesn't use a Stripe webhook — status is re-checked on demand instead of pushed, which keeps setup simpler (no webhook secret/endpoint to configure) at the cost of access changes only being reflected on the subscriber's *next* page load rather than instantly. Good enough for a single-tenant paywall; add a `/api/stripe/webhook` route if you need instant revocation.

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

- No accounts or analytics — subscription gating is per-browser (via the cached Stripe customer ID), not tied to a login system.
- Failures are isolated per content group, so one broken generation doesn't take down the rest of the package.
- The pipeline is modular: to add a new content worker, add an entry to `OUTPUT_GROUPS` in `src/lib/outputFormats.js` and its writing instructions in `api/_lib/prompts.js`.
