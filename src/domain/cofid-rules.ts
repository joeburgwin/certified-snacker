/**
 * Pure rules for converting McCance & Widdowson's CoFID 2021 workbook cells into stored values.
 * Invariant 8: these live here (tested with fixtures); scripts/build-cofid.ts imports them.
 *
 * Source: "Composition of Foods Integrated Dataset" (GOV.UK), Open Government Licence v3.0.
 */

export type CellValue = string | number | null | undefined;

export type ParsedCell =
  | { kind: "value"; value: number }
  | { kind: "trace" } // 'Tr': a trace amount; stored as 0 and tagged
  | { kind: "missing" }; // 'N' (not determined) or blank; stored as null and tagged

/** Rule 1 + 2: 'Tr' → trace (0 + tag); 'N' and blanks → missing (null + tag); numbers pass through. */
export function parseCell(raw: CellValue): ParsedCell {
  if (raw === null || raw === undefined) return { kind: "missing" };
  if (typeof raw === "number")
    return Number.isFinite(raw)
      ? { kind: "value", value: raw }
      : { kind: "missing" };
  const s = raw.trim();
  if (s === "" || s.toUpperCase() === "N") return { kind: "missing" };
  if (s.toLowerCase() === "tr") return { kind: "trace" };
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? { kind: "value", value: n } : { kind: "missing" };
}

/** Rule 3: CoFID carbohydrate and sugars are monosaccharide equivalents; divide by 1.05 for weight. */
export const MONOSACCHARIDE_FACTOR = 1.05;
export function monoToWeight(g: number): number {
  return round3(g / MONOSACCHARIDE_FACTOR);
}

/** Rule 5: salt (g) = sodium (mg) × 2.5 / 1000. */
export function sodiumMgToSaltG(mg: number): number {
  return round3((mg * 2.5) / 1000);
}

/** Rule 6: CoFID food group codes that are per 100 ml rather than per 100 g (alcoholic drinks and liquids). */
const PER_100ML_GROUPS = new Set([
  "Q",
  "QA",
  "QC",
  "QE",
  "QF",
  "QI",
  "QK",
  "QM",
  "QO",
  "QR",
]);
export function basisForGroup(
  groupCode: string | null | undefined,
): "per_100g" | "per_100ml" {
  if (!groupCode) return "per_100g";
  const g = groupCode.trim().toUpperCase();
  return PER_100ML_GROUPS.has(g) || g.startsWith("Q")
    ? "per_100ml"
    : "per_100g";
}

/** Rule 7: food code 13-669 appears twice in the 2021 workbook; later duplicates get a letter suffix. */
export function dedupeCodes(codes: string[]): string[] {
  const seen = new Map<string, number>();
  return codes.map((code) => {
    const n = seen.get(code) ?? 0;
    seen.set(code, n + 1);
    if (n === 0) return code;
    return `${code}${String.fromCharCode(96 + n + 1)}`; // 13-669 → 13-669b for the second occurrence
  });
}

/** Rule 7 companion: the first occurrence also gets 'a' when a duplicate exists, so both are explicit. */
export function dedupeCodesExplicit(codes: string[]): string[] {
  const counts = new Map<string, number>();
  for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
  const seen = new Map<string, number>();
  return codes.map((code) => {
    if ((counts.get(code) ?? 0) < 2) return code;
    const n = seen.get(code) ?? 0;
    seen.set(code, n + 1);
    return `${code}${String.fromCharCode(97 + n)}`;
  });
}

/** Rule 8: foods without an energy value keep kcal null; never derive energy from macros. */
export function energyOrNull(kcal: ParsedCell): number | null {
  return kcal.kind === "value" ? kcal.value : null;
}

/** The INFOODS-style nutrient tags we keep, mapped to our column names. */
export const NUTRIENT_COLUMNS = {
  KCALS: "kcal",
  KJ: "kj",
  PROT: "protein_g",
  FAT: "fat_g",
  SATFOD: "satfat_g",
  CHO: "carb_mono_g",
  TOTSUG: "sugars_mono_g",
  AOACFIB: "fibre_aoac_g",
  NSP: "fibre_nsp_g",
  NA: "sodium_mg",
  FE: "iron_mg",
  CA: "calcium_mg",
  VITC: "vit_c_mg",
} as const;

export type NutrientTag = keyof typeof NUTRIENT_COLUMNS;

export type FoodRow = {
  code: string;
  name: string;
  foodGroup: string | null;
  basis: "per_100g" | "per_100ml";
  kcal: number | null;
  kj: number | null;
  protein_g: number | null;
  fat_g: number | null;
  satfat_g: number | null;
  carb_g: number | null;
  sugars_g: number | null;
  fibre_aoac_g: number | null;
  fibre_nsp_g: number | null;
  sodium_mg: number | null;
  salt_g: number | null;
  iron_mg: number | null;
  calcium_mg: number | null;
  vit_c_mg: number | null;
  traceTags: string[];
  missingTags: string[];
};

/** Build one stored row from the raw cells of a food across the joined sheets. */
export function buildFoodRow(input: {
  code: string;
  name: string;
  foodGroup: string | null;
  cells: Partial<Record<NutrientTag, CellValue>>;
}): FoodRow {
  const traceTags: string[] = [];
  const missingTags: string[] = [];
  const num = (tag: NutrientTag): number | null => {
    const p = parseCell(input.cells[tag]);
    if (p.kind === "trace") {
      traceTags.push(tag);
      return 0;
    }
    if (p.kind === "missing") {
      missingTags.push(tag);
      return null;
    }
    return p.value;
  };
  const carbMono = num("CHO");
  const sugMono = num("TOTSUG");
  const sodium = num("NA");
  return {
    code: input.code,
    name: input.name.trim(),
    foodGroup: input.foodGroup,
    basis: basisForGroup(input.foodGroup),
    kcal: energyOrNull(parseCell(input.cells.KCALS)),
    kj: num("KJ"),
    protein_g: num("PROT"),
    fat_g: num("FAT"),
    satfat_g: num("SATFOD"),
    carb_g: carbMono === null ? null : monoToWeight(carbMono),
    sugars_g: sugMono === null ? null : monoToWeight(sugMono),
    fibre_aoac_g: num("AOACFIB"),
    fibre_nsp_g: num("NSP"),
    sodium_mg: sodium,
    salt_g: sodium === null ? null : sodiumMgToSaltG(sodium),
    iron_mg: num("FE"),
    calcium_mg: num("CA"),
    vit_c_mg: num("VITC"),
    traceTags,
    missingTags,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
