import { NextRequest, NextResponse } from "next/server";
import { createPO, listPOs } from "@/lib/po";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const search = req.nextUrl.searchParams.get("q") ?? undefined;
    const pos = await listPOs(search);
    return NextResponse.json({ pos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.supplierName?.trim()) {
      return NextResponse.json({ error: "ต้องระบุชื่อร้านค้า" }, { status: 400 });
    }
    if (!body.requester?.trim()) {
      return NextResponse.json({ error: "ต้องระบุชื่อผู้สั่งซื้อ" }, { status: 400 });
    }
    if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
      return NextResponse.json(
        { error: "ต้องระบุรายการสินค้าอย่างน้อย 1 รายการ" },
        { status: 400 }
      );
    }
    const po = await createPO(body);
    return NextResponse.json({ po }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
