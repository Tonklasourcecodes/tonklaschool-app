import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readRepairs, readPOs } from "@/lib/sheets-reader";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type") ?? "repairs";
  try {
    if (type === "po") {
      const pos = await readPOs();
      return NextResponse.json({ pos });
    }
    const repairs = await readRepairs();
    return NextResponse.json({ repairs });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
