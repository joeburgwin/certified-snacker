import { describe, expect, it } from "vitest";
import {
  basisForGroup,
  buildFoodRow,
  dedupeCodesExplicit,
  monoToWeight,
  parseCell,
  sodiumMgToSaltG,
} from "@/domain/cofid-rules";

describe("parseCell", () => {
  it("treats Tr as trace, N and blanks as missing", () => {
    expect(parseCell("Tr")).toEqual({ kind: "trace" });
    expect(parseCell("tr")).toEqual({ kind: "trace" });
    expect(parseCell("N")).toEqual({ kind: "missing" });
    expect(parseCell("")).toEqual({ kind: "missing" });
    expect(parseCell(null)).toEqual({ kind: "missing" });
    expect(parseCell(undefined)).toEqual({ kind: "missing" });
  });
  it("parses numbers from numbers and numeric strings", () => {
    expect(parseCell(12.5)).toEqual({ kind: "value", value: 12.5 });
    expect(parseCell(" 0.3 ")).toEqual({ kind: "value", value: 0.3 });
    expect(parseCell("1,234")).toEqual({ kind: "value", value: 1234 });
  });
});

describe("conversions", () => {
  it("divides monosaccharide equivalents by 1.05", () => {
    expect(monoToWeight(10.5)).toBe(10);
  });
  it("converts sodium mg to salt g", () => {
    expect(sodiumMgToSaltG(400)).toBe(1);
    expect(sodiumMgToSaltG(2400)).toBe(6);
  });
  it("marks group Q (alcoholic drinks) as per 100 ml", () => {
    expect(basisForGroup("QA")).toBe("per_100ml");
    expect(basisForGroup("A")).toBe("per_100g");
    expect(basisForGroup(null)).toBe("per_100g");
  });
  it("suffixes duplicate codes explicitly", () => {
    expect(
      dedupeCodesExplicit(["13-668", "13-669", "13-669", "13-670"]),
    ).toEqual(["13-668", "13-669a", "13-669b", "13-670"]);
  });
});

describe("buildFoodRow", () => {
  it("builds a row for white rice, boiled (fixture values)", () => {
    const row = buildFoodRow({
      code: "11-500",
      name: "Rice, white, easy cook, boiled",
      foodGroup: "AI",
      cells: {
        KCALS: 131,
        KJ: 557,
        PROT: 2.6,
        FAT: 1.3,
        SATFOD: 0.3,
        CHO: 30.9,
        TOTSUG: "Tr",
        AOACFIB: 0.6,
        NSP: 0.1,
        NA: "Tr",
        FE: 0.2,
        CA: 18,
        VITC: "N",
      },
    });
    expect(row.kcal).toBe(131);
    expect(row.carb_g).toBe(29.429);
    expect(row.sugars_g).toBe(0);
    expect(row.sodium_mg).toBe(0);
    expect(row.salt_g).toBe(0);
    expect(row.vit_c_mg).toBeNull();
    expect(row.traceTags).toEqual(["TOTSUG", "NA"]);
    expect(row.missingTags).toEqual(["VITC"]);
    expect(row.basis).toBe("per_100g");
  });
  it("keeps energy null for the 33 energy-less foods and never derives it", () => {
    const row = buildFoodRow({
      code: "99-001",
      name: "Mystery food",
      foodGroup: "A",
      cells: { KCALS: "N", PROT: 10, FAT: 5, CHO: 20 },
    });
    expect(row.kcal).toBeNull();
    expect(row.protein_g).toBe(10);
  });
});
