import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listFoodCategories } from "@/lib/food";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await listFoodCategories();
  return NextResponse.json({ categories });
}
