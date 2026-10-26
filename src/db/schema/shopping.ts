import {
  boolean,
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
import { household } from "./household";
import { aisle, ingredient } from "./recipe";

/** One list per household per week. Created lazily; never deleted by regeneration. */
export const shoppingList = pgTable(
  "shopping_list",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    weekStart: date({ mode: "string" }).notNull(),
    status: text({ enum: ["open", "done"] })
      .notNull()
      .default("open"),
    version: integer().notNull().default(0),
    generatedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("shopping_list_household_week_idx").on(
      t.householdId,
      t.weekStart,
    ),
  ],
);

export type Provenance = {
  componentId: string;
  slotDate: string;
  mealType: string;
  recipeTitle: string;
  qty: number | null;
  unit: string | null;
};

export const ITEM_SOURCES = ["plan", "staple", "manual"] as const;

/**
 * Materialised, tickable, editable list rows with provenance and tombstones.
 * Invariant 2: unique (list_id, generation_key) is the idempotency key.
 */
export const shoppingItem = pgTable(
  "shopping_item",
  {
    id: uuid().primaryKey().defaultRandom(),
    listId: uuid()
      .notNull()
      .references(() => shoppingList.id, { onDelete: "cascade" }),
    /** '<ingredient_id>:<family>[:<label>]' | 'txt:<slug>:<family>' | 'staple:<ingredient_id>' | 'manual:<uuid>' */
    generationKey: text().notNull(),
    ingredientId: uuid().references(() => ingredient.id, {
      onDelete: "set null",
    }),
    displayName: text().notNull(),
    qty: numeric({ precision: 10, scale: 2 }),
    /** g | ml | <count label> */
    unit: text(),
    /** '850 g', '2 cans', '4 + some' */
    qtyDisplay: text().notNull(),
    packsDisplay: text(),
    aisleId: uuid().references(() => aisle.id, { onDelete: "set null" }),
    position: smallint().notNull().default(0),
    source: text({ enum: ITEM_SOURCES }).notNull(),
    provenance: jsonb().$type<Provenance[]>().notNull().default([]),
    manuallyEdited: boolean().notNull().default(false),
    note: text(),
    checkedAt: timestamp({ withTimezone: true }),
    checkedByPersonId: uuid(),
    /** tombstone: the household removed this plan line; never resurrected */
    removedAt: timestamp({ withTimezone: true }),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("shopping_item_list_key_idx").on(t.listId, t.generationKey),
    index("shopping_item_list_aisle_idx").on(t.listId, t.aisleId, t.position),
  ],
);

export type ShoppingList = typeof shoppingList.$inferSelect;
export type ShoppingItem = typeof shoppingItem.$inferSelect;
