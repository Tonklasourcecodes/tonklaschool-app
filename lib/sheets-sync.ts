import { google } from "googleapis";
import type { FoodOrder, MaintenanceRequest } from "./types";
import type { MonthlyOrder } from "./monthly-order";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  // Key stored as raw PEM with literal \n — replace back to newlines
  const privateKey = key.replace(/\\n/g, "\n");
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const SHEET_ID = process.env.TONKLASCHOOL_SPREADSHEET_ID;

async function appendRow(sheetName: string, row: (string | number)[]) {
  if (!SHEET_ID) return;
  const auth = getAuth();
  if (!auth) return;
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

async function updateRowByNumber(sheetName: string, numberCol: string, numberVal: string, row: (string | number)[]) {
  if (!SHEET_ID) return;
  const auth = getAuth();
  if (!auth) return;
  const sheets = google.sheets({ version: "v4", auth });
  // Find the row
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:A`,
  });
  const rows = data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === numberVal);
  if (idx === -1) {
    await appendRow(sheetName, row);
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A${idx + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
  }
  void numberCol; // suppress unused warning
}

const STATUS_TH: Record<string, string> = {
  draft: "ร่าง",
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  received: "รับของแล้ว",
  open: "เปิด",
  assigned: "มอบหมายแล้ว",
  in_progress: "กำลังดำเนินการ",
  resolved: "แก้ไขแล้ว",
  closed: "ปิด",
};

const PRIORITY_TH: Record<string, string> = {
  low: "ต่ำ",
  medium: "ปานกลาง",
  high: "สูง",
  urgent: "ด่วน",
};

export async function syncFoodOrderToSheet(order: FoodOrder): Promise<void> {
  try {
    const itemsSummary = (order.items ?? [])
      .map((i) => `${i.ingredient_name} ${i.qty}${i.unit}`)
      .join(", ");
    const row = [
      order.order_number,
      order.order_date,
      order.requester_name,
      order.requester_email,
      itemsSummary,
      order.total_amount,
      STATUS_TH[order.status] ?? order.status,
      order.approver_name ?? "",
      order.notes ?? "",
      order.created_at,
    ];
    await updateRowByNumber("วัตถุดิบ-orders", "A", order.order_number, row);
  } catch {
    // Background sync — silently ignore errors
  }
}

export async function syncMaintenanceToSheet(req: MaintenanceRequest): Promise<void> {
  try {
    const row = [
      req.request_number,
      req.title,
      req.location ?? "",
      req.category?.name ?? "",
      PRIORITY_TH[req.priority] ?? req.priority,
      STATUS_TH[req.status] ?? req.status,
      req.reporter_name,
      req.reporter_email,
      req.assigned_to_name ?? "",
      req.estimated_cost ?? "",
      req.actual_cost ?? "",
      req.notes ?? "",
      req.created_at,
    ];
    await updateRowByNumber("แจ้งซ่อม", "A", req.request_number, row);
  } catch {
    // Background sync — silently ignore errors
  }
}

export async function syncMonthlyOrderToSheet(order: MonthlyOrder): Promise<void> {
  const id = process.env.MONTHLY_ORDER_SPREADSHEET_ID;
  if (!id) return;
  try {
    const auth = getAuth();
    if (!auth) return;
    const sheets = google.sheets({ version: "v4", auth });
    const primaryKey = `${order.department}-${order.order_month}-${order.order_year}`;

    // Each line item becomes a row in OrderData
    const items = order.items ?? [];
    if (!items.length) return;

    // Find existing rows for this order and remove them first
    const { data: existing } = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: "3.OrderData!A:M",
    });
    const rows = existing.values ?? [];
    const toDelete: number[] = [];
    rows.forEach((r, idx) => {
      if (String(r[12] ?? "").startsWith(primaryKey)) toDelete.push(idx + 1);
    });

    // Delete from bottom up to preserve row indices
    for (const rowNum of toDelete.sort((a, b) => b - a)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: id,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: { sheetId: 0, dimension: "ROWS", startIndex: rowNum - 1, endIndex: rowNum },
            },
          }],
        },
      });
    }

    // Append new rows
    const newRows = items.map((item, i) => [
      "",                         // ลำดับ (auto)
      item.item_name,             // ชื่อสินค้า
      order.department,           // แผนกที่สั่ง
      order.order_month,          // เดือนที่สั่ง
      order.order_year,           // ปีที่สั่ง
      item.quantity,              // จำนวน
      item.store,                 // ร้านค้า
      item.item_type,             // ประเภท
      item.notes ?? "",           // หมายเหตุ
      item.unit,                  // หน่วย
      item.unit_price,            // ราคา
      item.total_price,           // รวมเงิน
      `${primaryKey}-${i + 1}`,  // Primarykey
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: id,
      range: "3.OrderData!A:M",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: newRows },
    });
  } catch {
    // Background sync — silently ignore errors
  }
}
