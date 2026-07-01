import { NextRequest, NextResponse } from "next/server";
import { addItem, listItems } from "@/lib/items";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const search = req.nextUrl.searchParams.get("q") ?? undefined;
    const supplierName = req.nextUrl.searchParams.get("supplier") ?? undefined;
    const items = await listItems(search, supplierName);
    return NextResponse.json({ items });
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
    if (!body.name || !body.supplierName) {
      return NextResponse.json(
        { error: "ต้องระบุชื่อสินค้าและร้านค้า" },
        { status: 400 }
      );
    }
    const item = await addItem(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
