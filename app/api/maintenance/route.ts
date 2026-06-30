import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMaintenanceRequests, createMaintenanceRequest } from "@/lib/maintenance";
import type { NewMaintenanceInput, MaintenanceStatus, MaintenancePriority } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const role = (session.user as { role?: string }).role;
    const email = session.user.email!;
    const status = req.nextUrl.searchParams.get("status") as MaintenanceStatus | null;
    const priority = req.nextUrl.searchParams.get("priority") as MaintenancePriority | null;
    const requests = await listMaintenanceRequests({
      status: status ?? undefined,
      priority: priority ?? undefined,
      // reporters see only their own requests
      reporterEmail: role === "reporter" ? email : undefined,
      assignedEmail: role === "maintenance_staff" ? email : undefined,
    });
    return NextResponse.json({ requests });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as NewMaintenanceInput;
    if (!body.title?.trim()) return NextResponse.json({ error: "ต้องระบุหัวข้อ" }, { status: 400 });
    const request = await createMaintenanceRequest(body, {
      email: session.user.email!,
      name: (session.user as { userName?: string }).userName ?? session.user.name ?? "",
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
