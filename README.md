# Reviewledger

Upload a CSV of customer reviews → get an AI-generated report on what
customers love, what's costing you sales, and what to fix first.

## What's in this project

- `src/` — React frontend (Vite + Tailwind)
- `api/analyze.js` — serverless function that calls the Anthropic API (keeps your key secret)
- `api/create-checkout-session.js` — serverless function that creates a Stripe checkout session
- `vercel.json` — routing config for deployment on Vercel

## Step-by-step: getting this live

### 1. Push to GitHub
1. Create a new repository on github.com (e.g. `reviewledger`)
2. From this folder, run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/reviewledger.git
   git push -u origin main
   ```

### 2. Deploy to Vercel
1. Go to vercel.com → sign up with your GitHub account (free)
2. Click "Add New Project" → import your `reviewledger` repo
3. Vercel auto-detects Vite — leave default build settings
4. Before deploying, add environment variables (see below)
5. Click Deploy

### 3. Add your Anthropic API key
1. Go to console.anthropic.com → API Keys → create a new key
2. In Vercel: Project → Settings → Environment Variables
3. Add `ANTHROPIC_API_KEY` = your key
4. Redeploy (Deployments tab → ... → Redeploy)

This is the only step required to make the core tool (review analysis) work.
Stripe (steps 4-5) is only needed once you want to charge for the Pro tier.

### 4. Set up Stripe (when ready to charge)
1. Go to dashboard.stripe.com → sign up
2. Go to Product catalog → create a product, e.g. "Reviewledger Pro", $19/month recurring
3. Copy the Price ID (starts with `price_`)
4. Go to Developers → API keys → copy your Secret key (starts with `sk_live_` or `sk_test_` while testing)
5. In Vercel, add environment variables:
   - `STRIPE_SECRET_KEY` = your secret key
   - `STRIPE_PRICE_ID` = your price ID
6. Redeploy

### 5. Connect your domain
1. Buy a domain (Namecheap, Porkbun, etc.) — about $10-15/year
2. In Vercel: Project → Settings → Domains → add your domain
3. Follow Vercel's instructions to update your domain's DNS records (usually just adding an A record or CNAME at your registrar)
4. Wait a few minutes to a few hours for DNS to propagate

## Local development

```
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

## How the free/paid tiers work

- Free: analyzes up to 50 reviews per upload
- Pro ($19/mo): analyzes up to 500 reviews per upload, set via Stripe checkout
- After a successful Stripe payment, the user is redirected back with `?checkout=success`,
  which sets a `reviewledger_pro` flag in their browser's local storage. This is a simple
  MVP approach — for a more robust system later, you'd track subscriptions server-side
  tied to user accounts.

## Where to find your first users

- Reddit: r/FulfillmentByAmazon, r/EcommerceSellers, r/Etsy, r/shopify
- Facebook groups for Amazon/Etsy/Shopify sellers
- Indie Hackers (indiehackers.com) — share it as a "show & tell" launch post
