import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMonthlyOrder, updateMonthlyOrderStatus, getLastMonthOrder } from "@/lib/monthly-order";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Special: /api/monthly-orders/last-month?dept=X&month=Y&year=Z
  if (id === "last-month") {
    const sp = req.nextUrl.searchParams;
    const dept = sp.get("dept") ?? "";
    const month = sp.get("month") ?? "";
    const year = Number(sp.get("year") ?? 0);
    const last = await getLastMonthOrder(dept, month, year);
    return NextResponse.json({ order: last });
  }

  const order = await getMonthlyOrder(id);
  if (!order) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return NextResponse.json({ error: "เฉพาะ admin เท่านั้น" }, { status: 403 });
  const { id } = await params;
  const { status } = await req.json() as { status: "approved" | "rejected" };
  try {
    const updated = await updateMonthlyOrderStatus(id, status, {
      email: session.user.email!,
      name: (session.user as { userName?: string }).userName ?? session.user.name ?? "",
    });
    return NextResponse.json({ order: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
