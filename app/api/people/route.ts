import { NextResponse } from "next/server";
import { getRows } from "@/lib/sheets-po";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await getRows("ref");
    const names = rows
      .slice(1)
      .map((r) => (r[16] ?? "").trim())
      .filter(Boolean);
    return NextResponse.json({ people: names });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
