# KDP Product Factory

A web application for planning, producing, validating, and exporting **original** Amazon KDP
products: journals, notebooks, planners, logbooks, trackers, workbooks, activity, educational,
nonfiction, and illustrated books, in paperback, hardcover, and Kindle eBook formats.

The core is a deterministic publishing engine. It handles print geometry, layout, embedded-font
PDFs, cover geometry, and preflight checks. AI providers draft concepts, content, metadata, and
cover art, and everything they draft stays editable. A human reviews every product before
final export.

> **No guarantees.** Validation reduces risk; it does **not** guarantee KDP acceptance, sales,
> or policy compliance. KDP requirements change. The specification library records the source
> and verification status of every value; check the current KDP help pages and the official
> cover calculator before publishing.

See [PLAN.md](PLAN.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [TASKS.md](TASKS.md).

---

## Quick start (local development)

Requirements: Node.js ≥ 20, PostgreSQL ≥ 14, Redis ≥ 6 (Redis is optional with `JOB_RUNNER=inline`).

```bash
cd kdp-factory
npm install                                   # installs all workspaces, generates the Prisma client

# Services: either your own Postgres/Redis or Docker
docker compose up -d                          # postgres:16 + redis:7 (see docker-compose.yml)

cp apps/api/.env.example apps/api/.env        # then set DATABASE_URL and a random APP_SECRET (≥ 32 chars)
npm run db:migrate                            # prisma migrate deploy
npm run db:seed                               # demo account + the 5 fixture projects

# Three terminals:
npm run dev:api                               # API on http://localhost:4000 (docs: /api/docs)
npm run dev:worker                            # BullMQ worker (generation, validation, exports)
npm run dev:web                               # web app on http://localhost:5173 (proxies /api)
```

Sign in with **demo@kdp-factory.local / demo-password-123**, or register a new account.

**Single-process mode** (no Redis, no worker): set `JOB_RUNNER=inline` in `apps/api/.env` and
skip `dev:worker`. Jobs then run inside the API process with the same retry and cancel semantics.

**Production-style single origin:** `npm run build -w @kdp/web && npm run start -w @kdp/api`
serves the built SPA and the API from port 4000.

### AI providers

Without configuration, deterministic **mock** providers are used. They cost nothing and produce
generic output that is clearly marked as AI-generated in the project. To use real providers,
open **Settings → Providers** (keys are encrypted at rest and never shown again) or set server
environment variables:

| Kind | Provider | Env var | Notes |
|---|---|---|---|
| Text | Google Gemini | `GEMINI_API_KEY` | Model configurable (default `gemini-2.5-flash`). |
| Text | OpenAI-compatible | `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_BASE_URL` | Any `/chat/completions` endpoint. |
| Image | fal.ai | `FAL_KEY` | Background art only; cover text stays live text. |

Pricing for cost estimates is configured per provider. Estimates are not invoices.

---

## Tests

```bash
npm run test:core        # 74 unit/integration tests: specs, margins/bleed, spine, cover geometry, layout,
                         # PDF validity + determinism, font embedding, metadata, similarity, rules, EPUB/DOCX,
                         # manifest, and all five fixture projects (generated, preflighted, PDFs verified)
npm run test:api         # 33 API tests: auth/sessions, workspace isolation, roles, encrypted keys, uploads,
                         # provider failure handling, job retries (inline + real BullMQ/Redis), cancellation,
                         # quotas, editor ops/locks/concurrency, cover geometry, export gating, manifest
                         # checksums, EPUB export, batch CSV/duplicates/pause/approval, end-to-end MVP workflow
npm run test             # both

# Browser end-to-end (Playwright, Chromium). Needs Postgres + a built web app:
npm run build -w @kdp/web
npm run test:e2e         # starts the API with JOB_RUNNER=inline unless E2E_BASE_URL is set
```

API tests use a separate database (`TEST_DATABASE_URL`, default
`postgresql://postgres:postgres@localhost:5432/kdp_factory_test`), which is reset automatically.
The BullMQ test is skipped if Redis is unreachable.

Generate the fixture outputs (interior/cover PDFs, SVG, EPUB, preflight reports) for manual
inspection:

```bash
npm run fixtures         # → packages/core/fixtures-out/<fixture>/
```

| Fixture | Format | Checks |
|---|---|---|
| `journal` | 100-page 6×9 B&W paperback, cream paper | 6"×9" pages, 0.375" min gutter, spine 0.25" (100 × 0.0025"), spine text allowed |
| `workbook` | 8.5×11 paperback workbook | large trim, TOC from chapter openers, tables, checklists |
| `hardcover` | 6×9 hardcover logbook, 120 pages | cover geometry from official calculator values (example values, flagged as such), hinges, low-content review item |
| `ebook` | reflowable Kindle eBook | EPUB structure, nav, endnotes, 1600×2560 px cover |
| `illustrated` | 8.5×8.5 premium-colour paperback with bleed | 8.625"×8.75" pages, bleed on the outside edge, full-bleed art ≥ 300 DPI |

---

## Configuration reference (`apps/api/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `APP_SECRET` | — | ≥ 32 chars; derives the key that encrypts provider API keys (required) |
| `JOB_RUNNER` | `bullmq` | `bullmq` (Redis + worker) or `inline` |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ connection |
| `STORAGE_DRIVER` | `local` | `local` or `s3` |
| `STORAGE_LOCAL_DIR` | `./storage` | Local storage root |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | | S3-compatible storage (AWS, MinIO, R2, …) |
| `GEMINI_API_KEY`, `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_BASE_URL`, `FAL_KEY` | | Optional server-level provider keys |
| `PORT` | `4000` | API port |
| `SESSION_TTL_DAYS` | `14` | Sliding session lifetime |
| `MAX_UPLOAD_MB` | `25` | Upload size limit |
| `WORKER_CONCURRENCY` | `2` | Jobs processed in parallel per worker |

---

## Deployment notes

* Run the API (`npm run start -w @kdp/api`) behind HTTPS (cookies are `Secure` in production),
  with at least one worker (`npm run worker -w @kdp/api`). Workers scale horizontally.
* Run `npm run db:migrate` on each deploy. Run the API with `NODE_ENV=production`.
* Use S3-compatible storage in production. Local storage is per-machine.
* Provider rate limiting is per process; for many workers, set conservative per-config limits.

### Backup and restore

* **Database:** `pg_dump -Fc "$DATABASE_URL" > kdp-$(date +%F).dump`; restore with
  `pg_restore --clean --if-exists -d "$DATABASE_URL" kdp-YYYY-MM-DD.dump`.
  Schedule daily dumps and keep point-in-time recovery if your host offers it.
* **Objects:** enable bucket versioning and replicate or sync the bucket
  (`aws s3 sync s3://bucket s3://backup-bucket`). For local storage, back up `STORAGE_LOCAL_DIR`.
* **Secrets:** back up `APP_SECRET` separately. Encrypted provider keys cannot be decrypted
  without it (re-enter them if it is lost).
* **Restore test:** restore into a staging database, run `npm run db:migrate`, sign in, open a
  project, and download an export to confirm its checksum matches the manifest.

---

## Repository layout note

This repository also contains an unrelated, pre-existing Next.js app (DomainPulse) at the root.
KDP Product Factory lives entirely in `kdp-factory/` and does not modify it.
