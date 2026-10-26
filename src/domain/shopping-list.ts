import type { Provenance } from "@/db/schema";
import { slugify } from "./normalise";
import { formatQuantity, type UnitFamily, unitInfo } from "./units";

/**
 * Pure shopping-list maths. Invariant 2: quantities derive from component portions / recipe servings
 * × line quantity; the generation key makes regeneration idempotent; tombstones never resurrect;
 * manual rows are untouched; ticks survive unless the quantity grows by more than 10 %.
 */

export type LineLike = {
  ingredientId: string | null;
  name: string;
  nameKey: string;
  quantity: number | null;
  /** canonical unit code or null */
  unit: string | null;
  isOptional: boolean;
  aisleId: string | null;
};

export type ComponentInput = {
  componentId: string;
  slotDate: string;
  mealType: string;
  recipeTitle: string;
  portions: number;
  servings: number;
  lines: LineLike[];
};

export type StapleInput = {
  ingredientId: string;
  name: string;
  aisleId: string | null;
};

export type RequiredRow = {
  generationKey: string;
  ingredientId: string | null;
  displayName: string;
  aisleId: string | null;
  family: UnitFamily | null;
  /** grams, millilitres or count */
  qtyBase: number;
  countLabel: string | null;
  hasUnknownQty: boolean;
  qtyDisplay: string;
  source: "plan" | "staple";
  provenance: Provenance[];
};

export type ExistingRow = {
  id: string;
  generationKey: string;
  qty: number | null;
  unit: string | null;
  source: "plan" | "staple" | "manual";
  checkedAt: Date | null;
  removedAt: Date | null;
  manuallyEdited: boolean;
  aisleId: string | null;
};

export type ReconcilePlan = {
  inserts: RequiredRow[];
  updates: Array<{
    id: string;
    row: RequiredRow;
    uncheck: boolean;
    note: string | null;
  }>;
  deleteIds: string[];
};

function keyFor(
  line: LineLike,
  family: UnitFamily | null,
  countLabel: string | null,
): string {
  const base = line.ingredientId
    ? line.ingredientId
    : `txt:${slugify(line.nameKey || line.name)}`;
  const fam = family ?? "none";
  return family === "count" && countLabel
    ? `${base}:${fam}:${countLabel}`
    : `${base}:${fam}`;
}

/** Fold the week's components into merged rows keyed by (ingredient, unit family[, count label]). */
export function aggregate(
  components: ComponentInput[],
  options: { includeOptional?: boolean; staples?: StapleInput[] } = {},
): RequiredRow[] {
  const required = new Map<string, RequiredRow>();
  for (const c of components) {
    const scale = c.servings > 0 ? c.portions / c.servings : 1;
    for (const line of c.lines) {
      if (line.isOptional && !options.includeOptional) continue;
      const u = line.unit ? unitInfo(line.unit) : null;
      const family =
        u?.family ??
        (line.quantity !== null && line.unit === null ? "count" : null);
      const countLabel =
        family === "count" ? (u && u.code !== "each" ? u.code : "each") : null;
      const key = keyFor(line, family, countLabel);
      let row = required.get(key);
      if (!row) {
        row = {
          generationKey: key,
          ingredientId: line.ingredientId,
          displayName: line.name,
          aisleId: line.aisleId,
          family,
          qtyBase: 0,
          countLabel,
          hasUnknownQty: false,
          qtyDisplay: "",
          source: "plan",
          provenance: [],
        };
        required.set(key, row);
      }
      if (line.quantity === null) row.hasUnknownQty = true;
      else row.qtyBase += line.quantity * (u?.toBase ?? 1) * scale;
      row.provenance.push({
        componentId: c.componentId,
        slotDate: c.slotDate,
        mealType: c.mealType,
        recipeTitle: c.recipeTitle,
        qty: line.quantity === null ? null : round2(line.quantity * scale),
        unit: line.unit,
      });
    }
  }
  const demanded = new Set(
    [...required.values()].map((r) => r.ingredientId).filter(Boolean),
  );
  for (const s of options.staples ?? []) {
    if (demanded.has(s.ingredientId)) continue;
    const key = `staple:${s.ingredientId}`;
    required.set(key, {
      generationKey: key,
      ingredientId: s.ingredientId,
      displayName: s.name,
      aisleId: s.aisleId,
      family: null,
      qtyBase: 0,
      countLabel: null,
      hasUnknownQty: false,
      qtyDisplay: "check",
      source: "staple",
      provenance: [],
    });
  }
  const rows = [...required.values()];
  for (const r of rows) {
    r.qtyBase = round2(r.qtyBase);
    if (r.source === "plan") {
      r.qtyDisplay = formatQuantity({
        family: r.family,
        qtyBase: r.qtyBase,
        countLabel: r.countLabel === "each" ? null : r.countLabel,
        hasUnknownQty: r.hasUnknownQty,
      });
    }
  }
  return rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** Diff required rows against what the list already holds. Pure; the action applies it in one transaction. */
export function reconcile(
  existing: ExistingRow[],
  required: RequiredRow[],
): ReconcilePlan {
  const byKey = new Map(existing.map((e) => [e.generationKey, e]));
  const plan: ReconcilePlan = { inserts: [], updates: [], deleteIds: [] };
  const seen = new Set<string>();
  for (const row of required) {
    seen.add(row.generationKey);
    const ex = byKey.get(row.generationKey);
    if (!ex) {
      plan.inserts.push(row);
      continue;
    }
    if (ex.removedAt) continue; // tombstone wins; never resurrect
    const grew =
      ex.qty !== null &&
      row.qtyBase > ex.qty * 1.1 &&
      row.qtyBase - ex.qty > 0.5;
    const uncheck = Boolean(ex.checkedAt) && grew;
    plan.updates.push({
      id: ex.id,
      row,
      uncheck,
      note: uncheck ? "Quantity went up after you ticked this" : null,
    });
  }
  for (const ex of existing) {
    if (ex.source === "manual") continue;
    if (ex.removedAt) continue;
    if (!seen.has(ex.generationKey)) plan.deleteIds.push(ex.id);
  }
  return plan;
}

/** Base unit stored in shopping_item.unit for a family. */
export function baseUnitFor(
  family: UnitFamily | null,
  countLabel: string | null,
): string | null {
  if (family === "mass") return "g";
  if (family === "volume") return "ml";
  if (family === "count") return countLabel ?? "each";
  return null;
}

/** Plain text for Waitrose's Multi-search box: one item per line, at most 50. */
export function toMultiSearchText(
  rows: Array<{
    displayName: string;
    checkedAt: Date | null;
    removedAt: Date | null;
  }>,
): string {
  return rows
    .filter((r) => !r.checkedAt && !r.removedAt)
    .map((r) => r.displayName)
    .slice(0, 50)
    .join("\n");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
