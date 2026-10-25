# Runbook

## Local development
1. `pnpm install`
2. `pnpm db:local` (Postgres 16 at `/tmp/pg`, database `snacker`)
3. Copy `.env.example` to `.env.local`; set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
4. `pnpm db:migrate` then `pnpm dev` (or `pnpm build && pnpm start` for the e2e suite)
5. `pnpm check` before committing; `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm e2e` (sandbox: add `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`)

## Schema changes
Edit `src/db/schema/*.ts` → `pnpm db:generate` → review the SQL → `pnpm db:migrate` → commit schema + SQL + `meta/`. Never hand-edit generated migrations (the one hand-written file is `0000_extensions.sql`). Auth tables: `set -a; . ./.env.local; set +a; pnpm dlx auth@1.7.13 generate --config src/lib/auth.ts --output src/db/schema/auth.ts -y`.

## Deploy (Vercel project `certified-snacker`, team `burgwin`)
Human steps for Joe (one time):
1. Link Git: Vercel → project → Settings → Git → connect `joeburgwin/certified-snacker`, production branch `main` (or let the agent delete and recreate the project linked).
2. Storage → Create Database → Neon (Free, eu-west-2) → connect to the project; enable preview branches if offered. Record the real storage limit here.
3. Settings → Deployment Protection → Vercel Authentication: Only Preview Deployments (or add a custom domain) so phones can open the production URL.
4. Environment variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://<prod-domain>`, `ANTHROPIC_API_KEY` (M1+), `BLOB_READ_WRITE_TOKEN` (M4).
5. Settings → General → Node.js version 22.x; install command `pnpm install --frozen-lockfile`; build command `pnpm build` (runs `scripts/migrate.ts`, which only migrates when `VERCEL_ENV=production`).

Verify a deploy: open `/api/health` (expects `{"ok":true}`), sign up, name the household, see the empty week.

## Things that cannot run from the agent sandbox
Outbound network reaches only npm, GitHub and Anthropic. Recipe-site probes, Waitrose checks, GOV.UK downloads (CoFID), Vercel preview URLs and Google Fonts must run from a preview deployment, a GitHub Actions runner (`build-cofid.yml`) or Joe's machine.

## CoFID seed
Run the "Build CoFID dataset" workflow with the GOV.UK workbook URL; it opens a PR adding `data/cofid-2021.json` and `data/ATTRIBUTION.md`.
