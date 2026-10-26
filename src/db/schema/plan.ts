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
import { MEAL_TYPES, recipe } from "./recipe";

/** Who eats at this slot, on top of the household default eaters minus anyone away. */
export type AttendeeOverrides = { add?: string[]; remove?: string[] };

/** A meal on a date: the container cards drop into. Created lazily on first drop. */
export const planSlot = pgTable(
  "plan_slot",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    /** Invariant 1: a DATE read as 'YYYY-MM-DD'; never a timestamp. */
    slotDate: date({ mode: "string" }).notNull(),
    mealType: text({ enum: MEAL_TYPES }).notNull(),
    attendeeOverrides: jsonb().$type<AttendeeOverrides>(),
    guestCount: smallint().notNull().default(0),
    /** e.g. {vegan} for a group meal */
    dietRules: text().array().notNull().default(sql`'{}'::text[]`),
    maxMinutes: smallint(),
    note: text(),
    version: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("plan_slot_household_date_meal_idx").on(
      t.householdId,
      t.slotDate,
      t.mealType,
    ),
  ],
);

export const COMPONENT_KINDS = ["recipe", "note", "leftovers", "out"] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

/** A thing in a slot with its own portions: recipe/bundle/snack card, note, leftovers link, out. */
export const planComponent = pgTable(
  "plan_component",
  {
    id: uuid().primaryKey().defaultRandom(),
    slotId: uuid()
      .notNull()
      .references(() => planSlot.id, { onDelete: "cascade" }),
    position: smallint().notNull().default(0),
    kind: text({ enum: COMPONENT_KINDS }).notNull(),
    /** required when kind = 'recipe' (covers bundles and snacks) */
    recipeId: uuid().references(() => recipe.id, { onDelete: "cascade" }),
    /** servings to prepare/eat */
    portions: numeric({ precision: 5, scale: 2 }).notNull().default("2"),
    /** false = still the computed default, so away toggles may reset it */
    portionsManual: boolean().notNull().default(false),
    /** note / out label */
    title: text(),
    /** leftovers of (kept when the source card is removed, orphaned with a warning) */
    sourceComponentId: uuid(),
    /** protects from Surprise me */
    locked: boolean().notNull().default(false),
    cookedAt: timestamp({ withTimezone: true }),
    createdByPersonId: uuid()
      .notNull()
      .references(() => person.id, { onDelete: "restrict" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("plan_component_slot_idx").on(t.slotId, t.position),
    check(
      "plan_component_recipe_required",
      sql`${t.kind} <> 'recipe' or ${t.recipeId} is not null`,
    ),
  ],
);

/** Per-person per-day flags: away (M1), gym (M3). Written only on explicit toggle. */
export const dayContext = pgTable(
  "day_context",
  {
    personId: uuid()
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    day: date({ mode: "string" }).notNull(),
    isGym: boolean().notNull().default(false),
    gymKcalOverride: smallint(),
    away: boolean().notNull().default(false),
    note: text(),
    recordedByUserId: text().notNull(),
  },
  (t) => [uniqueIndex("day_context_pk").on(t.personId, t.day)],
);

export type PlanSlot = typeof planSlot.$inferSelect;
export type PlanComponent = typeof planComponent.$inferSelect;
export type DayContext = typeof dayContext.$inferSelect;
