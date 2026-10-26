/** Text normalisation shared by parsing, matching and the ingredient vocabulary. */

const FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

/** Clean one raw ingredient line: bullets, unicode fractions, whitespace, "2 x 400 g" multipliers. */
export function cleanLine(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim();
  s = s.replace(/^[-•*·•▪●]+\s*/, "");
  s = s
    .replace(/[½⅓⅔¼¾⅕⅛⅜⅝⅞]/g, (ch) => ` ${FRACTIONS[ch] ?? ch} `)
    .replace(/\s+/g, " ")
    .trim();
  // "1 1/2" stays; "1/2" fine. Join a whole number and a fraction glued by the replacement above.
  s = s.replace(/(\d)\s+(\d\/\d)/g, "$1 $2");
  // "2 x 400 g tins chickpeas" → "800 g tins chickpeas"
  s = s.replace(
    /^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i,
    (_m, n, q, u) => {
      const total = Number(n) * Number(q);
      return `${Number.isInteger(total) ? total : total.toFixed(2)} ${u}`;
    },
  );
  return s;
}

/** Stable key for caching a parsed line: lowercase, punctuation-free, single-spaced. */
export function lineKey(raw: string): string {
  return cleanLine(raw)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** US → UK vocabulary applied to ingredient names before keying. Longest phrases first. */
const UK_ALIASES: Array<[RegExp, string]> = [
  [/\ball[- ]purpose flour\b/g, "plain flour"],
  [/\bconfectioners'? sugar\b/g, "icing sugar"],
  [/\bpowdered sugar\b/g, "icing sugar"],
  [/\bsuperfine sugar\b/g, "caster sugar"],
  [/\bheavy cream\b/g, "double cream"],
  [/\bwhipping cream\b/g, "double cream"],
  [/\bhalf[- ]and[- ]half\b/g, "single cream"],
  [/\bground beef\b/g, "beef mince"],
  [/\bground pork\b/g, "pork mince"],
  [/\bground lamb\b/g, "lamb mince"],
  [/\bground turkey\b/g, "turkey mince"],
  [/\bbell peppers?\b/g, "pepper"],
  [/\bgarbanzo beans?\b/g, "chickpea"],
  [/\bsnow peas?\b/g, "mangetout"],
  [/\bcanola oil\b/g, "rapeseed oil"],
  [/\bbaking soda\b/g, "bicarbonate of soda"],
  [/\bcornstarch\b/g, "cornflour"],
  [/\bcilantro\b/g, "coriander"],
  [/\beggplants?\b/g, "aubergine"],
  [/\bzucchinis?\b/g, "courgette"],
  [/\bscallions?\b/g, "spring onion"],
  [/\bgreen onions?\b/g, "spring onion"],
  [/\barugula\b/g, "rocket"],
  [/\bshrimps?\b/g, "prawn"],
  [/\bfava beans?\b/g, "broad bean"],
  [/\bromaine\b/g, "cos lettuce"],
  [/\brutabagas?\b/g, "swede"],
  [/\bmolasses\b/g, "treacle"],
  [/\bbroiler\b/g, "grill"],
];

const IRREGULAR_SINGULAR: Record<string, string> = {
  leaves: "leaf",
  tomatoes: "tomato",
  potatoes: "potato",
  chillies: "chilli",
  chilies: "chilli",
  anchovies: "anchovy",
  berries: "berry",
  cherries: "cherry",
  strawberries: "strawberry",
  raspberries: "raspberry",
  blueberries: "blueberry",
  radishes: "radish",
  peaches: "peach",
  mangoes: "mango",
  avocados: "avocado",
  hummus: "hummus",
  couscous: "couscous",
  oats: "oats",
  lentils: "lentils",
  peas: "peas",
  chickpeas: "chickpeas",
  noodles: "noodles",
  greens: "greens",
  sprouts: "sprouts",
  beans: "beans",
  molasses: "treacle",
  asparagus: "asparagus",
  watercress: "watercress",
  bass: "bass",
};

/** Very small English singulariser tuned for food words. */
export function singularise(word: string): string {
  const w = word.toLowerCase();
  if (IRREGULAR_SINGULAR[w]) return IRREGULAR_SINGULAR[w];
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(ch|sh|ss|x|z|o)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("ss") || w.endsWith("us")) return w;
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/**
 * Canonical household vocabulary key: lowercase, UK-aliased, punctuation-free, last word singularised.
 * "Cherry Tomatoes" → "cherry tomato"; "scallions" → "spring onion"; "Greek yoghurt" → "greek yoghurt".
 */
export function nameKey(name: string): string {
  let s = name.toLowerCase().replace(/\(.*?\)/g, " ");
  for (const [re, to] of UK_ALIASES) s = s.replace(re, to);
  s = s
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = s.split(" ").filter(Boolean);
  if (words.length === 0) return "";
  const last = words[words.length - 1] as string;
  words[words.length - 1] = singularise(last);
  return words.join(" ");
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
