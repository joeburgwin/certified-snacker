import { describe, expect, it } from "vitest";
import { formatQuantity, normaliseUnit } from "@/domain/units";

describe("normaliseUnit", () => {
  it("maps spellings and parse-ingredient ids to canonical codes", () => {
    expect(normaliseUnit("tablespoon")?.code).toBe("tbsp");
    expect(normaliseUnit("Tbsps")?.code).toBe("tbsp");
    expect(normaliseUnit("gram")?.toBase).toBe(1);
    expect(normaliseUnit("kg")?.toBase).toBe(1000);
    expect(normaliseUnit("fluid ounce")?.toBase).toBe(28.4);
    expect(normaliseUnit("tins")?.code).toBe("tin");
    expect(normaliseUnit("can")?.code).toBe("tin");
    expect(normaliseUnit("dsp")?.toBase).toBe(10);
    expect(normaliseUnit("rashers")?.family).toBe("count");
    expect(normaliseUnit("furlong")).toBeNull();
    expect(normaliseUnit(null)).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("rounds mass sensibly", () => {
    expect(formatQuantity({ family: "mass", qtyBase: 37 })).toBe("35 g");
    expect(formatQuantity({ family: "mass", qtyBase: 846 })).toBe("850 g");
    expect(formatQuantity({ family: "mass", qtyBase: 1250 })).toBe("1.25 kg");
    expect(formatQuantity({ family: "mass", qtyBase: 2 })).toBe("5 g");
  });
  it("rounds volume sensibly", () => {
    expect(formatQuantity({ family: "volume", qtyBase: 32 })).toBe("30 ml");
    expect(formatQuantity({ family: "volume", qtyBase: 1500 })).toBe("1.5 l");
  });
  it("pluralises count labels", () => {
    expect(
      formatQuantity({ family: "count", qtyBase: 1, countLabel: "tin" }),
    ).toBe("1 tin");
    expect(
      formatQuantity({ family: "count", qtyBase: 2.4, countLabel: "tin" }),
    ).toBe("2.5 tins");
    expect(
      formatQuantity({ family: "count", qtyBase: 3, countLabel: "leaf" }),
    ).toBe("3 leaves");
    expect(formatQuantity({ family: "count", qtyBase: 4 })).toBe("4");
  });
  it("marks unknown quantities", () => {
    expect(
      formatQuantity({ family: "mass", qtyBase: 200, hasUnknownQty: true }),
    ).toBe("200 g + some");
    expect(
      formatQuantity({ family: null, qtyBase: 0, hasUnknownQty: true }),
    ).toBe("some");
  });
});
