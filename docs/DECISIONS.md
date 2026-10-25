# Decisions (ADR log)

Format: date · decision · alternatives · why. Newest last.

- 2026-10-25 · **Next.js 16.4.3 App Router, dynamic rendering, Cache Components off** · PPR/`use cache` · pages read the session cookie; simplicity first.
- 2026-10-25 · **TypeScript 6.0.3 pinned** · 7.0.2 (native compiler) · unverified with Next's type plugin; revisit as a chore.
- 2026-10-25 · **Tailwind 4 via `@tailwindcss/turbopack` loader** (template default) · `@tailwindcss/postcss` · it is what `create-next-app@16.4.3` ships; no PostCSS config needed.
- 2026-10-25 · **Base UI primitives hand-written in `src/ui/primitives`** · shadcn registry install · ui.shadcn.com is unreachable from the agent sandbox; wrappers follow shadcn conventions so `shadcn add` still works online.
- 2026-10-25 · **Inter self-hosted via `next/font/local`** (`@fontsource-variable/inter`) · `next/font/google` · Google Fonts is blocked in the sandbox at build time; self-hosting is also faster and offline-safe.
- 2026-10-25 · **Driver `pg` + `drizzle-orm/node-postgres` + `attachDatabasePool`** · `@neondatabase/serverless` · one driver for Neon (TCP) and local Postgres 16; transactions work; WebSocket-only driver cannot reach a local cluster.
- 2026-10-25 · **Migrations run only on Vercel production builds or with `LOCAL=1`** · migrate on every build · a preview deployment must never migrate production.
- 2026-10-25 · **better-auth email+password, manager-issued invite/reset tokens** · magic link (Resend), NextAuth, Clerk · zero third-party services for a two-person household; CLI is the `auth` package (`@better-auth/cli` is deprecated).
- 2026-10-25 · **Proxy checks only the session cookie; the household/onboarding redirect lives in `(app)/layout.tsx`** · DB lookup in proxy · Next guidance; proxy should be cheap.
- 2026-10-25 · **Playwright pinned 1.63.0** · 1.64.1 · matches the sandbox's preinstalled Chromium; CI installs its own browser either way.
- 2026-10-25 · **Week grid is a real `<table>`** · CSS grid with ARIA grid roles · semantics for free, Biome a11y clean; drag-and-drop works inside cells.
- 2026-10-25 · **No global "acting as" mode; a per-action "Rating for…" picker** · signed acting cookie · nothing to forget to switch back.
- 2026-10-25 · **Pricing server refresh is an interface stub only** · implementing an env-flagged refresh · research calls automated Waitrose fetching a terms breach; paste inputs first, revisit on request.
