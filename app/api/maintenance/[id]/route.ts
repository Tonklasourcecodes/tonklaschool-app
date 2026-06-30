import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMaintenanceRequest, updateMaintenanceStatus } from "@/lib/maintenance";
import type { MaintenanceStatus } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const request = await getMaintenanceRequest(id);
  if (!request) return NextResponse.json({ error: "ไม่พบคำร้อง" }, { status: 404 });
  return NextResponse.json({ request });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const { id } = await params;
  const body = await req.json() as {
    status: MaintenanceStatus;
    assignedToEmail?: string;
    assignedToName?: string;
    estimatedCost?: number;
    actualCost?: number;
    note?: string;
  };

  // Only admin/maintenance_staff can change status beyond open
  if (body.status !== "open" && role !== "admin" && role !== "maintenance_staff") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เปลี่ยนสถานะ" }, { status: 403 });
  }

  try {
    const updated = await updateMaintenanceStatus(
      id,
      body.status,
      {
        email: session.user.email!,
        name: (session.user as { userName?: string }).userName ?? session.user.name ?? "",
      },
      {
        assignedToEmail: body.assignedToEmail,
        assignedToName: body.assignedToName,
        estimatedCost: body.estimatedCost,
        actualCost: body.actualCost,
        note: body.note,
      }
    );
    return NextResponse.json({ request: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
