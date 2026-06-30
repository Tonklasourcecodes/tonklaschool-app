import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMaintenanceCategories } from "@/lib/maintenance";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await listMaintenanceCategories();
  return NextResponse.json({ categories });
}
