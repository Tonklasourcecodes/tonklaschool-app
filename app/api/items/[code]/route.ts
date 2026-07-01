import { NextRequest, NextResponse } from "next/server";
import { updateItem } from "@/lib/items";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { code } = await params;
    const body = await req.json() as { price?: string; name?: string; unit?: string; supplierSku?: string; note?: string };
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "ต้องระบุฟิลด์ที่ต้องการแก้ไข" }, { status: 400 });
    }
    await updateItem(code, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
