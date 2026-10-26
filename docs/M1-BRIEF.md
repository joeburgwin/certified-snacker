# M1 build brief — parallel feature agents

Four agents build M1 in isolated git worktrees from the same commit. Each owns a disjoint set of paths.
The integrator merges the branches, resolves conflicts, runs the full suite and deploys. Read `CLAUDE.md`,
`docs/ARCHITECTURE.md`, `docs/SPEC.md` (algorithms, screens, tokens) and this file before writing code.

## Ground rules (all agents)

- **Do not modify**: `src/db/**` (schema, migrations), `package.json`, `pnpm-lock.yaml`, `src/domain/**`,
  `src/server/ctx.ts`, `src/server/action-result.ts`, `src/server/recipes/**`, `src/server/shopping/**`,
  `src/server/actions/household.ts`, `src/lib/**`, existing files in `src/ui/primitives/`, `app/globals.css`,
  `app/(app)/layout.tsx`, `src/ui/shell/**`, `src/ui/providers.tsx`, `proxy.ts`, `biome.json`, `tsconfig.json`,
  `next.config.ts`, docs. If you need a schema column, a dependency or a shared helper change, finish without it
  and list it under `needs_from_integrator` in your report. New files in `src/ui/primitives/` are allowed.
- **Conventions**: Server Actions live in your owned `src/server/actions/<area>.ts` with `"use server"`, zod
  input parsing, `requireCtx()` from `@/server/ctx`, one `db.transaction`, `revalidatePath`, and return
  `ActionResult` (`@/server/action-result`). Pages are Server Components reading via your
  `src/server/queries/<area>.ts`. Client islands are small. Plan dates are `IsoDate` strings from
  `@/domain/dates`; never construct a JS `Date` from a plan date. Money in pence; numeric columns come back as
  strings from pg (wrap with `Number()`).
- **Design**: use the primitives (`Button`, `Input`, `Field`, `Dialog`, `Sheet`, `Popover`, `Menu`, `Tabs`,
  `Tooltip`, `Switch`, `Toggle`, `NumberStepper`, `Select`, `Separator`, `EmptyState`) and the tokens
  (`text-ui/body/title/meta`, `bg-bg/surface/raised`, `border-border`, `text-muted`, accent only for state and
  the primary action, amber only for estimates, rose only for never-again/hate, radii `rounded-control/card/sheet`,
  durations `duration-(--dur-micro|--dur-move|--dur-sheet)`). Motion via `motion/react` (layout, AnimatePresence)
  and keep it at 120/220/320 ms. No gradients, no coloured cards, one typeface, hairline borders, 4 px grid.
  Hover-revealed actions on laptop, always visible on touch. Empty states: one sentence, at most two actions.
- **Setup in your worktree**: `pnpm install --frozen-lockfile --prefer-offline`, copy
  `/home/user/certified-snacker/.env.local` into the worktree root, `pnpm next typegen`. Local Postgres is shared
  and already migrated (`postgres://postgres@localhost:5432/snacker`); do not run migrations or change schema.
  Use your assigned dev port (`pnpm dev -p <port>`); never port 3000. Chromium for Playwright is at
  `/opt/pw-browsers/chromium` (`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`,
  `PLAYWRIGHT_BASE_URL=http://localhost:<port>`). Outbound network only reaches npm, GitHub and
  `api.anthropic.com` (no API key is available locally; recipe sites are blocked, so test fetching with fixtures).
- **Done means**: `pnpm check` green (Biome, typegen, tsc, vitest), your e2e spec passes against your dev server,
  screenshots of your screens taken and looked at, work committed on your worktree branch with scoped messages
  (`feat(import): …`), nothing pushed. Report branch, commits, files, decisions, deferred items, and needs.

## Shared contracts (already implemented; import, do not reimplement)

- `requireCtx(): Promise<Ctx>` — `{ userId, householdId, personId, role, household, person }`; `canEditPerson`.
- `saveRecipe(tx, { householdId, personId }, input: RecipeInput, existingRecipeId?) → recipeId` and
  `recipeInput` zod schema in `@/server/recipes/schema` (kind, title, servings, prep/cook minutes, mealTypes,
  tags, steps, source fields, `lines[]` with rawText/quantity/quantityMax/unit/nameNormalised/preparation/
  isOptional/groupName). `ensureIngredient(tx, householdId, name)`; `archiveRecipes(tx, householdId, ids)`.
- `regenerateShoppingList(tx, householdId, weekStart, { createIfMissing })` in `@/server/shopping/regenerate`
  — call it inside every plan-mutating transaction with `createIfMissing: true`.
- Domain: `parseIngredientLine(raw)`, `parseIngredientBlock(text)` (`@/domain/ingredient-line`);
  `resolveAttendees({ people, awayPersonIds, overrides })`, `defaultPortions(attendees, guests)`
  (`@/domain/attendees`); `aggregate`, `reconcile`, `toMultiSearchText` (`@/domain/shopping-list`);
  `normaliseUnit`, `formatQuantity` (`@/domain/units`); `nameKey`, `cleanLine` (`@/domain/normalise`);
  `todayIn`, `weekStartFor`, `weekDays`, `addDays`, `formatDay`, `isoDate`, `isIsoDate` (`@/domain/dates`).
- Schema tables and types from `@/db/schema`: `recipe`, `recipeIngredient`, `ingredient`, `aisle`,
  `recipeImport`, `planSlot`, `planComponent`, `dayContext`, `shoppingList`, `shoppingItem`, `llmCallLog`,
  `household`, `person`, `householdToken`; enums `MEAL_TYPES`, `RECIPE_KINDS`, `COMPONENT_KINDS`,
  `IMPORT_STATUSES`, `CAPTURE_METHODS`.
- Existing actions in `@/server/actions/household`: `createInviteLink(personId)`, `createResetLink(personId)`.
- `/recipes/[id]` is the canonical recipe page (recipes agent); other agents link to it. `/recipes/new?kind=bundle`
  opens the editor for a set breakfast.

## Ownership and scope

### A — import (dev port 3101)
Owns `src/import/**`, `src/ai/**`, `src/server/actions/imports.ts`, `src/server/queries/imports.ts`,
`app/(app)/import/**`, `app/api/import/**`, `src/ui/import/**`, `public/bookmarklet.js`,
`tests/unit/import-*.test.ts`, `tests/fixtures/import/**`, `tests/e2e/import-review.spec.ts`.
Build: tier 0 acquire (server fetch with realistic headers, 10 s timeout, 2 MB cap; 401/403/429 or challenge
markers → `blocked`); tier 1 `recipe-scrapers` (`inspectRecipeEvidence`, `scrapeRecipe` with `safeParse`,
`parseIngredients`, `fallbackYield`; unwrap `result.success`); tier 2 Readability (`@mozilla/readability` +
`linkedom`) → Claude structured output via `src/ai/client.ts` (`EXTRACT='claude-haiku-5-5'`,
`ESCALATE='claude-sonnet-5-5'`, `messages.parse` + `zodOutputFormat`, `output_config: { effort: 'low', format }`,
schemas with `additionalProperties:false` and no min/max, guard `parsed_output === null` and
`stop_reason === 'refusal'`, never `temperature`; every call logged to `llm_call_log` with cost); when
`ANTHROPIC_API_KEY` is unset the pipeline degrades to tier 1 + manual review with an "AI assist unavailable"
note. Inputs: URL, pasted text, captured HTML (bookmarklet POST `{url, html}` with bearer
`household.capture_token`; add an `OPTIONS` handler; the token is created lazily by your action and shown on the
import page with the bookmarklet). `recipe_import` lifecycle: pending → extracted/blocked/needs_caption/failed →
reviewing → saved. Review screen `/import/[importId]`: source + provenance (site, capture method, model), fields
with amber when confidence < 0.7, ingredient groups parsed with `parseIngredientBlock`/`parseIngredientLine`
(editable qty/unit/name, optional toggle), steps editable, servings and times editable, progress "n of m lines
checked"; Save calls `acceptImport` → `saveRecipe` (captureMethod set, importId set) → redirect to
`/recipes/[id]`. Blocked state explains why and offers the bookmarklet and a "paste the page" textarea.
Import page `/import`: paste a link or text, "how to capture blocked pages". Fixtures: a BBC-Good-Food-like page
with JSON-LD (write it yourself from schema.org/Recipe), an "uncertain" page (microdata only), a Cloudflare
challenge page; unit tests for tier classification and normalisation; Claude client injectable/mocked in tests.
Read the Anthropic SDK reference first: `/tmp/claude-0/bundled-skills/2.1.310/0b96aa00c6f1fdbed592ad9ac1136cc7/claude-api/typescript/claude-api/README.md`
and `.../typescript/claude-api/tool-use.md` (structured outputs section), and the SDK types in
`node_modules/@anthropic-ai/sdk`.

### B — planner (dev port 3102)
Owns `src/ui/planner/**` (replace `week-grid.tsx`), `src/ui/shelf/**`, `src/server/actions/plan.ts`,
`src/server/queries/plan.ts`, `app/(app)/week/**`, `tests/unit/plan-*.test.ts`, `tests/e2e/plan.spec.ts`.
Build: `/week/[[...weekStart]]` loads slots, components (with recipe title/kind/servings), people, away flags
(`day_context`) and the week's unticked shopping count; attendees per slot via `resolveAttendees`; the 7×4 grid
with real cards: title, portions `NumberStepper` (default `defaultPortions(attendees, guests)`, editing sets
`portionsManual`), hover actions (remove; "Move to…" menu for keyboard users), note/out entries, leftovers link
(M1: a simple "Leftovers of …" card created from a component's menu onto a later slot). Drag-and-drop ONLY through
`src/ui/planner/dnd-adapter.tsx` wrapping `@dnd-kit/react` 0.5.1 (`DragDropProvider`, `useDraggable`,
`useDroppable`, `DragOverlay`, pointer + keyboard sensors): shelf card → slot, card → other slot; drop target
shows a 1 px accent ring and inset tint; `motion` layout settle (spring stiffness 500, damping 38); reduced
motion respected. Right shelf (320 px, collapsible to a 40 px rail; tabs Recipes / Breakfasts with a search
field; recipes by `kind`, search via `ilike` on title and a trgm `similarity` order; shows portions default; a
"Place in next empty dinner" button per card for keyboard users). Context strip above the grid: per day, person
initials as `Toggle`s for "away" (writes `day_context.away`), guest count stepper per slot on the slot's menu.
Header: week nav (keep), "Shop (n)" linking to `/shop/[weekStart]`. Actions (all run `regenerateShoppingList`
inside the transaction and `revalidatePath('/week')` + `('/shop')`): `addComponent({ slotDate, mealType,
recipeId })` (creates the slot lazily with `guestCount 0`), `moveComponent`, `removeComponent`, `setPortions`,
`addNote({ slotDate, mealType, kind: 'note'|'out', title })`, `addLeftovers`, `setGuests`, `setAway({ personId,
day, away })` which resets `portions` on that day's components where `portionsManual=false` to the new default.
Optimistic UI with `useOptimistic`; `plan_slot.version` for server-wins. Phone (< md): a read-mostly day list for
today/tomorrow with a tap-to-add sheet (no drag). Keep the empty state until the first card lands. Unit-test the
pure parts you add (e.g. default-portion recomputation) in `tests/unit/plan-*.test.ts`.

### C — shop, household, PWA (dev port 3103)
Owns `app/(app)/shop/**`, `src/ui/shop/**`, `src/server/actions/shopping.ts`, `src/server/queries/shopping.ts`,
`app/(app)/household/**`, `src/ui/household/**`, `src/server/actions/household-settings.ts`, `app/manifest.ts`,
`public/sw.js`, `public/icons/**`, `src/ui/sw-register.tsx`, `tests/e2e/shop.spec.ts`,
`tests/unit/shop-*.test.ts`. May add one line to `app/layout.tsx` to mount `<ServiceWorkerRegister />`.
Build: `/shop/[[...weekStart]]` phone-first (single column, max 560 px, centred on laptop): header with week nav,
unticked count, "Copy for Waitrose Multi-search" (`toMultiSearchText`); aisle sections in `aisle.position` order,
"Unsorted" last, sticky headers; rows 56 px with a 44 px tick target; tick/untick optimistic (`checkedAt`,
`checkedByPersonId`); ticked rows animate into an "In the trolley" pile at the bottom; tap a row for a popover:
provenance ("Tue dinner · Chilli"), quantity override (sets `manuallyEdited`), "Move to aisle…" `Select` (also
updates `ingredient.aisleId` so the aisle is learned), remove (tombstone `removedAt`; never delete plan rows);
"Add item" manual rows (`source 'manual'`, `generationKey 'manual:<uuid>'`); the staples section "Check the
cupboard" collapsed; refresh on `visibilitychange` and every 30 s while visible (`router.refresh()`); empty
state. `/household`: members (name, role, linked or virtual), rename, add a virtual person (kind child/guest),
"Invite link" and "Reset link" buttons that call the existing actions and show a copyable URL; aisle order with
`motion` `Reorder` plus up/down buttons; staples (search household ingredients, toggle `isStaple`); set breakfasts
list (bundles) linking to `/recipes/new?kind=bundle` and `/recipes/[id]`; household settings (weeknight prep cap,
include optional ingredients). `/household/about` renders `docs/LIMITATIONS.md` (read the file in a Server
Component; write a tiny markdown-to-JSX for headings, paragraphs and lists; no new dependencies). PWA:
`app/manifest.ts` (name, short_name "Snacker", start_url `/shop`, display standalone, theme/background colours
matching the tokens, icons), `public/icons` (generate a simple SVG + 192/512 PNG via a script using sharp? sharp
is NOT installed — produce SVG and a maskable SVG only, and reference them), `public/sw.js` (app-shell cache of
`/shop` static assets, network-first for pages, no precache manifest), registration component.

### D — recipes (dev port 3104)
Owns `app/(app)/recipes/**`, `src/ui/recipes/**`, `src/server/actions/recipes.ts`, `src/server/queries/recipes.ts`,
`tests/e2e/recipes.spec.ts`, `tests/unit/recipes-*.test.ts`.
Build: `/recipes` library: search field (trgm `similarity` on title plus `ilike` on ingredient names), kind chips
(All / Recipes / Breakfasts / Snacks), cards (title, meal types, servings, prep ≈ minutes, source name), sorted
by updated; archived hidden. `/recipes/new` (and `?kind=bundle|snack`): manual editor — title, kind, servings
(bundles fixed at 1), prep/cook minutes, meal types toggles, ingredients textarea parsed live with
`parseIngredientBlock` into an editable preview table (qty, unit `Select` of unit codes, name, preparation,
optional), steps textarea (one per line), tags, optional source URL/name; save through `saveRecipe` (new and
edit; edit at `/recipes/[id]/edit`). `/recipes/[id]`: detail page — image if any, title, source link
("imported from …"), servings scaler (client-side scaling of displayed quantities with `formatQuantity`),
ingredient groups, steps, prep/cook, tags; Edit, Archive (confirm `Dialog`), Duplicate. Ingredient name
suggestions from household ingredients (server action `searchIngredients(q)`, trgm). Keep it calm and
minimal: no ratings yet (M2), no nutrition yet (M3).

## Report format (final message = raw data for the integrator)
```
branch, commits[{sha,message}], summary, files_touched[], decisions[], deferred[], needs_from_integrator[],
verification{check_green, unit, e2e, smoke}, screenshots[]
```
