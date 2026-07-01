import { NextRequest, NextResponse } from "next/server";
import { getPO, getPOOrders, updatePO } from "@/lib/po";
import type { UpdatePOInput } from "@/lib/types-po";
import { auth } from "@/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const poNumber = id.replace(/~/g, "/");
    const [po, orders] = await Promise.all([getPO(poNumber), getPOOrders(poNumber)]);
    if (!po) return NextResponse.json({ error: "ไม่พบ PO" }, { status: 404 });
    return NextResponse.json({ po, orders });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const body = (await req.json()) as UpdatePOInput;
  // Approval changes require approver or admin role
  if (body.approvalStatus !== undefined && role !== "approver" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const poNumber = id.replace(/~/g, "/");
    const updated = await updatePO(poNumber, body);
    if (!updated) return NextResponse.json({ error: "ไม่พบ PO" }, { status: 404 });
    return NextResponse.json({ po: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
