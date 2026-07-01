import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listRoles, addRole, removeRole, type RoleEntry } from "@/lib/roles";

async function requireAdmin() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const roles = await listRoles();
  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json() as RoleEntry;
  if (!body.email || !body.role || !body.name) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }
  try {
    await addRole({ email: body.email.toLowerCase().trim(), role: body.role, name: body.name, lineUserId: body.lineUserId ?? "" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email } = await req.json() as { email: string };
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  await removeRole(email);
  return NextResponse.json({ ok: true });
}
