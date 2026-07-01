import { appendRow, batchUpdateRanges, getRows, quoteSheetName } from "./sheets-po";
import type { Item } from "./types-po";

const SHEET_NAME = "4.Item";

function rowToItem(row: string[]): Item {
  return {
    code: row[0] ?? "",
    name: row[1] ?? "",
    supplierName: row[2] ?? "",
    unit: row[3] ?? "",
    price: row[4] ?? "",
    isServiceFee: row[5] ?? "",
    vat: row[6] ?? "",
    priceExclVat: row[7] ?? "",
    vatPerUnit: row[8] ?? "",
    priceInclVat: row[9] ?? "",
    supplierSku: row[10] ?? "",
    note: row[11] ?? "",
  };
}

function nextItemCode(existing: Item[]): string {
  let max = 0;
  for (const i of existing) {
    const m = /^ITM-(\d+)$/.exec(i.code.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `ITM-${String(max + 1).padStart(5, "0")}`;
}

export async function listItems(
  search?: string,
  supplierName?: string
): Promise<Item[]> {
  const rows = await getRows(SHEET_NAME);
  const dataRows = rows.slice(1); // skip header row
  let items = dataRows.filter((r) => r[0]).map(rowToItem);
  if (supplierName) {
    items = items.filter((i) => i.supplierName === supplierName);
  }
  const q = search?.trim().toLowerCase();
  if (q) {
    items = items.filter((i) =>
      [i.name, i.supplierName, i.code].join(" ").toLowerCase().includes(q)
    );
  }
  return items;
}

export type NewItemInput = Pick<
  Item,
  "name" | "supplierName" | "unit" | "price" | "isServiceFee" | "vat" | "supplierSku" | "note"
>;

export type UpdateItemInput = {
  name?: string;
  unit?: string;
  price?: string;
  supplierSku?: string;
  note?: string;
};

export async function updateItem(code: string, patch: UpdateItemInput): Promise<void> {
  const rows = await getRows(SHEET_NAME);
  const rowNum = rows.findIndex((r, i) => i > 0 && (r[0] ?? "").trim() === code.trim());
  if (rowNum === -1) throw new Error(`ไม่พบสินค้า ${code}`);
  const sheetRow = rowNum + 1;
  const row = rows[rowNum];
  const q = quoteSheetName(SHEET_NAME);
  const updates: { range: string; values: (string | number | boolean)[][] }[] = [];

  if (patch.name !== undefined) {
    updates.push({ range: `${q}!B${sheetRow}`, values: [[patch.name]] });
  }
  if (patch.unit !== undefined) {
    updates.push({ range: `${q}!D${sheetRow}`, values: [[patch.unit]] });
  }
  if (patch.price !== undefined) {
    const p = patch.price;
    const isServiceFee = row[5] ?? "FALSE";
    const vat = row[6] ?? "";
    updates.push({ range: `${q}!E${sheetRow}:J${sheetRow}`, values: [[p, isServiceFee, vat, p, "0", p]] });
  }
  if (patch.supplierSku !== undefined) {
    updates.push({ range: `${q}!K${sheetRow}`, values: [[patch.supplierSku]] });
  }
  if (patch.note !== undefined) {
    updates.push({ range: `${q}!L${sheetRow}`, values: [[patch.note]] });
  }

  if (updates.length > 0) await batchUpdateRanges(updates);
}

export async function addItem(input: NewItemInput): Promise<Item> {
  const existing = await listItems();
  const code = nextItemCode(existing);
  const price = input.price || "0";
  // No VAT info provided -> exc/inc VAT mirror the base price, matching existing rows.
  const priceExclVat = price;
  const vatPerUnit = "0";
  const priceInclVat = price;
  const row: Item = {
    code,
    name: input.name,
    supplierName: input.supplierName,
    unit: input.unit,
    price,
    isServiceFee: input.isServiceFee || "FALSE",
    vat: input.vat || "",
    priceExclVat,
    vatPerUnit,
    priceInclVat,
    supplierSku: input.supplierSku || "",
    note: input.note || "",
  };
  await appendRow(SHEET_NAME, [
    row.code,
    row.name,
    row.supplierName,
    row.unit,
    row.price,
    row.isServiceFee,
    row.vat,
    row.priceExclVat,
    row.vatPerUnit,
    row.priceInclVat,
    row.supplierSku,
    row.note,
  ]);
  return row;
}
