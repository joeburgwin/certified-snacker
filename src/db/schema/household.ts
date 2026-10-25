import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/** The planning unit: one household, shared plan, shared list. */
export const household = pgTable("household", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  timezone: text().notNull().default("Europe/London"),
  /** 0 = Monday … 6 = Sunday */
  weekStartsOn: smallint().notNull().default(0),
  weeknightPrepCapMin: smallint().notNull().default(35),
  includeOptionalIngredients: boolean().notNull().default(false),
  /** Household run-over factor learned from cook logs (1.00 = recipes are honest). */
  prepFactor: numeric({ precision: 4, scale: 2 }).notNull().default("1.00"),
  /** Bearer for the bookmarklet capture endpoint (M4); rotatable. */
  captureToken: text().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const PERSON_ROLES = ["manager", "member"] as const;
export const PERSON_KINDS = ["adult", "child", "guest"] as const;
export const DIET_RULES = [
  "vegan",
  "vegetarian",
  "pescatarian",
  "gluten_free",
  "dairy_free",
  "nut_free",
] as const;
export type DietRule = (typeof DIET_RULES)[number];

/**
 * An eater in the household. The domain identity for ratings, preferences, targets,
 * cycle data and day context. user_id is null for a virtual person (child, guest,
 * partner before they sign up).
 */
export const person = pgTable(
  "person",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    displayName: text().notNull(),
    role: text({ enum: PERSON_ROLES }).notNull().default("member"),
    kind: text({ enum: PERSON_KINDS }).notNull().default("adult"),
    isDefaultEater: boolean().notNull().default(true),
    dietRules: text().array().notNull().default(sql`'{}'::text[]`),
    sex: text({ enum: ["female", "male", "unspecified"] })
      .notNull()
      .default("unspecified"),
    birthYear: smallint(),
    weightKg: numeric({ precision: 5, scale: 1 }),
    /** Physical activity level multiplier: 1.40 / 1.60 / 1.80 */
    pal: numeric({ precision: 3, scale: 2 }).notNull().default("1.40"),
    proteinGPerKg: numeric({ precision: 3, scale: 2 }),
    kcalOverride: integer(),
    kcalOverrideConfirmed: boolean().notNull().default(false),
    gymKcalBonus: smallint().notNull().default(300),
    /** 0 = Monday … 6 = Sunday */
    gymWeekdays: smallint().array().notNull().default(sql`'{}'::smallint[]`),
    snackPct: numeric({ precision: 4, scale: 1 }).notNull().default("12.0"),
    showEnergy: boolean().notNull().default(false),
    sortOrder: smallint().notNull().default(0),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("person_household_idx").on(t.householdId),
    uniqueIndex("person_user_idx").on(t.userId),
    check(
      "person_kcal_floor",
      sql`${t.kcalOverride} is null or ${t.kcalOverride} >= 1400 or ${t.kcalOverrideConfirmed}`,
    ),
  ],
);

export const TOKEN_KINDS = ["invite", "reset"] as const;

/** Single-use links: invite a login to a person, or reset a member's password. */
export const householdToken = pgTable(
  "household_token",
  {
    token: text().primaryKey(),
    householdId: uuid()
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    personId: uuid()
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    kind: text({ enum: TOKEN_KINDS }).notNull(),
    createdByUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    usedByUserId: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("household_token_person_idx").on(t.personId)],
);

export type Household = typeof household.$inferSelect;
export type Person = typeof person.$inferSelect;
export type HouseholdToken = typeof householdToken.$inferSelect;
