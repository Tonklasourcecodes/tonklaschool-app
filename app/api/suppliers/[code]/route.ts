import { NextRequest, NextResponse } from "next/server";
import { updateSupplier } from "@/lib/suppliers";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { code } = await params;
    const body = await req.json() as { name?: string; category?: string; contact1Name?: string; phone1?: string; lineId?: string; province?: string };
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "ต้องระบุฟิลด์ที่ต้องการแก้ไข" }, { status: 400 });
    }
    await updateSupplier(code, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
