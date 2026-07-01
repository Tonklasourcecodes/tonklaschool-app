import { google } from "googleapis";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function readSheet(spreadsheetId: string, range: string): Promise<string[][]> {
  const auth = getAuth();
  if (!auth) return [];
  const sheets = google.sheets({ version: "v4", auth });
  const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (data.values ?? []) as string[][];
}

// ── ระบบสั่งซื้อรายเดือน ──────────────────────────────────

export interface SheetItem {
  code: string;
  name: string;
  store: string;
  defaultQty: number;
  unit: string;
  price: number;
  macroCode: string;
  notes: string;
}

export async function readItemData(): Promise<SheetItem[]> {
  const id = process.env.MONTHLY_ORDER_SPREADSHEET_ID;
  if (!id) return [];
  const rows = await readSheet(id, "2.ItemData!A2:J");
  return rows
    .filter((r) => r[2]) // must have ชื่อสินค้า
    .map((r) => ({
      code: r[1] ?? "",
      name: (r[2] ?? "").trim(),
      store: (r[3] ?? "").trim(),
      defaultQty: parseFloat(r[4]) || 1,
      unit: (r[5] ?? "").trim(),
      price: parseFloat(r[6]) || 0,
      macroCode: r[7] ?? "",
      notes: r[8] ?? "",
    }));
}

// ── ระบบช่าง ──────────────────────────────────────────────

export interface SheetRepair {
  code: string;
  reportedAt: string;
  reporterEmail: string;
  reporterName: string;
  title: string;
  category: string;
  description: string;
  location: string;
  floor: string;
  locationDetail: string;
  photo1: string;
  photo2: string;
  photo3: string;
  urgency: string;
  approverName: string;
  approvalStatus: string;
  approvedAt: string;
  approvalNote: string;
  technicianName: string;
  repairUpdatedAt: string;
  repairStatus: string;
  repairNote: string;
  totalCost: number;
}

export async function readRepairs(limit = 200): Promise<SheetRepair[]> {
  const id = process.env.CHANG_SPREADSHEET_ID;
  if (!id) return [];
  const rows = await readSheet(id, "รายการแจ้งซ่อม!A2:AD");
  return rows
    .slice(0, limit)
    .filter((r) => r[0]) // must have รหัสแจ้งซ่อม
    .map((r) => ({
      code: r[0] ?? "",
      reportedAt: r[1] ?? "",
      reporterEmail: r[2] ?? "",
      reporterName: r[3] ?? "",
      title: r[4] ?? "",
      category: r[5] ?? "",
      description: r[6] ?? "",
      location: r[7] ?? "",
      floor: r[8] ?? "",
      locationDetail: r[9] ?? "",
      photo1: r[10] ?? "",
      photo2: r[11] ?? "",
      photo3: r[12] ?? "",
      urgency: r[13] ?? "",
      approverName: r[14] ?? "",
      approvalStatus: r[15] ?? "",
      approvedAt: r[16] ?? "",
      approvalNote: r[17] ?? "",
      technicianName: r[18] ?? "",
      repairUpdatedAt: r[19] ?? "",
      repairStatus: r[21] ?? "",
      repairNote: r[22] ?? "",
      totalCost: parseFloat(r[29]) || 0,
    }));
}

export interface SheetPO {
  poNumber: string;
  requesterEmail: string;
  requesterName: string;
  orderedAt: string;
  purpose: string;
  approverName: string;
  total: number;
  shipping: number;
  discount: number;
  grandTotal: number;
  notes: string;
  receiveStatus: string;
  approvalStatus: string;
  approvedAt: string;
  approvalNote: string;
}

export async function readPOs(limit = 100): Promise<SheetPO[]> {
  const id = process.env.CHANG_SPREADSHEET_ID;
  if (!id) return [];
  const rows = await readSheet(id, "รายการสั่งซื้อ!A2:Q");
  return rows
    .slice(0, limit)
    .filter((r) => r[0])
    .map((r) => ({
      poNumber: r[0] ?? "",
      requesterEmail: r[1] ?? "",
      requesterName: r[2] ?? "",
      orderedAt: r[3] ?? "",
      purpose: r[4] ?? "",
      approverName: r[5] ?? "",
      total: parseFloat(r[6]) || 0,
      shipping: parseFloat(r[7]) || 0,
      discount: parseFloat(r[8]) || 0,
      grandTotal: parseFloat(r[9]) || 0,
      notes: r[10] ?? "",
      receiveStatus: r[11] ?? "",
      approvalStatus: r[12] ?? "",
      approvedAt: r[13] ?? "",
      approvalNote: r[14] ?? "",
    }));
}
