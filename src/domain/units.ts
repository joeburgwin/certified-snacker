/**
 * Unit families and conversions for shopping aggregation.
 * mass → grams, volume → millilitres, count → a label (clove, tin, slice …).
 * UK conventions: tbsp 15 ml, tsp 5 ml, dsp 10 ml, cup 240 ml, fl oz 28.4 ml, pint 568 ml.
 */

export type UnitFamily = "mass" | "volume" | "count";

export type UnitInfo = {
  /** canonical code stored in recipe_ingredient.unit */
  code: string;
  family: UnitFamily;
  /** multiply a quantity by this to get the base unit (g, ml); 1 for count */
  toBase: number;
  /** singular display label */
  label: string;
  plural: string;
};

type Def = {
  family: UnitFamily;
  toBase: number;
  label: string;
  plural: string;
  aliases: string[];
};

const DEFS: Record<string, Def> = {
  g: {
    family: "mass",
    toBase: 1,
    label: "g",
    plural: "g",
    aliases: ["gram", "grams", "gr", "g."],
  },
  kg: {
    family: "mass",
    toBase: 1000,
    label: "kg",
    plural: "kg",
    aliases: ["kilogram", "kilograms", "kilo", "kilos"],
  },
  mg: {
    family: "mass",
    toBase: 0.001,
    label: "mg",
    plural: "mg",
    aliases: ["milligram", "milligrams"],
  },
  oz: {
    family: "mass",
    toBase: 28.35,
    label: "oz",
    plural: "oz",
    aliases: ["ounce", "ounces", "oz."],
  },
  lb: {
    family: "mass",
    toBase: 453.6,
    label: "lb",
    plural: "lb",
    aliases: ["pound", "pounds", "lbs"],
  },
  ml: {
    family: "volume",
    toBase: 1,
    label: "ml",
    plural: "ml",
    aliases: ["millilitre", "milliliter", "millilitres", "milliliters", "mls"],
  },
  l: {
    family: "volume",
    toBase: 1000,
    label: "l",
    plural: "l",
    aliases: ["litre", "liter", "litres", "liters", "ltr"],
  },
  dl: {
    family: "volume",
    toBase: 100,
    label: "dl",
    plural: "dl",
    aliases: ["decilitre", "deciliter"],
  },
  tsp: {
    family: "volume",
    toBase: 5,
    label: "tsp",
    plural: "tsp",
    aliases: ["teaspoon", "teaspoons", "t", "tsps"],
  },
  tbsp: {
    family: "volume",
    toBase: 15,
    label: "tbsp",
    plural: "tbsp",
    aliases: ["tablespoon", "tablespoons", "tbs", "tbsps", "tbl"],
  },
  dsp: {
    family: "volume",
    toBase: 10,
    label: "dsp",
    plural: "dsp",
    aliases: ["dessertspoon", "dessertspoons", "dessert spoon"],
  },
  cup: {
    family: "volume",
    toBase: 240,
    label: "cup",
    plural: "cups",
    aliases: ["cups", "c"],
  },
  floz: {
    family: "volume",
    toBase: 28.4,
    label: "fl oz",
    plural: "fl oz",
    aliases: ["fluid ounce", "fluid ounces", "fl. oz", "fl.oz"],
  },
  pint: {
    family: "volume",
    toBase: 568,
    label: "pint",
    plural: "pints",
    aliases: ["pints", "pt"],
  },
  quart: {
    family: "volume",
    toBase: 1136,
    label: "quart",
    plural: "quarts",
    aliases: ["quarts", "qt"],
  },
  gallon: {
    family: "volume",
    toBase: 4546,
    label: "gallon",
    plural: "gallons",
    aliases: ["gallons", "gal"],
  },
  each: {
    family: "count",
    toBase: 1,
    label: "",
    plural: "",
    aliases: [
      "piece",
      "pieces",
      "whole",
      "large",
      "medium",
      "small",
      "x",
      "ea",
    ],
  },
  clove: {
    family: "count",
    toBase: 1,
    label: "clove",
    plural: "cloves",
    aliases: ["cloves"],
  },
  slice: {
    family: "count",
    toBase: 1,
    label: "slice",
    plural: "slices",
    aliases: ["slices"],
  },
  tin: {
    family: "count",
    toBase: 1,
    label: "tin",
    plural: "tins",
    aliases: ["tins", "can", "cans"],
  },
  jar: {
    family: "count",
    toBase: 1,
    label: "jar",
    plural: "jars",
    aliases: ["jars"],
  },
  pack: {
    family: "count",
    toBase: 1,
    label: "pack",
    plural: "packs",
    aliases: [
      "packs",
      "packet",
      "packets",
      "package",
      "packages",
      "bag",
      "bags",
      "box",
      "boxes",
      "carton",
      "cartons",
      "container",
      "containers",
    ],
  },
  bunch: {
    family: "count",
    toBase: 1,
    label: "bunch",
    plural: "bunches",
    aliases: ["bunches"],
  },
  sprig: {
    family: "count",
    toBase: 1,
    label: "sprig",
    plural: "sprigs",
    aliases: ["sprigs"],
  },
  handful: {
    family: "count",
    toBase: 1,
    label: "handful",
    plural: "handfuls",
    aliases: ["handfuls"],
  },
  pinch: {
    family: "count",
    toBase: 1,
    label: "pinch",
    plural: "pinches",
    aliases: ["pinches", "dash", "dashes", "drop", "drops"],
  },
  stalk: {
    family: "count",
    toBase: 1,
    label: "stalk",
    plural: "stalks",
    aliases: ["stalks", "stick", "sticks", "rib", "ribs"],
  },
  rasher: {
    family: "count",
    toBase: 1,
    label: "rasher",
    plural: "rashers",
    aliases: ["rashers"],
  },
  fillet: {
    family: "count",
    toBase: 1,
    label: "fillet",
    plural: "fillets",
    aliases: ["fillets"],
  },
  breast: {
    family: "count",
    toBase: 1,
    label: "breast",
    plural: "breasts",
    aliases: ["breasts"],
  },
  thigh: {
    family: "count",
    toBase: 1,
    label: "thigh",
    plural: "thighs",
    aliases: ["thighs"],
  },
  leaf: {
    family: "count",
    toBase: 1,
    label: "leaf",
    plural: "leaves",
    aliases: ["leaves"],
  },
  head: {
    family: "count",
    toBase: 1,
    label: "head",
    plural: "heads",
    aliases: ["heads"],
  },
  sheet: {
    family: "count",
    toBase: 1,
    label: "sheet",
    plural: "sheets",
    aliases: ["sheets"],
  },
  sachet: {
    family: "count",
    toBase: 1,
    label: "sachet",
    plural: "sachets",
    aliases: ["sachets"],
  },
  dozen: {
    family: "count",
    toBase: 12,
    label: "",
    plural: "",
    aliases: ["dozens"],
  },
};

const ALIAS_INDEX: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [code, def] of Object.entries(DEFS)) {
    m.set(code, code);
    for (const a of def.aliases) m.set(a.toLowerCase(), code);
  }
  return m;
})();

export function unitInfo(code: string): UnitInfo | null {
  const d = DEFS[code];
  return d
    ? {
        code,
        family: d.family,
        toBase: d.toBase,
        label: d.label,
        plural: d.plural,
      }
    : null;
}

/** Map any spelling (or a parse-ingredient unitOfMeasureID) to a canonical unit; null when unknown. */
export function normaliseUnit(raw: string | null | undefined): UnitInfo | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\.$/, "");
  const code = ALIAS_INDEX.get(key);
  return code ? unitInfo(code) : null;
}

export const UNIT_CODES = Object.keys(DEFS);

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/**
 * Human quantity for a list row. Mass: < 100 g to 5 g, < 1 kg to 10 g, then kg to 2 dp.
 * Volume: the same with ml / l. Count: nearest 0.5 with a pluralised label.
 */
export function formatQuantity(input: {
  family: UnitFamily | null;
  qtyBase: number;
  countLabel?: string | null;
  hasUnknownQty?: boolean;
}): string {
  const { family, qtyBase, countLabel, hasUnknownQty } = input;
  let text: string;
  if (family === "mass") {
    text =
      qtyBase >= 1000
        ? `${trimNumber(qtyBase / 1000)} kg`
        : qtyBase > 0
          ? `${roundTo(qtyBase, qtyBase < 100 ? 5 : 10) || 5} g`
          : "";
  } else if (family === "volume") {
    text =
      qtyBase >= 1000
        ? `${trimNumber(qtyBase / 1000)} l`
        : qtyBase > 0
          ? `${roundTo(qtyBase, qtyBase < 100 ? 5 : 10) || 5} ml`
          : "";
  } else if (family === "count") {
    const n = roundTo(qtyBase, 0.5);
    const label = countLabel
      ? n === 1
        ? countLabel
        : (unitInfo(countLabel)?.plural ?? `${countLabel}s`)
      : "";
    text = n > 0 ? `${trimNumber(n)}${label ? ` ${label}` : ""}` : "";
  } else {
    text = "";
  }
  if (hasUnknownQty) return text ? `${text} + some` : "some";
  return text || "—";
}
