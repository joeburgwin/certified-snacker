import { describe, expect, it } from "vitest";
import {
  aggregate,
  type ComponentInput,
  type ExistingRow,
  reconcile,
  toMultiSearchText,
} from "@/domain/shopping-list";

const ING = {
  onion: "11111111-1111-1111-1111-111111111111",
  garlic: "22222222-2222-2222-2222-222222222222",
  oil: "33333333-3333-3333-3333-333333333333",
};

function comp(over: Partial<ComponentInput> = {}): ComponentInput {
  return {
    componentId: "c1",
    slotDate: "2026-10-27",
    mealType: "dinner",
    recipeTitle: "Chilli",
    portions: 2,
    servings: 2,
    lines: [
      {
        ingredientId: ING.onion,
        name: "onion",
        nameKey: "onion",
        quantity: 1,
        unit: "each",
        isOptional: false,
        aisleId: null,
      },
      {
        ingredientId: ING.garlic,
        name: "garlic",
        nameKey: "garlic",
        quantity: 2,
        unit: "clove",
        isOptional: false,
        aisleId: null,
      },
      {
        ingredientId: ING.oil,
        name: "olive oil",
        nameKey: "olive oil",
        quantity: 1,
        unit: "tbsp",
        isOptional: false,
        aisleId: null,
      },
      {
        ingredientId: null,
        name: "coriander",
        nameKey: "coriander",
        quantity: null,
        unit: null,
        isOptional: true,
        aisleId: null,
      },
    ],
    ...over,
  };
}

describe("aggregate", () => {
  it("is deterministic: the same input yields identical rows", () => {
    const a = aggregate([comp()]);
    const b = aggregate([comp()]);
    expect(a).toEqual(b);
  });
  it("scales by portions / servings and doubling portions doubles quantities", () => {
    const two = aggregate([comp()]);
    const four = aggregate([comp({ portions: 4 })]);
    const g2 = two.find((r) => r.ingredientId === ING.garlic);
    const g4 = four.find((r) => r.ingredientId === ING.garlic);
    expect(g2?.qtyBase).toBe(2);
    expect(g4?.qtyBase).toBe(4);
    expect(g4?.qtyDisplay).toBe("4 cloves");
  });
  it("merges the same ingredient across recipes within a unit family (g + kg, tsp + tbsp → ml)", () => {
    const rows = aggregate([
      comp({
        componentId: "a",
        lines: [
          {
            ingredientId: ING.oil,
            name: "olive oil",
            nameKey: "olive oil",
            quantity: 1,
            unit: "tbsp",
            isOptional: false,
            aisleId: null,
          },
        ],
      }),
      comp({
        componentId: "b",
        recipeTitle: "Salad",
        lines: [
          {
            ingredientId: ING.oil,
            name: "olive oil",
            nameKey: "olive oil",
            quantity: 2,
            unit: "tsp",
            isOptional: false,
            aisleId: null,
          },
        ],
      }),
      comp({
        componentId: "c",
        recipeTitle: "Bread",
        lines: [
          {
            ingredientId: ING.onion,
            name: "flour",
            nameKey: "flour",
            quantity: 500,
            unit: "g",
            isOptional: false,
            aisleId: null,
          },
          {
            ingredientId: ING.onion,
            name: "flour",
            nameKey: "flour",
            quantity: 1,
            unit: "kg",
            isOptional: false,
            aisleId: null,
          },
        ],
      }),
    ]);
    const oil = rows.find((r) => r.ingredientId === ING.oil);
    expect(oil?.qtyBase).toBe(25);
    expect(oil?.qtyDisplay).toBe("25 ml");
    expect(oil?.provenance).toHaveLength(2);
    const flour = rows.find((r) => r.displayName === "flour");
    expect(flour?.qtyBase).toBe(1500);
    expect(flour?.qtyDisplay).toBe("1.5 kg");
  });
  it("keeps cloves separate from grams of the same ingredient until a portion row exists", () => {
    const rows = aggregate([
      comp({
        lines: [
          {
            ingredientId: ING.garlic,
            name: "garlic",
            nameKey: "garlic",
            quantity: 2,
            unit: "clove",
            isOptional: false,
            aisleId: null,
          },
          {
            ingredientId: ING.garlic,
            name: "garlic",
            nameKey: "garlic",
            quantity: 10,
            unit: "g",
            isOptional: false,
            aisleId: null,
          },
        ],
      }),
    ]);
    expect(rows.filter((r) => r.ingredientId === ING.garlic)).toHaveLength(2);
  });
  it("excludes optional lines by default and renders to-taste as '+ some'", () => {
    expect(
      aggregate([comp()]).find((r) => r.displayName === "coriander"),
    ).toBeUndefined();
    const rows = aggregate([
      comp({
        lines: [
          {
            ingredientId: null,
            name: "salt",
            nameKey: "salt",
            quantity: null,
            unit: null,
            isOptional: false,
            aisleId: null,
          },
        ],
      }),
    ]);
    expect(rows[0]?.qtyDisplay).toBe("some");
    expect(rows[0]?.generationKey).toBe("txt:salt:none");
  });
  it("adds staples only when not already demanded", () => {
    const rows = aggregate([comp()], {
      staples: [
        { ingredientId: ING.oil, name: "olive oil", aisleId: null },
        {
          ingredientId: "44444444-4444-4444-4444-444444444444",
          name: "kitchen roll",
          aisleId: null,
        },
      ],
    });
    expect(
      rows.filter((r) => r.source === "staple").map((r) => r.displayName),
    ).toEqual(["kitchen roll"]);
  });
});

describe("reconcile", () => {
  const required = aggregate([comp()]);
  it("inserts everything into an empty list and is a no-op the second time", () => {
    const first = reconcile([], required);
    expect(first.inserts).toHaveLength(3);
    const existing: ExistingRow[] = first.inserts.map((r, i) => ({
      id: `r${i}`,
      generationKey: r.generationKey,
      qty: r.qtyBase,
      unit: null,
      source: "plan",
      checkedAt: null,
      removedAt: null,
      manuallyEdited: false,
      aisleId: null,
    }));
    const second = reconcile(existing, required);
    expect(second.inserts).toHaveLength(0);
    expect(second.deleteIds).toHaveLength(0);
    expect(second.updates.every((u) => !u.uncheck)).toBe(true);
  });
  it("deletes plan rows no longer required, never manual rows, and respects tombstones", () => {
    const existing: ExistingRow[] = [
      {
        id: "stale",
        generationKey: "zzz:mass",
        qty: 1,
        unit: "g",
        source: "plan",
        checkedAt: null,
        removedAt: null,
        manuallyEdited: false,
        aisleId: null,
      },
      {
        id: "manual",
        generationKey: "manual:abc",
        qty: null,
        unit: null,
        source: "manual",
        checkedAt: null,
        removedAt: null,
        manuallyEdited: true,
        aisleId: null,
      },
      {
        id: "tomb",
        generationKey: required[0]?.generationKey ?? "",
        qty: 1,
        unit: null,
        source: "plan",
        checkedAt: null,
        removedAt: new Date(),
        manuallyEdited: false,
        aisleId: null,
      },
    ];
    const plan = reconcile(existing, required);
    expect(plan.deleteIds).toEqual(["stale"]);
    expect(plan.inserts.map((r) => r.generationKey)).not.toContain(
      required[0]?.generationKey,
    );
    expect(plan.updates.map((u) => u.id)).not.toContain("tomb");
  });
  it("keeps a tick when quantity barely changes and clears it when it grows >10%", () => {
    const garlic = required.find((r) => r.ingredientId === ING.garlic);
    if (!garlic) throw new Error("fixture");
    const checked: ExistingRow = {
      id: "g",
      generationKey: garlic.generationKey,
      qty: 2,
      unit: "clove",
      source: "plan",
      checkedAt: new Date(),
      removedAt: null,
      manuallyEdited: false,
      aisleId: null,
    };
    expect(reconcile([checked], required).updates[0]?.uncheck).toBe(false);
    const more = aggregate([comp({ portions: 4 })]);
    expect(reconcile([checked], more).updates[0]?.uncheck).toBe(true);
  });
});

describe("toMultiSearchText", () => {
  it("lists unticked, present rows, capped at 50 lines", () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      displayName: `item ${i}`,
      checkedAt: i % 2 ? new Date() : null,
      removedAt: null,
    }));
    const text = toMultiSearchText(rows);
    expect(text.split("\n")).toHaveLength(30);
    expect(text.startsWith("item 0\nitem 2")).toBe(true);
  });
});
