import { safeWriteRanges, getRows, quoteSheetName, updateCells } from "./sheets-po";
import type { PO, POOrder, NewPOInput, NewPOLineItemInput, UpdatePOInput } from "./types-po";
import { getLineUserIdByName } from "./roles";
import { sendFlexMessage, buildApprovalFlex } from "./line";

const PO_SHEET = "5.PO";
const ORDER_SHEET = "6.PO_order";

function rowToPO(row: string[]): PO {
  return {
    poNumber: row[0] ?? "",
    orderDate: row[1] ?? "",
    prevPO: row[2] ?? "",
    supplierName: row[3] ?? "",
    requester: row[4] ?? "",
    subtotal: row[5] ?? "",
    deposit: row[6] ?? "",
    shipping: row[7] ?? "",
    discount: row[8] ?? "",
    grandTotal: row[9] ?? "",
    reviewer: row[10] ?? "",
    approver: row[11] ?? "",
    approvalDate: row[12] ?? "",
    approvalStatus: row[13] ?? "",
    paymentDate: row[14] ?? "",
    paymentMethod: row[15] ?? "",
    notes: row[16] ?? "",
    receivingDate: row[17] ?? "",
    receiver1: row[18] ?? "",
    receiver2: row[19] ?? "",
    receiver3: row[20] ?? "",
    quality: row[21] ?? "",
    qualityDetails: row[22] ?? "",
    fullCount: row[23] ?? "",
    fullCountDetails: row[24] ?? "",
    receivingStatus: row[25] ?? "",
  };
}

function nextPONumber(existing: PO[]): string {
  const beYear = String(new Date().getFullYear() + 543).slice(-2);
  let max = 0;
  const re = new RegExp(`^PO-${beYear}\\/(\\d+)$`);
  for (const po of existing) {
    const m = re.exec(po.poNumber.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `PO-${beYear}/${String(max + 1).padStart(4, "0")}`;
}

export async function listPOs(search?: string): Promise<PO[]> {
  const [poRows, orderRows] = await Promise.all([getRows(PO_SHEET), getRows(ORDER_SHEET)]);

  // Pre-compute subtotals from order items (column P = totalIncl, index 15)
  const subtotals = new Map<string, number>();
  for (let i = 1; i < orderRows.length; i++) {
    const pn = (orderRows[i]?.[1] ?? "").trim();
    if (!pn) continue;
    subtotals.set(pn, (subtotals.get(pn) ?? 0) + (parseFloat((orderRows[i]?.[15] ?? "").replace(/,/g, "")) || 0));
  }

  const data = poRows.slice(1).filter((r) => r[0]).map((r) => {
    const po = rowToPO(r);
    const sub = subtotals.get(po.poNumber) ?? 0;
    const shipping = parseFloat((po.shipping || "0").replace(/,/g, "")) || 0;
    const discount = parseFloat((po.discount || "0").replace(/,/g, "")) || 0;
    po.subtotal = sub.toFixed(2);
    po.grandTotal = (sub + shipping - discount).toFixed(2);
    return po;
  }).reverse();

  const q = search?.trim().toLowerCase();
  if (!q) return data;
  return data.filter((po) =>
    [po.poNumber, po.supplierName, po.requester].join(" ").toLowerCase().includes(q)
  );
}

function calcLine(item: NewPOLineItemInput) {
  const priceExcl = parseFloat(item.priceExclVat) || 0;
  const vatPct = parseFloat(item.vatPct) || 0;
  const qty = parseFloat(item.qty) || 0;
  const vatPerUnit = (priceExcl * vatPct) / 100;
  const priceIncl = priceExcl + vatPerUnit;
  return {
    vatPerUnit,
    priceIncl,
    totalExcl: qty * priceExcl,
    totalVat: qty * vatPerUnit,
    totalIncl: qty * priceIncl,
  };
}

const fmt = (n: number) => n.toFixed(2);

export async function createPO(input: NewPOInput): Promise<PO> {
  const existing = await listPOs();
  const poNumber = nextPONumber(existing);

  let subtotal = 0;
  for (const item of input.lineItems) {
    subtotal += calcLine(item).totalIncl;
  }
  const shipping = parseFloat(input.shipping) || 0;
  const discount = parseFloat(input.discount) || 0;
  const grandTotal = subtotal + shipping - discount;

  // Find last data row using col B (orderDate) — col A may be a protected formula column
  const currentPORows = await getRows(PO_SHEET);
  let lastPODataRow = 1;
  for (let i = currentPORows.length - 1; i >= 1; i--) {
    if (currentPORows[i]?.[1]?.trim() || currentPORows[i]?.[0]?.trim()) {
      lastPODataRow = i + 1;
      break;
    }
  }
  const poRowNum = lastPODataRow + 1;
  const qPO = quoteSheetName(PO_SHEET);

  // Write to 5.PO — skip A (poNumber, protected/formula), F (subtotal, formula), J (grandTotal, formula)
  const poBatch: { range: string; values: (string | number | boolean)[][] }[] = [
    // B:E — orderDate, prevPO, supplierName, requester
    { range: `${qPO}!B${poRowNum}:E${poRowNum}`, values: [[
      input.orderDate, input.prevPO || "", input.supplierName, input.requester,
    ]] },
    // G:I — deposit, shipping, discount (skip F=subtotal formula, J=grandTotal formula)
    { range: `${qPO}!G${poRowNum}:I${poRowNum}`, values: [[
      input.deposit || "", input.shipping || "", input.discount || "",
    ]] },
    // K:N — reviewer, approver, approvalDate="", approvalStatus="รออนุมัติ"
    { range: `${qPO}!K${poRowNum}:N${poRowNum}`, values: [[
      input.reviewer || "", input.approver || "", "", "รออนุมัติ",
    ]] },
  ];
  if (input.notes?.trim()) {
    poBatch.push({ range: `${qPO}!Q${poRowNum}`, values: [[input.notes]] });
  }

  // Write to 6.PO_order — skip A (lineIndex, formula), C (XLOOKUP supplierName),
  // E (itemCode, protected), J:P (unit/price formula columns)
  const currentOrderRows = await getRows(ORDER_SHEET);
  let lastOrderDataRow = 1;
  for (let i = currentOrderRows.length - 1; i >= 1; i--) {
    if (currentOrderRows[i]?.[1]?.trim()) { lastOrderDataRow = i + 1; break; }
  }
  const startRow = lastOrderDataRow + 1;
  const qOrder = quoteSheetName(ORDER_SHEET);
  const orderBatch: { range: string; values: (string | number | boolean)[][] }[] = [];

  for (let idx = 0; idx < input.lineItems.length; idx++) {
    const item = input.lineItems[idx];
    const rowNum = startRow + idx;
    // B — poNumber (skip A=lineIndex, protected/formula)
    orderBatch.push({ range: `${qOrder}!B${rowNum}`, values: [[poNumber]] });
    // E: itemCode — production sheet uses col E as the XLOOKUP key (unit, price auto-fill from E)
    // F: itemName — written as fallback display text if XLOOKUP doesn't trigger
    // skip A=formula, C=XLOOKUP supplierName, D=narrow dropdown, J:P=formula prices
    orderBatch.push({ range: `${qOrder}!E${rowNum}`, values: [[item.itemCode || ""]] });
    orderBatch.push({ range: `${qOrder}!F${rowNum}`, values: [[item.itemName || ""]] });
    // I: qty — J:P are XLOOKUP/formula (unit, prices)
    orderBatch.push({ range: `${qOrder}!I${rowNum}`, values: [[item.qty]] });
    if (item.itemNote) {
      orderBatch.push({ range: `${qOrder}!Q${rowNum}`, values: [[item.itemNote]] });
    }
  }

  await safeWriteRanges(poBatch);
  await safeWriteRanges(orderBatch);

  // Read back to get actual poNumber — col A may be auto-generated by sheet formula
  const refreshedRows = await getRows(PO_SHEET);
  const actualPONumber = refreshedRows[poRowNum - 1]?.[0]?.trim() || poNumber;

  // Send LINE approval request (non-blocking)
  if (input.approver) {
    console.log(`[LINE] Sending PO ${actualPONumber} to approver: ${input.approver}`);
    getLineUserIdByName(input.approver).then((lineUserId) => {
      if (!lineUserId) {
        console.warn(`[LINE] No LINE User ID found for approver: ${input.approver}`);
        return;
      }
      const flex = buildApprovalFlex({
        id: actualPONumber,
        date: input.orderDate,
        supplierName: input.supplierName,
        requesterName: input.requester,
        total: fmt(grandTotal),
        type: "PO",
        items: input.lineItems.map((li) => ({
          name: li.itemName,
          qty: li.qty,
          unit: li.unit,
          totalIncl: fmt(calcLine(li).totalIncl),
        })),
        deposit: input.deposit,
        shipping: input.shipping,
        discount: input.discount,
        notes: input.notes,
      });
      sendFlexMessage(lineUserId, `ใบสั่งซื้อ ${actualPONumber} รออนุมัติ`, flex).catch((e: unknown) => {
        console.error("[LINE] PO push error:", e);
      });
    }).catch((e: unknown) => { console.error("[LINE] Error getting LINE User ID:", e); });
  }

  const poRow = [
    actualPONumber,
    input.orderDate, input.prevPO || "", input.supplierName, input.requester,
    fmt(subtotal), input.deposit || "", input.shipping || "", input.discount || "",
    fmt(grandTotal), input.reviewer || "", input.approver || "", "", "รออนุมัติ",
    "", "", input.notes || "", "", "", "", "", "", "", "", "", "",
  ];
  return rowToPO(poRow);
}

export async function getPO(poNumber: string): Promise<PO | null> {
  const all = await listPOs();
  return all.find((p) => p.poNumber === poNumber) ?? null;
}

export async function updatePO(poNumber: string, input: UpdatePOInput): Promise<PO | null> {
  const rows = await getRows(PO_SHEET);
  const dataRows = rows.slice(1);
  const rowIdx = dataRows.findIndex((r) => (r[0] ?? "").trim() === poNumber.trim());
  if (rowIdx === -1) return null;
  const sheetRowNum = rowIdx + 2;
  const cur = dataRows[rowIdx] ?? [];

  if (input.supplierName !== undefined || input.requester !== undefined) {
    await updateCells(PO_SHEET, sheetRowNum, 3, [
      input.supplierName ?? cur[3] ?? "",
      input.requester ?? cur[4] ?? "",
    ]);
  }

  if (input.deposit !== undefined || input.shipping !== undefined || input.discount !== undefined) {
    // Write G:I only — skip J (grandTotal, protected formula column)
    await updateCells(PO_SHEET, sheetRowNum, 6, [
      input.deposit !== undefined ? input.deposit : (cur[6] ?? ""),
      input.shipping !== undefined ? input.shipping : (cur[7] ?? ""),
      input.discount !== undefined ? input.discount : (cur[8] ?? ""),
    ]);
  }

  if (input.approver !== undefined) {
    await updateCells(PO_SHEET, sheetRowNum, 11, [input.approver]);
  }

  if (input.notes !== undefined) {
    await updateCells(PO_SHEET, sheetRowNum, 16, [input.notes]);
  }

  if (input.approvalDate !== undefined || input.approvalStatus !== undefined) {
    await updateCells(PO_SHEET, sheetRowNum, 12, [
      input.approvalDate ?? cur[12] ?? "",
      input.approvalStatus ?? cur[13] ?? "",
    ]);
  }

  return getPO(poNumber);
}

export async function getPOOrders(poNumber: string): Promise<POOrder[]> {
  const rows = await getRows(ORDER_SHEET);
  return rows
    .slice(1)
    .filter((r) => (r[1] ?? "").trim() === poNumber.trim())
    .map((r) => ({
      lineIndex: r[0] ?? "",
      poNumber: r[1] ?? "",
      supplierName: r[2] ?? "",
      supplierSku: r[3] ?? "",
      itemCode: r[4] ?? "",
      itemName: r[5] ?? "",
      qty: r[8] ?? "",
      unit: r[9] ?? "",
      priceExcl: r[10] ?? "",
      vatPerUnit: r[11] ?? "",
      priceIncl: r[12] ?? "",
      totalExcl: r[13] ?? "",
      totalVat: r[14] ?? "",
      totalIncl: r[15] ?? "",
      itemNote: r[16] ?? "",
    }));
}
