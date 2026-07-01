import { safeWriteRanges, getRows, quoteSheetName, updateCells } from "./sheets-po";
import type { JO, JOOrder, NewJOInput, UpdateJOInput } from "./types-po";
import { getLineUserIdByName } from "./roles";
import { sendFlexMessage, buildApprovalFlex } from "./line";

const JO_SHEET = "9.JO";
const JO_ORDER_SHEET = "10.JO_order";

function rowToJO(row: string[]): JO {
  return {
    joNumber: row[0] ?? "",
    supplierName: row[1] ?? "",
    startDate: row[2] ?? "",
    endDate: row[3] ?? "",
    location: row[4] ?? "",
    deposit: row[5] ?? "",
    depositDate: row[6] ?? "",
    requester: row[7] ?? "",
    reviewer: row[8] ?? "",
    department: row[9] ?? "",
    grandTotal: row[10] ?? "",
    notes: row[11] ?? "",
    approver: row[12] ?? "",
    approvalDate: row[13] ?? "",
    approvalStatus: row[14] ?? "",
    receivingDate: row[15] ?? "",
    receiver1: row[16] ?? "",
    receiver2: row[17] ?? "",
    receiver3: row[18] ?? "",
    quality: row[19] ?? "",
    qualityDetails: row[20] ?? "",
    workCollection: row[21] ?? "",
    workCollectionDetails: row[22] ?? "",
    cleanliness: row[23] ?? "",
    cleanlinessDetails: row[24] ?? "",
    receivingStatus: row[25] ?? "",
    paymentStatus: row[26] ?? "",
  };
}

function nextJONumber(existing: JO[]): string {
  const beYear = String(new Date().getFullYear() + 543).slice(-2);
  let max = 0;
  const re = new RegExp(`^JO-${beYear}\\/(\\d+)$`);
  for (const jo of existing) {
    const m = re.exec(jo.joNumber.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `JO-${beYear}/${String(max + 1).padStart(4, "0")}`;
}

export async function listJOs(search?: string): Promise<JO[]> {
  const rows = await getRows(JO_SHEET);
  const data = rows.slice(1).filter((r) => r[0]).map(rowToJO).reverse();
  const q = search?.trim().toLowerCase();
  if (!q) return data;
  return data.filter((jo) =>
    [jo.joNumber, jo.supplierName, jo.requester, jo.location].join(" ").toLowerCase().includes(q)
  );
}

export async function createJO(input: NewJOInput): Promise<JO> {
  const existing = await listJOs();
  const joNumber = nextJONumber(existing);

  // Find last data row using col B (supplierName) — col A may be a protected formula column
  const currentJORows = await getRows(JO_SHEET);
  let lastJODataRow = 1;
  for (let i = currentJORows.length - 1; i >= 1; i--) {
    if (currentJORows[i]?.[1]?.trim() || currentJORows[i]?.[0]?.trim()) {
      lastJODataRow = i + 1;
      break;
    }
  }
  const joRowNum = lastJODataRow + 1;
  const qJO = quoteSheetName(JO_SHEET);

  // Write to 9.JO — skip A (joNumber, protected/formula), J (department, protected),
  // K (grandTotal, protected formula), Z:AA (receivingStatus/paymentStatus, protected)
  const joBatch: { range: string; values: (string | number | boolean)[][] }[] = [
    // B:I — supplierName, startDate, endDate, location, deposit, depositDate, requester, reviewer
    { range: `${qJO}!B${joRowNum}:I${joRowNum}`, values: [[
      input.supplierName,
      input.startDate || "",
      input.endDate || "",
      input.location || "",
      input.deposit || "",
      "",
      input.requester,
      input.reviewer || "",
    ]] },
    // L:O — notes, approver, approvalDate="", approvalStatus="รออนุมัติ"
    // (skip J=department protected, K=grandTotal protected)
    { range: `${qJO}!L${joRowNum}:O${joRowNum}`, values: [[
      input.notes || "",
      input.approver || "",
      "",
      "รออนุมัติ",
    ]] },
  ];

  await safeWriteRanges(joBatch);

  // Write line items to 10.JO_order
  if (input.lineItems && input.lineItems.length > 0) {
    const currentOrderRows = await getRows(JO_ORDER_SHEET);
    let lastOrderDataRow = 1;
    for (let i = currentOrderRows.length - 1; i >= 1; i--) {
      if (currentOrderRows[i]?.[1]?.trim()) { lastOrderDataRow = i + 1; break; }
    }
    const startRow = lastOrderDataRow + 1;
    const qOrder = quoteSheetName(JO_ORDER_SHEET);
    const orderBatch: { range: string; values: (string | number | boolean)[][] }[] = [];

    for (let idx = 0; idx < input.lineItems.length; idx++) {
      const item = input.lineItems[idx];
      const rowNum = startRow + idx;
      // B: JO number (skip A=lineIndex formula)
      orderBatch.push({ range: `${qOrder}!B${rowNum}`, values: [[joNumber]] });
      // D: item description (skip C=XLOOKUP supplierName)
      orderBatch.push({ range: `${qOrder}!D${rowNum}`, values: [[item.itemName]] });
      // E: qty
      orderBatch.push({ range: `${qOrder}!E${rowNum}`, values: [[item.qty]] });
      // F: unit
      orderBatch.push({ range: `${qOrder}!F${rowNum}`, values: [[item.unit]] });
      // G: price excl VAT per unit
      orderBatch.push({ range: `${qOrder}!G${rowNum}`, values: [[item.priceExcl]] });
      // H: VAT %
      if (item.vatPct) {
        orderBatch.push({ range: `${qOrder}!H${rowNum}`, values: [[item.vatPct]] });
      }
      // N: item note
      if (item.itemNote) {
        orderBatch.push({ range: `${qOrder}!N${rowNum}`, values: [[item.itemNote]] });
      }
    }

    await safeWriteRanges(orderBatch);
  }

  // Read back to get actual joNumber — col A may be auto-generated by sheet formula
  const refreshedRows = await getRows(JO_SHEET);
  const actualJONumber = refreshedRows[joRowNum - 1]?.[0]?.trim() || joNumber;

  // Send LINE approval request (non-blocking)
  if (input.approver) {
    getLineUserIdByName(input.approver).then((lineUserId) => {
      if (!lineUserId) return;
      const flex = buildApprovalFlex({
        id: actualJONumber,
        date: input.startDate || "",
        supplierName: input.supplierName,
        requesterName: input.requester,
        total: "0",
        type: "JO",
      });
      sendFlexMessage(lineUserId, `ใบจ้าง ${actualJONumber} รออนุมัติ`, flex).catch(() => {});
    }).catch(() => {});
  }

  const joRow = [
    actualJONumber,
    input.supplierName, input.startDate || "", input.endDate || "",
    input.location || "", input.deposit || "", "",
    input.requester, input.reviewer || "",
    "",
    "",
    input.notes || "", input.approver || "", "", "รออนุมัติ",
    "", "", "", "", "", "", "", "", "", "", "รอตรวจรับงาน", "",
  ];
  return rowToJO(joRow);
}

export async function updateJO(joNumber: string, input: UpdateJOInput): Promise<JO | null> {
  const rows = await getRows(JO_SHEET);
  const dataRows = rows.slice(1);
  const rowIdx = dataRows.findIndex((r) => (r[0] ?? "").trim() === joNumber.trim());
  if (rowIdx === -1) return null;
  const sheetRowNum = rowIdx + 2;
  const cur = dataRows[rowIdx] ?? [];

  // B:E — supplierName, startDate, endDate, location
  if (
    input.supplierName !== undefined ||
    input.startDate !== undefined ||
    input.endDate !== undefined ||
    input.location !== undefined
  ) {
    await updateCells(JO_SHEET, sheetRowNum, 1, [
      input.supplierName ?? cur[1] ?? "",
      input.startDate ?? cur[2] ?? "",
      input.endDate ?? cur[3] ?? "",
      input.location ?? cur[4] ?? "",
    ]);
  }

  // F — deposit
  if (input.deposit !== undefined) {
    await updateCells(JO_SHEET, sheetRowNum, 5, [input.deposit]);
  }

  // H — requester
  if (input.requester !== undefined) {
    await updateCells(JO_SHEET, sheetRowNum, 7, [input.requester]);
  }

  // J (department) — SKIP: protected column in production sheet
  // K (grandTotal) — SKIP: protected formula column in production sheet

  // L — notes only (skip K=grandTotal which is protected)
  if (input.notes !== undefined) {
    await updateCells(JO_SHEET, sheetRowNum, 11, [input.notes]);
  }

  // M — approver
  if (input.approver !== undefined) {
    await updateCells(JO_SHEET, sheetRowNum, 12, [input.approver]);
  }

  // N:O — approvalDate, approvalStatus
  if (input.approvalDate !== undefined || input.approvalStatus !== undefined) {
    await updateCells(JO_SHEET, sheetRowNum, 13, [
      input.approvalDate ?? cur[13] ?? "",
      input.approvalStatus ?? cur[14] ?? "",
    ]);
  }

  return getJO(joNumber);
}

export async function getJO(joNumber: string): Promise<JO | null> {
  const all = await listJOs();
  return all.find((j) => j.joNumber === joNumber) ?? null;
}

export async function getJOOrders(joNumber: string): Promise<JOOrder[]> {
  const rows = await getRows(JO_ORDER_SHEET);
  return rows
    .slice(1)
    .filter((r) => (r[1] ?? "").trim() === joNumber.trim())
    .map((r) => ({
      lineIndex: r[0] ?? "",
      joNumber: r[1] ?? "",
      supplierName: r[2] ?? "",
      itemName: r[3] ?? "",
      qty: r[4] ?? "",
      unit: r[5] ?? "",
      priceExcl: r[6] ?? "",
      vatPct: r[7] ?? "",
      vatPerUnit: r[8] ?? "",
      priceIncl: r[9] ?? "",
      totalExcl: r[10] ?? "",
      totalVat: r[11] ?? "",
      totalIncl: r[12] ?? "",
      itemNote: r[13] ?? "",
    }));
}
