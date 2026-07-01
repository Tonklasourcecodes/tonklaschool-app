import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listDepartments } from "@/lib/monthly-order";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const departments = await listDepartments();
  return NextResponse.json({ departments });
}
