import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readItemData } from "@/lib/sheets-reader";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const items = await readItemData();
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
