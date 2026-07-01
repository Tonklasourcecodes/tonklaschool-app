import { getRows, appendRow, updateCells } from "./sheets-po";

const ROLES_SHEET = "Roles";

export type SystemRole = "admin" | "approver" | "worker";

export interface RoleEntry {
  email: string;
  role: "admin" | "approver" | "worker";
  name: string;
  lineUserId?: string;
}

export async function getRoleForEmail(email: string): Promise<SystemRole | null> {
  const lc = email.toLowerCase().trim();

  // Bootstrap: initial admins from env (comma-separated)
  const envAdmins = (process.env.INITIAL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (envAdmins.includes(lc)) return "admin";

  // Check Roles sheet
  try {
    const rows = await getRows(ROLES_SHEET);
    const data = rows.slice(1);
    const match = data.find((r) => (r[0] ?? "").toLowerCase().trim() === lc);
    if (match) {
      const r = (match[1] ?? "").trim();
      if (r === "admin" || r === "approver") return r;
    }
  } catch {
    // Roles sheet may not exist yet — fall through
  }

  // Domain check — any @tonkla.ac.th is a worker
  if (lc.endsWith("@tonkla.ac.th")) return "worker";

  return null;
}

export async function listRoles(): Promise<RoleEntry[]> {
  try {
    const rows = await getRows(ROLES_SHEET);
    return rows
      .slice(1)
      .filter((r) => r[0]?.trim())
      .map((r) => ({
        email: r[0] ?? "",
        role: r[1] === "admin" ? "admin" : "approver",
        name: r[2] ?? "",
        lineUserId: r[3] ?? "",
      }));
  } catch {
    return [];
  }
}

export async function addRole(entry: RoleEntry): Promise<void> {
  await appendRow(ROLES_SHEET, [
    entry.email.toLowerCase().trim(),
    entry.role,
    entry.name,
    entry.lineUserId ?? "",
  ]);
}

export async function removeRole(email: string): Promise<void> {
  const lc = email.toLowerCase().trim();
  const rows = await getRows(ROLES_SHEET);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] ?? "").toLowerCase().trim() === lc) {
      await updateCells(ROLES_SHEET, i + 1, 0, ["", "", "", ""]);
      return;
    }
  }
}

export async function getNameForEmail(email: string): Promise<string | null> {
  const lc = email.toLowerCase().trim();
  try {
    const rows = await getRows(ROLES_SHEET);
    const match = rows.slice(1).find((r) => (r[0] ?? "").toLowerCase().trim() === lc);
    return match?.[2]?.trim() || null;
  } catch {
    return null;
  }
}

export async function registerWorkerName(email: string, displayName: string): Promise<void> {
  const lc = email.toLowerCase().trim();
  const rows = await getRows(ROLES_SHEET);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] ?? "").toLowerCase().trim() === lc) {
      await updateCells(ROLES_SHEET, i + 1, 0, [lc, rows[i][1] ?? "worker", displayName, rows[i][3] ?? ""]);
      return;
    }
  }
  await appendRow(ROLES_SHEET, [lc, "worker", displayName, ""]);
}

export function namesMatch(a: string, b: string): boolean {
  const ta = a.trim();
  const tb = b.trim();
  if (ta === tb) return true;
  if (!ta || !tb) return false;
  // Extract nickname from parentheses: "ศุภฤกษ์ อัครวิทยาพันธุ์ (หนุม)" → "หนุม"
  const nickA = ta.match(/\(([^)]+)\)$/)?.[1];
  const nickB = tb.match(/\(([^)]+)\)$/)?.[1];
  if (nickA && nickA === tb) return true;
  if (nickB && nickB === ta) return true;
  if (ta.includes(tb) || tb.includes(ta)) return true;
  return false;
}

export async function getLineUserIdByName(name: string): Promise<string | null> {
  const trimmed = name.trim();
  try {
    const rows = await getRows(ROLES_SHEET);
    const match = rows.slice(1).find((r) => namesMatch(r[2] ?? "", trimmed) && r[3]?.trim());
    return match?.[3]?.trim() || null;
  } catch {
    return null;
  }
}
