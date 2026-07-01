import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMonthlyOrders, createMonthlyOrder } from "@/lib/monthly-order";
import type { NewMonthlyOrderInput } from "@/lib/monthly-order";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const email = session.user.email!;
  const sp = req.nextUrl.searchParams;
  try {
    const orders = await listMonthlyOrders({
      // reporters see only their department's orders
      department: role === "reporter" ? undefined : (sp.get("department") ?? undefined),
      status: (sp.get("status") as NonNullable<Parameters<typeof listMonthlyOrders>[0]>["status"]) ?? undefined,
      order_month: sp.get("month") ?? undefined,
      order_year: sp.get("year") ? Number(sp.get("year")) : undefined,
    });
    // filter reporter to own orders
    const result = role === "reporter" ? orders.filter(o => o.requester_email === email) : orders;
    return NextResponse.json({ orders: result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as NewMonthlyOrderInput;
    if (!body.items?.length) return NextResponse.json({ error: "ต้องระบุรายการสินค้า" }, { status: 400 });
    if (!body.department) return NextResponse.json({ error: "ต้องระบุแผนก" }, { status: 400 });
    const order = await createMonthlyOrder(body, {
      email: session.user.email!,
      name: (session.user as { userName?: string }).userName ?? session.user.name ?? "",
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
