# Certified Snacker — agent entry point

A household weekly meal planner: laptop week grid is the hero, phone gets the shopping list.
Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md` and `docs/RUNBOOK.md` before changing code.
`AGENTS.md` (managed by Next.js) points at the version-matched Next 16 docs in `node_modules/next/dist/docs/`.

## Commands

- `pnpm db:local` — start the local Postgres 16 cluster (`/tmp/pg`) and create `snacker`
- `pnpm db:generate` — Drizzle migration from `src/db/schema/*` (commit the SQL; never hand-edit generated files)
- `pnpm db:migrate` — apply migrations locally (`LOCAL=1`); on Vercel only production builds migrate
- `pnpm check` — Biome + `next typegen` + `tsc` + vitest (run before every commit)
- `pnpm build && pnpm start` then `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm e2e`
- `pnpm dev` — Turbopack dev server

## Invariants (law; vitest pins them)

1. Plan dates are `DATE` columns read as `'YYYY-MM-DD'` strings (`IsoDate`); week maths only in `src/domain/dates.ts`; never `new Date(slotDate)`.
2. Shopping quantities derive from `plan_component.portions / recipe.servings × line quantity`, never recipe yield; `buildShoppingList` is idempotent on `(list_id, generation_key)`.
3. Root tables carry `household_id`; children are scoped through their parent; every read/write goes through `getCtx()` in `src/server/ctx.ts`; `person.id` is the domain identity.
4. Set breakfast = `recipe.kind='bundle'`; snack = `kind='snack'`. No extra tables.
5. `never_again` by any attendee hides a recipe from suggestions; `if_needs_must` only when fewer than 3 others remain.
6. Rollups are rewritten in the writing transaction; no DB triggers.
7. Nutrition is an estimate until `nutrition_status='verified'`; display rules live only in `src/ui/nutrition`.
8. CoFID rules live in `src/domain/cofid-rules.ts`; `scripts/build-cofid.ts` imports them.
9. Cycle data: consent-gated, viewer-only, derived at read time, evidence-tagged nudges only.
10. Prices are a remembered memory with staleness; nothing depends on a live Waitrose call.
11. Claude calls go through `src/ai/client.ts`; model ids are the named constants; schemas have `additionalProperties:false`.
12. `src/domain` is pure TypeScript with no IO; Server Actions are thin (zod → getCtx → domain → one transaction → revalidate → `ActionResult`).
13. Exact version pins; `npm view <pkg> dist-tags` before adding anything; drag-and-drop only through `src/ui/planner/dnd-adapter.tsx`.

## Conventions

- `app/` at the repo root holds routes only; everything else lives under `src/` (`@/` → `src/`).
- UI primitives in `src/ui/primitives` wrap Base UI (`@base-ui/react`) with shadcn conventions (`cn`, cva). The shadcn registry was unreachable from the sandbox, so they are hand-written; `components.json` is kept so `shadcn add` works when online.
- Tokens live only in `app/globals.css` (`@theme`). One accent, amber for estimates, rose for never-again/hate. Motion 120/220/320 ms.
- Money is integer pence; nutrition `numeric(10,3)`; ids are uuid (auth tables use better-auth's text ids).
- Commit messages: imperative, scoped (`feat(plan): …`, `fix(shop): …`).
