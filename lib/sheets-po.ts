import { google } from "googleapis";

// In-memory cache for getRows — TTL 30s, invalidated on every write
type CacheEntry = { data: string[][]; expiresAt: number };
const rowCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function invalidateCache(sheetName?: string) {
  if (sheetName) rowCache.delete(sheetName);
  else rowCache.clear();
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY"
    );
  }
  // Decode Base64 key (set GOOGLE_PRIVATE_KEY as base64 in Vercel to avoid newline issues)
  // Falls back to handling literal \n or actual newlines
  let key: string;
  try {
    const decoded = Buffer.from(rawKey, "base64").toString("utf8");
    key = decoded.includes("BEGIN PRIVATE KEY") ? decoded : rawKey.replace(/\\n/g, "\n");
  } catch {
    key = rawKey.replace(/\\n/g, "\n");
  }
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSpreadsheetId() {
  const id = process.env.SPREADSHEET_ID;
  if (!id) throw new Error("Missing SPREADSHEET_ID in .env.local");
  return id;
}

export function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

export async function getRows(sheetName: string): Promise<string[][]> {
  const cached = rowCache.get(sheetName);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: quoteSheetName(sheetName),
  });
  const data = (res.data.values as string[][]) ?? [];
  rowCache.set(sheetName, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export async function appendRow(
  sheetName: string,
  values: (string | number | boolean)[]
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: quoteSheetName(sheetName),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
  invalidateCache(sheetName);
}

function colToLetter(idx: number): string {
  let s = "";
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export async function findRowIndex(
  sheetName: string,
  keyValue: string
): Promise<number | null> {
  const rows = await getRows(sheetName);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] ?? "").trim() === keyValue.trim()) {
      return i + 1; // 1-indexed sheet row number
    }
  }
  return null;
}

export async function updateCells(
  sheetName: string,
  sheetRowNumber: number,
  startColIndex: number,
  values: (string | number | boolean)[]
): Promise<void> {
  if (values.length === 0) return;
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const startCol = colToLetter(startColIndex);
  const endCol = colToLetter(startColIndex + values.length - 1);
  const range = `${quoteSheetName(sheetName)}!${startCol}${sheetRowNumber}:${endCol}${sheetRowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
  invalidateCache(sheetName);
}

export async function appendRows(
  sheetName: string,
  rows: (string | number | boolean)[][]
): Promise<void> {
  if (rows.length === 0) return;
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: quoteSheetName(sheetName),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
  invalidateCache(sheetName);
}

export async function batchUpdateRanges(
  updates: { range: string; values: (string | number | boolean)[][] }[]
): Promise<void> {
  if (updates.length === 0) return;
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates,
    },
  });
  invalidateCache();
}

// Writes each range individually so a protected cell only skips that range, not the whole batch.
// Logs which ranges were blocked so we can identify remaining protected columns.
export async function safeWriteRanges(
  updates: { range: string; values: (string | number | boolean)[][] }[]
): Promise<void> {
  if (updates.length === 0) return;
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const id = getSpreadsheetId();
  for (const u of updates) {
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: id,
        range: u.range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: u.values },
      });
    } catch (err) {
      console.warn(`[sheets] PROTECTED — skipped range ${u.range}:`, err instanceof Error ? err.message : err);
    }
  }
  invalidateCache();
}
