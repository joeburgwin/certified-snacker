import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { household, person } from "./household";

/** Household's Waitrose walk order; the shopping list groups by this. */
export const aisle = pgTable(
  "aisle",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    name: text().notNull(),
    position: smallint().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("aisle_household_name_idx").on(t.householdId, t.name)],
);

export const INGREDIENT_CATEGORIES = [
  "meat",
  "poultry",
  "fish_seafood",
  "dairy",
  "egg",
  "plant",
  "pantry",
  "other",
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

/** Household shopping vocabulary: one row per thing you buy. The shopping-list key. */
export const ingredient = pgTable(
  "ingredient",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** normalised, lowercase, singular, UK-aliased */
    nameKey: text().notNull(),
    plural: text(),
    aisleId: uuid().references(() => aisle.id, { onDelete: "set null" }),
    defaultUnit: text(),
    densityGPerMl: numeric({ precision: 5, scale: 3 }),
    isStaple: boolean().notNull().default(false),
    category: text({ enum: INGREDIENT_CATEGORIES }),
    /** CoFID food code (M3) */
    foodCode: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ingredient_household_name_key_idx").on(
      t.householdId,
      t.nameKey,
    ),
    index("ingredient_name_key_trgm_idx").using(
      "gin",
      t.nameKey.op("gin_trgm_ops"),
    ),
  ],
);

export const RECIPE_KINDS = ["recipe", "bundle", "snack"] as const;
export type RecipeKind = (typeof RECIPE_KINDS)[number];
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export const CAPTURE_METHODS = [
  "jsonld",
  "llm_html",
  "llm_text",
  "llm_image",
  "llm_pdf",
  "manual",
] as const;
export const NUTRITION_STATUSES = ["missing", "estimate", "verified"] as const;
export type DietStatusValue = "yes" | "no" | "unknown";
/** Tri-state suitability per diet rule; 'unknown' never passes a filter silently. */
export type DietStatus = Partial<Record<string, DietStatusValue>>;
export type RecipeStep = { text: string; minutesHint?: number };

/** Recipes, set-breakfast bundles and snacks in one table. */
export const recipe = pgTable(
  "recipe",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    kind: text({ enum: RECIPE_KINDS }).notNull().default("recipe"),
    title: text().notNull(),
    description: text(),
    /** bundles are always 1 */
    servings: numeric({ precision: 5, scale: 2 }).notNull().default("2"),
    prepMinStated: smallint(),
    cookMinStated: smallint(),
    prepMinLearned: numeric({ precision: 5, scale: 1 }),
    prepSamples: smallint().notNull().default(0),
    timesCooked: integer().notNull().default(0),
    lastCookedOn: date({ mode: "string" }),
    mealTypes: text().array().notNull().default(sql`'{}'::text[]`),
    cuisine: text(),
    mainProtein: text(),
    tags: text().array().notNull().default(sql`'{}'::text[]`),
    dietStatus: jsonb().$type<DietStatus>().notNull().default({}),
    dietManual: boolean().notNull().default(false),
    steps: jsonb().$type<RecipeStep[]>().notNull().default([]),
    imageUrl: text(),
    sourceUrl: text(),
    sourceName: text(),
    captureMethod: text({ enum: CAPTURE_METHODS }),
    importId: uuid(),
    nutritionStatus: text({ enum: NUTRITION_STATUSES })
      .notNull()
      .default("missing"),
    createdByPersonId: uuid()
      .notNull()
      .references(() => person.id, { onDelete: "restrict" }),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recipe_household_kind_idx").on(t.householdId, t.kind),
    index("recipe_title_trgm_idx").using("gin", t.title.op("gin_trgm_ops")),
    check("recipe_servings_positive", sql`${t.servings} > 0`),
  ],
);

export const GRAMS_METHODS = [
  "mass",
  "volume",
  "portion",
  "density",
  "llm",
  "manual",
  "none",
] as const;
export const MATCH_SOURCES = ["cache", "llm", "manual"] as const;

/** Parsed ingredient lines with quantity, unit, household ingredient and (M3) CoFID match. */
export const recipeIngredient = pgTable(
  "recipe_ingredient",
  {
    id: uuid().primaryKey().defaultRandom(),
    recipeId: uuid()
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    groupName: text(),
    position: smallint().notNull().default(0),
    rawText: text().notNull(),
    /** null = "to taste" */
    quantity: numeric({ precision: 10, scale: 3 }),
    quantityMax: numeric({ precision: 10, scale: 3 }),
    /** canonical unit code from src/domain/units.ts, or null */
    unit: text(),
    nameNormalised: text().notNull(),
    preparation: text(),
    isOptional: boolean().notNull().default(false),
    ingredientId: uuid().references(() => ingredient.id, {
      onDelete: "set null",
    }),
    foodCode: text(),
    gramsEstimate: numeric({ precision: 8, scale: 1 }),
    gramsMethod: text({ enum: GRAMS_METHODS }),
    matchConfidence: numeric({ precision: 3, scale: 2 }),
    matchSource: text({ enum: MATCH_SOURCES }),
    confirmedAt: timestamp({ withTimezone: true }),
    lineHash: text(),
  },
  (t) => [
    index("recipe_ingredient_recipe_idx").on(t.recipeId, t.position),
    index("recipe_ingredient_ingredient_idx").on(t.ingredientId),
  ],
);

export const IMPORT_SOURCE_TYPES = [
  "url",
  "paste",
  "html_capture",
  "image",
  "pdf",
  "caption",
] as const;
export const IMPORT_STATUSES = [
  "pending",
  "blocked",
  "needs_caption",
  "extracted",
  "reviewing",
  "saved",
  "failed",
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

/** Audit and work record for every import attempt (review-before-save). */
export const recipeImport = pgTable(
  "recipe_import",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    sourceType: text({ enum: IMPORT_SOURCE_TYPES }).notNull(),
    sourceUrl: text(),
    blobUrl: text(),
    status: text({ enum: IMPORT_STATUSES }).notNull().default("pending"),
    /** jsonld | llm_haiku | llm_sonnet | vision */
    tierUsed: text(),
    /** JSON-LD or reduced text, truncated to 200 KB */
    rawPayload: jsonb(),
    extracted: jsonb(),
    fieldConfidence: jsonb().$type<Record<string, number>>(),
    warnings: text().array().notNull().default(sql`'{}'::text[]`),
    recipeId: uuid().references(() => recipe.id, { onDelete: "set null" }),
    error: text(),
    createdByPersonId: uuid()
      .notNull()
      .references(() => person.id, { onDelete: "restrict" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recipe_import_household_created_idx").on(t.householdId, t.createdAt),
  ],
);

/** Model, tokens and cost per Claude call so spend is visible in-app. */
export const llmCallLog = pgTable(
  "llm_call_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    purpose: text({
      enum: ["import", "match", "receipt", "classify"],
    }).notNull(),
    model: text().notNull(),
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    cachedTokens: integer().notNull().default(0),
    costUsdMicro: integer().notNull().default(0),
    durationMs: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("llm_call_log_household_created_idx").on(t.householdId, t.createdAt),
  ],
);

export type Aisle = typeof aisle.$inferSelect;
export type Ingredient = typeof ingredient.$inferSelect;
export type Recipe = typeof recipe.$inferSelect;
export type RecipeIngredient = typeof recipeIngredient.$inferSelect;
export type RecipeImport = typeof recipeImport.$inferSelect;
export type LlmCallLog = typeof llmCallLog.$inferSelect;
