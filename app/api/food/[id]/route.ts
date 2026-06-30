import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFoodOrder, updateFoodOrderStatus } from "@/lib/food";
import type { FoodOrderStatus } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = await getFoodOrder(id);
  if (!order) return NextResponse.json({ error: "ไม่พบใบสั่ง" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const { id } = await params;
  const body = await req.json() as { status: FoodOrderStatus };

  // Only admin/kitchen_staff can approve/reject/receive
  if (["approved", "rejected", "received"].includes(body.status)) {
    if (role !== "admin" && role !== "kitchen_staff") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์อนุมัติ" }, { status: 403 });
    }
  }

  try {
    const updated = await updateFoodOrderStatus(
      id,
      body.status,
      ["approved", "rejected"].includes(body.status)
        ? {
            email: session.user.email!,
            name: (session.user as { userName?: string }).userName ?? session.user.name ?? "",
          }
        : undefined
    );
    return NextResponse.json({ order: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
