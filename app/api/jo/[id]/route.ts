import { NextRequest, NextResponse } from "next/server";
import { getJO, updateJO, getJOOrders } from "@/lib/jo";
import type { UpdateJOInput } from "@/lib/types-po";
import { auth } from "@/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const joNumber = id.replace(/~/g, "/");
    const [jo, orders] = await Promise.all([getJO(joNumber), getJOOrders(joNumber)]);
    if (!jo) return NextResponse.json({ error: "ไม่พบ JO" }, { status: 404 });
    return NextResponse.json({ jo, orders });
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
  const body = (await req.json()) as UpdateJOInput;
  if (body.approvalStatus !== undefined && role !== "approver" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const joNumber = id.replace(/~/g, "/");
    const updated = await updateJO(joNumber, body);
    if (!updated) return NextResponse.json({ error: "ไม่พบ JO" }, { status: 404 });
    return NextResponse.json({ jo: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
