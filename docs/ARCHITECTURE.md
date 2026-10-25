# Architecture

One surface, one loop, one derivation chain.

- **Surface**: the laptop week grid (7 days × breakfast/lunch/dinner/snack) with a shelf of draggable cards. Phone: the shopping list first, a read-mostly day view second.
- **Loop**: the cook log. A 10-second post-dinner ritual records stars, the frequency tier (rotation / time_to_time / if_needs_must / never_again), real prep minutes and who ate. The Due shelf, Surprise me and prep estimates are pure functions over it.
- **Derivation chain**: `plan_component` (own portions; attendees derived per slot) → idempotent shopping list → per-person nutrition → balance bars, snack room, price estimate.

## Stack

Next.js 16 App Router (Turbopack, dynamic rendering, `proxy.ts`), React 19.3, TypeScript 6, Tailwind 4 CSS-first tokens, Base UI primitives, `motion`, `@dnd-kit/react` behind an adapter, Drizzle + `pg` against Neon Postgres (production) or local Postgres 16 (dev/CI), better-auth (email+password, invite/reset tokens, passkeys later), the official Anthropic SDK with structured outputs, Vercel Hobby in `lhr1`.

## Layout

```
app/              routes only: (auth) sign-in/sign-up/invite/reset, (onboarding), (app) shell + week/recipes/shop/import/me/household, api/*
proxy.ts          cookie-only session gate; the real check and onboarding redirect live in app/(app)/layout.tsx
src/domain/       pure TypeScript, no IO, vitest: dates, cofid-rules, (M1+) units, shopping-list, suggest, nutrition, …
src/db/           drizzle schema (snake_case casing), migrations (generated SQL), pg pool with attachDatabasePool
src/server/       ctx.ts (getCtx/requireCtx/canEditPerson), actions/* ('use server', zod, ActionResult), queries/*
src/lib/          auth.ts (better-auth), auth-client.ts, env.ts (zod-validated, lazy), utils.ts (cn)
src/ui/           primitives/* (Base UI wrappers), shell/* (rail, account menu), planner/*, providers.tsx, theme-toggle.tsx
scripts/          migrate.ts (prod/LOCAL only), db-local.sh, build-cofid.ts
data/             committed seeds (CoFID JSON once built, aisles, bundles, evidence registry)
tests/unit        vitest    tests/e2e   Playwright (desktop + phone projects)
docs/             this folder; docs/research holds the original research digests
```

## Rendering and data access

Every page is a dynamically rendered Server Component. Reads go through `src/server/queries/*` after `getCtx()`. Mutations are Server Actions: zod parse → `getCtx()` → domain function → one transaction → `revalidatePath` → `ActionResult`. Plan-mutating actions regenerate the shopping list in the same transaction. Optimistic UI with `useOptimistic`; `plan_slot.version` for server-wins reconciliation. No realtime: `/shop` refreshes on focus and every 30 s while visible. Route handlers only for auth, import streaming, bookmarklet capture, upload extraction, Blob tokens and health.

## Auth and household

better-auth owns `user/session/account/verification`. `person` is the domain identity (one row per eater, `user_id` nullable for virtual persons). First sign-up creates the household + "You" (manager) + a virtual partner. Managers issue single-use `household_token`s: `invite` links a login to a person, `reset` lets a member set a new password without email. A manager may record ratings and preferences for any person in the household (`recorded_by_user_id` keeps provenance); cycle data is always viewer-only.

## Environments

- Local: Postgres 16 at `/tmp/pg` (`pnpm db:local`), `.env.local`, `pnpm build && pnpm start` for e2e.
- CI: GitHub Actions with a `postgres:16` service; Playwright installs its own Chromium.
- Vercel: production migrates during the build (`scripts/migrate.ts` is a no-op on previews). Fluid compute, region `lhr1`, `serverExternalPackages: ['pg']`.
