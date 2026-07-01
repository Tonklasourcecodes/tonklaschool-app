import { appendRow, batchUpdateRanges, getRows, quoteSheetName } from "./sheets-po";
import type { Supplier } from "./types-po";

const SHEET_NAME = "2.Supplier";

function rowToSupplier(row: string[]): Supplier {
  return {
    code: row[0] ?? "",
    prefix: row[1] ?? "",
    name: row[2] ?? "",
    productOrService: row[3] ?? "",
    category: row[4] ?? "",
    details: row[5] ?? "",
    contact1Name: row[6] ?? "",
    phone1: row[7] ?? "",
    contact2Name: row[8] ?? "",
    phone2: row[9] ?? "",
    lineId: row[10] ?? "",
    buildingName: row[11] ?? "",
    houseNo: row[12] ?? "",
    moo: row[13] ?? "",
    soi: row[14] ?? "",
    road: row[15] ?? "",
    tambon: row[16] ?? "",
    amphoe: row[17] ?? "",
    province: row[18] ?? "",
    zipcode: row[19] ?? "",
    fullAddress: row[20] ?? "",
    orderCount: row[21] ?? "",
    blacklist: row[22] ?? "",
    blacklistReason: row[23] ?? "",
  };
}

function buildFullAddress(s: Partial<Supplier>): string {
  const parts = [
    s.buildingName,
    s.houseNo,
    s.moo ? `ม.${s.moo}` : "",
    s.soi ? `ซ.${s.soi}` : "",
    s.road ? `ถ.${s.road}` : "",
    s.tambon ? `ต.${s.tambon}` : "",
    s.amphoe ? `อ.${s.amphoe}` : "",
    s.province ? `จ.${s.province}` : "",
  ].filter(Boolean);
  return parts.join(" ");
}

function nextSupplierCode(existing: Supplier[]): string {
  let max = 0;
  for (const s of existing) {
    const m = /^SP-(\d+)$/.exec(s.code.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `SP-${String(max + 1).padStart(3, "0")}`;
}

export async function listSuppliers(search?: string): Promise<Supplier[]> {
  const rows = await getRows(SHEET_NAME);
  const dataRows = rows.slice(1); // skip header row
  const suppliers = dataRows.filter((r) => r[0]).map(rowToSupplier);
  if (!search) return suppliers;
  const q = search.trim().toLowerCase();
  if (!q) return suppliers;
  return suppliers.filter((s) =>
    [s.name, s.category, s.productOrService, s.details, s.code]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

export type NewSupplierInput = Omit<
  Supplier,
  "code" | "fullAddress" | "orderCount" | "blacklist" | "blacklistReason"
>;

export type UpdateSupplierInput = {
  name?: string;
  category?: string;
  contact1Name?: string;
  phone1?: string;
  lineId?: string;
  province?: string;
};

export async function updateSupplier(code: string, patch: UpdateSupplierInput): Promise<void> {
  const rows = await getRows(SHEET_NAME);
  const rowNum = rows.findIndex((r, i) => i > 0 && (r[0] ?? "").trim() === code.trim());
  if (rowNum === -1) throw new Error(`ไม่พบผู้จัดหา ${code}`);
  const sheetRow = rowNum + 1;
  const q = quoteSheetName(SHEET_NAME);
  const updates: { range: string; values: (string | number | boolean)[][] }[] = [];

  if (patch.name !== undefined)
    updates.push({ range: `${q}!C${sheetRow}`, values: [[patch.name]] });
  if (patch.category !== undefined)
    updates.push({ range: `${q}!E${sheetRow}`, values: [[patch.category]] });
  if (patch.contact1Name !== undefined)
    updates.push({ range: `${q}!G${sheetRow}`, values: [[patch.contact1Name]] });
  if (patch.phone1 !== undefined)
    updates.push({ range: `${q}!H${sheetRow}`, values: [[patch.phone1]] });
  if (patch.lineId !== undefined)
    updates.push({ range: `${q}!K${sheetRow}`, values: [[patch.lineId]] });
  if (patch.province !== undefined)
    updates.push({ range: `${q}!S${sheetRow}`, values: [[patch.province]] });

  if (updates.length > 0) await batchUpdateRanges(updates);
}

export async function addSupplier(input: NewSupplierInput): Promise<Supplier> {
  const existing = await listSuppliers();
  const code = nextSupplierCode(existing);
  const fullAddress = buildFullAddress(input);
  const row: Supplier = {
    code,
    ...input,
    fullAddress,
    orderCount: "0",
    blacklist: "FALSE",
    blacklistReason: "",
  };
  await appendRow(SHEET_NAME, [
    row.code,
    row.prefix,
    row.name,
    row.productOrService,
    row.category,
    row.details,
    row.contact1Name,
    row.phone1,
    row.contact2Name,
    row.phone2,
    row.lineId,
    row.buildingName,
    row.houseNo,
    row.moo,
    row.soi,
    row.road,
    row.tambon,
    row.amphoe,
    row.province,
    row.zipcode,
    row.fullAddress,
    row.orderCount,
    row.blacklist,
    row.blacklistReason,
  ]);
  return row;
}
