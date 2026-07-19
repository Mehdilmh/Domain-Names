# DomainPulse

**AI-powered domain valuation SaaS.** Enter a domain (or bulk-upload a CSV) and get an
estimated Buy-It-Now price range, a confidence score, an estimated time-to-sell, comparable
sales, and a plain-English explanation — backed by transparent comps, never a bare number.

> **Rename the whole product** by changing a single constant: `APP_NAME` in
> [`src/config/app.ts`](src/config/app.ts). It flows through the UI, metadata, emails, and API docs.

---

## Quick start

The app runs with **zero third-party API keys**. Everything external falls back to mocks.

```bash
npm install
cp .env.example .env          # set DATABASE_URL (Postgres); everything else is optional
npx prisma migrate dev        # create the schema
npm run seed                  # generate ~3,000 realistic historical sales
npm run dev                   # http://localhost:3000
```

That's it. Sign in from `/login` using the **dev sign-in** (any email, no password, only
enabled outside production) and you'll get 25 free credits.

### Requirements

- Node 20+
- PostgreSQL (a local instance is enough; set `DATABASE_URL` accordingly)

---

## What works without keys

| Concern             | With keys                          | Without keys (default)                        |
| ------------------- | ---------------------------------- | --------------------------------------------- |
| Cache & rate limit  | Redis (`REDIS_URL`)                | In-memory fallback                            |
| Bulk jobs           | BullMQ worker (`npm run worker`)   | Processed in-process (fire-and-forget)        |
| Auth                | Google OAuth / email magic links   | Dev credentials sign-in (email only)          |
| Billing             | Stripe subscriptions + credit packs| Demo mode — checkout simulated, credits granted|
| Explanation layer   | Anthropic (`ANTHROPIC_API_KEY`)    | Deterministic local explanation               |
| Keyword / WHOIS / trademark | real providers (implement the interface) | Deterministic mock providers        |

All external providers live behind interfaces in [`src/lib/providers/`](src/lib/providers/) with
mock implementations, so swapping in a real provider means implementing one interface.

---

## Features

- **Single appraisal** — hero search bar returning price range (low/mid/high), confidence,
  months-to-sell, liquidity, a feature breakdown, and 5–10 comparable sales with date/price/similarity.
- **Bulk appraisal** — CSV upload up to 5,000 rows, queued job, progress bar via polling,
  downloadable CSV result.
- **Portfolio** — save domains, track renewal dates, total value, renewal-cost-vs-value, and a
  sortable **keep / drop** recommendation column.
- **Renewal alerts** — daily cron (`/api/cron/renewals`) flags domains expiring within 30 days and
  emails a digest.
- **Comps transparency** — every estimate shows the sales that drove it. Never a bare number.
- **Trademark risk flag** — `checkTrademark(domain)` service with a clean interface and mock data.
- **Public API** — `POST /api/v1/appraise` with API keys, per-key rate limits, and an OpenAPI spec
  at `/api/openapi` (docs at `/docs/api`).
- **Accuracy page** — public backtest chart (`/accuracy`): predicted vs actual on the seeded dataset.
- **Programmatic SEO** — `/appraisal/[domain]` pages with generated metadata, JSON-LD, and a free
  limited preview that paywalls the full report.

---

## The valuation engine

Swappable module in [`src/lib/valuation/`](src/lib/valuation/):

- **`features.ts`** — extracts length, TLD, hyphens, digits, dictionary-word detection, syllable
  count, pronounceability, category classification, keyword volume (mock provider), and age.
- **`model.ts`** — heuristic baseline scoring in **log-price space** (naturally right-skewed),
  exposing the stable contract `predict(features) → { low, mid, high, confidence, ... }`.
  Marked `TODO: replace with a trained GBM` — swap the internals, keep the interface.
- **`comps.ts`** — cosine similarity over feature vectors against the seeded `Sale` table.
- **`explain.ts`** — Claude call turning features + comps into one paragraph, **cached by domain
  hash** (deterministic fallback when no key).
- **`index.ts`** — the `appraise()` orchestrator: `cache → in-flight dedupe → features → model →
  comps → trademark → explain`. Appraisals are cached **30 days**; identical concurrent requests
  are **de-duplicated**.

### Non-negotiables honored

- Every appraisal response includes a **disclaimer** (estimates are opinions, not financial advice).
- Credits are deducted **inside a transaction** with an immutable ledger — never optimistically
  (see [`src/lib/credits.ts`](src/lib/credits.ts)).
- **Zod validation** on every input (see [`src/schemas/`](src/schemas/)).

---

## Data & seeding

`npm run seed` ([`prisma/seed.ts`](prisma/seed.ts)) generates ~3,000 realistic historical sales:
varied TLDs (weighted toward `.com`), a **log-normal / power-law** price distribution (not uniform),
and sale dates spanning the last 4 years. Each row caches its feature vector for fast comps.

---

## Design system

Dark-first, emerald/amber — deliberately **not** the typical blue/indigo SaaS palette.

| Token          | Value      |
| -------------- | ---------- |
| Background     | `#0B0F0E`  |
| Surface        | `#131A18`  |
| Border         | `#1F2C28`  |
| Primary accent | `#14B87A` (emerald) |
| Secondary      | `#E8B44A` (amber)   |
| Danger         | `#E05252`  |
| Text primary   | `#ECF2F0`  |
| Text muted     | `#8A9C96`  |

Fonts: **Space Grotesk** (headings), **Inter** (body), **JetBrains Mono** (domains & prices,
always `tabular-nums`). Rounded-lg, 1px borders, no shadows, no gradients except one faint emerald
radial glow behind the hero search bar.

---

## Public API

```bash
curl -X POST http://localhost:3000/api/v1/appraise \
  -H "Authorization: Bearer dp_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"domain": "cloudmind.io"}'
```

Rate limits per key (requests / 60s): Free 10, Pro 60, Agency 240. Limit headers on every response.
Full spec: `GET /api/openapi`. Docs page: `/docs/api`.

---

## Scripts

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the dev server                               |
| `npm run build`     | Production build                                   |
| `npm run seed`      | Seed ~3,000 historical sales                       |
| `npm run worker`    | BullMQ bulk worker (only needed when `REDIS_URL` set) |
| `npm test`          | Vitest suite covering the valuation engine         |
| `npm run typecheck` | `tsc --noEmit`                                      |

---

## Tests

```bash
npm test
```

Vitest covers the valuation engine end-to-end (features, model, comps) in
[`tests/`](tests/) — 26 tests asserting price ordering, range coherence, feature contributions,
cosine ranking, and deterministic extraction.

---

## Renewal-alert cron

Schedule a daily GET to `/api/cron/renewals` (Vercel Cron, GitHub Actions, any scheduler),
protected by `CRON_SECRET`:

```
GET /api/cron/renewals?secret=$CRON_SECRET
```

## Stack

Next.js 15 (App Router, server actions) · TypeScript · PostgreSQL + Prisma · Redis (optional) ·
BullMQ · Auth.js · Stripe · Tailwind + a small shadcn-style UI kit · Recharts · Anthropic SDK.

---

_Estimates are algorithmic opinions for informational purposes only — not financial advice._
