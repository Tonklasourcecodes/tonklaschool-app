import { NextRequest, NextResponse } from "next/server";
import { addSupplier, listSuppliers } from "@/lib/suppliers";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const search = req.nextUrl.searchParams.get("q") ?? undefined;
    const suppliers = await listSuppliers(search);
    return NextResponse.json({ suppliers });
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
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "ต้องระบุชื่อร้านค้า" }, { status: 400 });
    }
    const supplier = await addSupplier(body);
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
