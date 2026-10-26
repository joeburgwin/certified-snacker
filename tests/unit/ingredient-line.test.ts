import { describe, expect, it } from "vitest";
import {
  parseIngredientBlock,
  parseIngredientLine,
} from "@/domain/ingredient-line";

describe("parseIngredientLine", () => {
  it("parses quantity, unit, name and preparation", () => {
    const l = parseIngredientLine("3 cloves garlic, crushed");
    expect(l).toMatchObject({
      quantity: 3,
      unit: "clove",
      nameNormalised: "garlic",
      preparation: "crushed",
      nameKey: "garlic",
    });
  });
  it("normalises spoons and metric", () => {
    expect(parseIngredientLine("2 tbsp olive oil")).toMatchObject({
      quantity: 2,
      unit: "tbsp",
      nameNormalised: "olive oil",
    });
    expect(parseIngredientLine("400g chopped tomatoes")).toMatchObject({
      quantity: 400,
      unit: "g",
      nameNormalised: "tomatoes",
      preparation: "chopped",
    });
    expect(parseIngredientLine("1½ cups plain flour")).toMatchObject({
      quantity: 1.5,
      unit: "cup",
      nameNormalised: "plain flour",
    });
  });
  it("handles multipliers, tins and ranges", () => {
    expect(
      parseIngredientLine("2 x 400g tins chickpeas, drained"),
    ).toMatchObject({
      quantity: 800,
      unit: "g",
      nameNormalised: "chickpeas",
      preparation: "drained",
    });
    expect(parseIngredientLine("1 tin coconut milk")).toMatchObject({
      quantity: 1,
      unit: "tin",
      nameNormalised: "coconut milk",
    });
    expect(parseIngredientLine("1-2 red chillies")).toMatchObject({
      quantity: 1,
      quantityMax: 2,
      unit: "each",
      nameNormalised: "red chillies",
    });
  });
  it("flags optional and to-taste lines", () => {
    expect(parseIngredientLine("salt to taste")).toMatchObject({
      quantity: null,
      unit: null,
      nameNormalised: "salt",
    });
    expect(
      parseIngredientLine("a handful of fresh parsley (optional)"),
    ).toMatchObject({ isOptional: true });
    expect(parseIngredientLine("2 eggs")).toMatchObject({
      quantity: 2,
      unit: "each",
      nameKey: "egg",
    });
    expect(parseIngredientLine("1 dozen eggs")).toMatchObject({
      quantity: 12,
      unit: "each",
    });
  });
  it("keeps UK units", () => {
    expect(parseIngredientLine("4 rashers smoked bacon")).toMatchObject({
      quantity: 4,
      unit: "rasher",
      nameNormalised: "smoked bacon",
    });
    expect(parseIngredientLine("1 dsp honey")).toMatchObject({
      quantity: 1,
      unit: "dsp",
    });
  });
});

describe("parseIngredientBlock", () => {
  it("splits groups on headers", () => {
    const groups = parseIngredientBlock(
      "200 g spaghetti\nFor the sauce:\n2 tbsp olive oil\n1 onion, diced\nTo serve:\nparmesan",
    );
    expect(groups.map((g) => g.groupName)).toEqual([null, "sauce", "serve"]);
    expect(groups[1]?.lines).toHaveLength(2);
    expect(groups[2]?.lines[0]?.nameNormalised).toBe("parmesan");
  });
});
