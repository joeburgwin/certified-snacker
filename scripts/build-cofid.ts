/**
 * Convert the CoFID 2021 workbook (GOV.UK, OGL v3) into data/cofid-2021.json.
 * Usage: pnpm tsx scripts/build-cofid.ts <workbook.xlsx> [out.json]
 * Runs where GOV.UK is reachable (GitHub Action `build-cofid.yml` or a laptop); the sandbox cannot download it.
 * The sheet names and header offsets below are the 2021 edition's; the script fails loudly if they drift.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import ExcelJS from "exceljs";
import {
  buildFoodRow,
  type CellValue,
  dedupeCodesExplicit,
  type FoodRow,
  type NutrientTag,
} from "../src/domain/cofid-rules";

const SHEETS = {
  proximates: "1.3 Proximates",
  inorganics: "1.4 Inorganics",
  vitamins: "1.5 Vitamins",
} as const;
const TAGS: NutrientTag[] = [
  "KCALS",
  "KJ",
  "PROT",
  "FAT",
  "SATFOD",
  "CHO",
  "TOTSUG",
  "AOACFIB",
  "NSP",
  "NA",
  "FE",
  "CA",
  "VITC",
];

type SheetIndex = {
  byCode: Map<string, Record<string, CellValue>>;
  name: string;
};

function cellValue(c: ExcelJS.Cell): CellValue {
  const v = c.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "object" && "result" in v)
    return (v as ExcelJS.CellFormulaValue).result as CellValue;
  if (typeof v === "object" && "richText" in v)
    return (v as ExcelJS.CellRichTextValue).richText
      .map((r) => r.text)
      .join("");
  return String(v);
}

/** Find the header row (the one containing 'Food Code') and index rows by food code using the tagname row beneath it. */
function indexSheet(ws: ExcelJS.Worksheet): SheetIndex {
  let headerRow = -1;
  ws.eachRow((row, n) => {
    if (
      headerRow === -1 &&
      row.values &&
      JSON.stringify(row.values).includes("Food Code")
    )
      headerRow = n;
  });
  if (headerRow === -1)
    throw new Error(
      `Sheet ${ws.name}: could not find the 'Food Code' header row`,
    );
  // CoFID puts human headers on one row and INFOODS tagnames on the next; detect which row holds tags like KCALS.
  const tagRowNumber =
    [headerRow, headerRow + 1, headerRow + 2].find((n) =>
      JSON.stringify(ws.getRow(n).values).match(/\b(KCALS|PROT|NA|FE)\b/),
    ) ?? headerRow;
  const tagRow = ws.getRow(tagRowNumber);
  const colByTag = new Map<string, number>();
  tagRow.eachCell((cell, col) => {
    const v = cellValue(cell);
    if (typeof v === "string" && v.trim()) colByTag.set(v.trim(), col);
  });
  const header = ws.getRow(headerRow);
  header.eachCell((cell, col) => {
    const v = cellValue(cell);
    if (typeof v === "string" && v.trim()) colByTag.set(v.trim(), col);
  });
  const codeCol = colByTag.get("Food Code") ?? 1;
  const byCode = new Map<string, Record<string, CellValue>>();
  for (let n = Math.max(headerRow, tagRowNumber) + 1; n <= ws.rowCount; n++) {
    const row = ws.getRow(n);
    const code = cellValue(row.getCell(codeCol));
    if (typeof code !== "string" || !/^\d{2}-\d{3}/.test(code.trim())) continue; // skip footnotes and blanks
    const rec: Record<string, CellValue> = {};
    for (const [tag, col] of colByTag) rec[tag] = cellValue(row.getCell(col));
    byCode.set(code.trim(), rec);
  }
  return { byCode, name: ws.name };
}

async function main() {
  const [, , input, output = "data/cofid-2021.json"] = process.argv;
  if (!input)
    throw new Error("usage: build-cofid.ts <workbook.xlsx> [out.json]");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(input);
  const get = (name: string) => {
    const ws = wb.getWorksheet(name);
    if (!ws)
      throw new Error(
        `Missing sheet '${name}'. Sheets: ${wb.worksheets.map((w) => w.name).join(", ")}`,
      );
    return indexSheet(ws);
  };
  const prox = get(SHEETS.proximates);
  const inorg = get(SHEETS.inorganics);
  const vits = get(SHEETS.vitamins);

  const codes = [...prox.byCode.keys()];
  const uniqueCodes = dedupeCodesExplicit(codes);
  const rows: FoodRow[] = codes.map((code, i) => {
    const p = prox.byCode.get(code) ?? {};
    const cells: Partial<Record<NutrientTag, CellValue>> = {};
    for (const tag of TAGS) {
      cells[tag] =
        p[tag] ??
        inorg.byCode.get(code)?.[tag] ??
        vits.byCode.get(code)?.[tag] ??
        null;
    }
    return buildFoodRow({
      code: uniqueCodes[i] ?? code,
      name: String(p["Food Name"] ?? ""),
      foodGroup: p.Group ? String(p.Group) : null,
      cells,
    });
  });
  if (rows.length < 2500)
    throw new Error(
      `Only ${rows.length} foods parsed; expected ~2,887. Check sheet layout.`,
    );

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify({
      source: "cofid-2021",
      licence: "OGL-UK-3.0",
      count: rows.length,
      foods: rows,
    }),
  );
  writeFileSync(
    "data/ATTRIBUTION.md",
    "# Data attribution\n\n- `cofid-2021.json`: McCance and Widdowson's Composition of Foods Integrated Dataset (CoFID) 2021, Public Health England / OHID. Contains public sector information licensed under the Open Government Licence v3.0.\n",
  );
  const energyless = rows.filter((r) => r.kcal === null).length;
  console.log(
    `[build-cofid] ${rows.length} foods written to ${output} (${energyless} without energy)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
