import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listFoodOrders, createFoodOrder } from "@/lib/food";
import type { NewFoodOrderInput, FoodOrderStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const role = (session.user as { role?: string }).role;
    const email = session.user.email!;
    const statusParam = req.nextUrl.searchParams.get("status") as FoodOrderStatus | null;
    const orders = await listFoodOrders({
      status: statusParam ?? undefined,
      // reporters see only their own; kitchen_staff and admin see all
      requesterEmail: role === "reporter" ? email : undefined,
    });
    return NextResponse.json({ orders });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "kitchen_staff") {
    return NextResponse.json({ error: "เฉพาะ kitchen staff และ admin เท่านั้น" }, { status: 403 });
  }
  try {
    const body = await req.json() as NewFoodOrderInput;
    if (!body.items?.length) return NextResponse.json({ error: "ต้องระบุรายการวัตถุดิบ" }, { status: 400 });
    const order = await createFoodOrder(body, {
      email: session.user.email!,
      name: (session.user as { userName?: string }).userName ?? session.user.name ?? "",
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
