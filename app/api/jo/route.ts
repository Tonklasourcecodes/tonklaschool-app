import { NextRequest, NextResponse } from "next/server";
import { createJO, listJOs } from "@/lib/jo";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const search = req.nextUrl.searchParams.get("q") ?? undefined;
    const jos = await listJOs(search);
    return NextResponse.json({ jos });
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
      return NextResponse.json({ error: "ต้องระบุชื่อร้านค้า/ผู้รับจ้าง" }, { status: 400 });
    }
    if (!body.requester?.trim()) {
      return NextResponse.json({ error: "ต้องระบุชื่อผู้จ้าง" }, { status: 400 });
    }
    if (!body.lineItems?.length) {
      return NextResponse.json({ error: "ต้องระบุรายการจ้างอย่างน้อย 1 รายการ" }, { status: 400 });
    }
    const jo = await createJO(body);
    return NextResponse.json({ jo }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
