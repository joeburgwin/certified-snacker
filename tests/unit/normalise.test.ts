import { describe, expect, it } from "vitest";
import { cleanLine, lineKey, nameKey, singularise } from "@/domain/normalise";

describe("cleanLine", () => {
  it("strips bullets, expands fractions, folds multipliers", () => {
    expect(cleanLine("• ½ tsp salt")).toBe("1/2 tsp salt");
    expect(cleanLine("1½ cups flour")).toBe("1 1/2 cups flour");
    expect(cleanLine("2 x 400g tins chickpeas, drained")).toBe(
      "800 g tins chickpeas, drained",
    );
    expect(cleanLine("2 × 400 g tins chopped tomatoes")).toBe(
      "800 g tins chopped tomatoes",
    );
  });
});

describe("nameKey", () => {
  it("lowercases, singularises and applies UK aliases", () => {
    expect(nameKey("Cherry Tomatoes")).toBe("cherry tomato");
    expect(nameKey("scallions")).toBe("spring onion");
    expect(nameKey("cilantro leaves")).toBe("coriander leaf");
    expect(nameKey("Chickpeas")).toBe("chickpeas");
    expect(nameKey("eggs")).toBe("egg");
    expect(nameKey("all-purpose flour")).toBe("plain flour");
    expect(nameKey("Greek yoghurt (full fat)")).toBe("greek yoghurt");
  });
  it("singularises common food plurals", () => {
    expect(singularise("potatoes")).toBe("potato");
    expect(singularise("berries")).toBe("berry");
    expect(singularise("radishes")).toBe("radish");
    expect(singularise("oats")).toBe("oats");
    expect(singularise("hummus")).toBe("hummus");
  });
  it("produces a stable line key", () => {
    expect(lineKey("  2 Tbsp  Olive oil, extra-virgin ")).toBe(
      "2 tbsp olive oil extra virgin",
    );
  });
});
