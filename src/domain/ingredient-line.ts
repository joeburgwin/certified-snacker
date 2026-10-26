import {
  parseIngredient,
  type UnitOfMeasureDefinitions,
} from "parse-ingredient";
import { cleanLine, lineKey, nameKey } from "./normalise";
import { normaliseUnit } from "./units";

export type ParsedLine = {
  rawText: string;
  quantity: number | null;
  quantityMax: number | null;
  /** canonical unit code or null */
  unit: string | null;
  /** cleaned ingredient name without preparation notes */
  nameNormalised: string;
  /** household vocabulary key */
  nameKey: string;
  preparation: string | null;
  isOptional: boolean;
  lineKey: string;
};

export type ParsedGroup = { groupName: string | null; lines: ParsedLine[] };

/** UK units parse-ingredient does not know. */
const EXTRA_UOMS: UnitOfMeasureDefinitions = {
  dessertspoon: {
    short: "dsp",
    plural: "dessertspoons",
    alternates: ["dsp", "dsp.", "dessert spoon"],
    type: "volume",
  },
  tin: { short: "tin", plural: "tins", alternates: [], type: "count" },
  rasher: { short: "rasher", plural: "rashers", alternates: [], type: "count" },
  fillet: { short: "fillet", plural: "fillets", alternates: [], type: "count" },
  breast: { short: "breast", plural: "breasts", alternates: [], type: "count" },
  thigh: { short: "thigh", plural: "thighs", alternates: [], type: "count" },
  slice: { short: "slice", plural: "slices", alternates: [], type: "count" },
  handful: {
    short: "handful",
    plural: "handfuls",
    alternates: [],
    type: "count",
  },
  stalk: {
    short: "stalk",
    plural: "stalks",
    alternates: ["rib", "ribs"],
    type: "count",
  },
  leaf: { short: "leaf", plural: "leaves", alternates: [], type: "count" },
  sheet: { short: "sheet", plural: "sheets", alternates: [], type: "count" },
  sachet: { short: "sachet", plural: "sachets", alternates: [], type: "count" },
  jar: { short: "jar", plural: "jars", alternates: [], type: "count" },
};

const PACKAGING_PREFIX =
  /^(?:tins?|cans?|jars?|packs?|packets?|bags?|boxes|box|cartons?|bottles?|sachets?)\s+(?:of\s+)?/i;
const OPTIONAL_RE = /\boptional\b/i;

function splitPreparation(description: string): {
  name: string;
  preparation: string | null;
} {
  // "garlic, crushed" → name garlic, prep crushed; "(optional)" and trailing notes removed from the name.
  const noParens = description
    .replace(/\((.*?)\)/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
  const [first, ...rest] = noParens.split(/\s*[,;]\s*/);
  let name = (first ?? "").trim();
  const prepParts = rest.map((p) => p.trim()).filter(Boolean);
  // "finely chopped onion" style: move leading past-participle phrases into preparation
  const lead = name.match(
    /^((?:finely |roughly |thinly |thickly |freshly )?(?:chopped|diced|sliced|grated|crushed|minced|ground|melted|softened|beaten|peeled|cooked|toasted|shredded|mashed|frozen|tinned|canned|dried|fresh)\s+)+/i,
  );
  if (
    lead &&
    lead[0].trim().toLowerCase() !== "fresh" &&
    lead[0].trim().toLowerCase() !== "dried"
  ) {
    prepParts.unshift(lead[0].trim());
    name = name.slice(lead[0].length);
  }
  name = name
    .replace(OPTIONAL_RE, "")
    .replace(/\s+/g, " ")
    .replace(/^(of|the)\s+/i, "")
    .trim();
  name = name
    .replace(/\s+(to taste|for serving|to serve|for garnish|as needed)$/i, "")
    .trim();
  const preparation = prepParts
    .filter((p) => !OPTIONAL_RE.test(p) || p.replace(OPTIONAL_RE, "").trim())
    .map((p) => p.replace(OPTIONAL_RE, "").trim())
    .filter(Boolean)
    .join(", ");
  return { name, preparation: preparation || null };
}

/** Deterministic parse of one ingredient line. Never throws; unknown units become null. */
export function parseIngredientLine(
  raw: string,
): ParsedLine & { isGroupHeader: boolean } {
  const cleaned = cleanLine(raw);
  const [parsed] = parseIngredient(cleaned, {
    normalizeUOM: true,
    additionalUOMs: EXTRA_UOMS,
    allowLeadingOf: true,
  });
  if (!parsed) {
    return {
      rawText: raw.trim(),
      quantity: null,
      quantityMax: null,
      unit: null,
      nameNormalised: cleaned,
      nameKey: nameKey(cleaned),
      preparation: null,
      isOptional: OPTIONAL_RE.test(cleaned),
      lineKey: lineKey(raw),
      isGroupHeader: false,
    };
  }
  let description = parsed.description.replace(PACKAGING_PREFIX, "");
  // parse-ingredient leaves "x 400 g tins chickpeas" when multipliers survive cleanLine; drop a stray leading "x"
  description = description.replace(/^x\s+/i, "");
  const { name, preparation } = splitPreparation(description);
  const unit = normaliseUnit(parsed.unitOfMeasureID ?? parsed.unitOfMeasure);
  let quantity = parsed.quantity;
  let quantityMax = parsed.quantity2;
  let unitCode: string | null = unit?.code ?? null;
  if (unit?.code === "dozen" && quantity !== null) {
    quantity *= 12;
    if (quantityMax !== null) quantityMax *= 12;
    unitCode = "each";
  }
  if (unit?.code === "each") unitCode = quantity === null ? null : "each";
  if (!unitCode && quantity !== null) unitCode = "each";
  const isOptional = OPTIONAL_RE.test(cleaned);
  return {
    rawText: raw.trim(),
    quantity,
    quantityMax,
    unit: unitCode,
    nameNormalised: name || description.trim(),
    nameKey: nameKey(name || description),
    preparation,
    isOptional,
    lineKey: lineKey(raw),
    isGroupHeader: parsed.isGroupHeader,
  };
}

/** Parse a block of lines (one per row) into groups; headers like "For the sauce:" start a group. */
export function parseIngredientBlock(text: string): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  let current: ParsedGroup = { groupName: null, lines: [] };
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const line = parseIngredientLine(raw);
    const looksLikeHeader =
      line.isGroupHeader ||
      (/[:：]\s*$/.test(raw.trim()) && line.quantity === null);
    if (looksLikeHeader) {
      if (current.lines.length || current.groupName) groups.push(current);
      current = {
        groupName: raw
          .trim()
          .replace(/^(?:for|to)\s+(?:the\s+)?/i, "")
          .replace(/[:：]\s*$/, "")
          .trim(),
        lines: [],
      };
      continue;
    }
    const { isGroupHeader: _ignored, ...rest } = line;
    current.lines.push(rest);
  }
  if (current.lines.length || current.groupName) groups.push(current);
  return groups;
}
