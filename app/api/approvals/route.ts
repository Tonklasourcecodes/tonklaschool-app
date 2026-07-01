import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listPOs } from "@/lib/po";
import { listJOs } from "@/lib/jo";
import { getNameForEmail, namesMatch } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string; approverName?: string; email?: string };
  const isAdmin = user.role === "admin";

  // JWT may not have approverName yet (e.g. setup-name just completed) — fall back to Roles sheet
  let approverName = user.approverName;
  if (!approverName && !isAdmin && user.email) {
    approverName = (await getNameForEmail(user.email)) ?? undefined;
  }

  const [pos, jos] = await Promise.all([listPOs(), listJOs()]);

  const pendingPOs = pos.filter((p) => {
    if (p.approvalStatus !== "รออนุมัติ") return false;
    if (isAdmin) return true;
    return approverName ? namesMatch(p.approver, approverName) : false;
  });

  const pendingJOs = jos.filter((j) => {
    if (j.approvalStatus !== "รออนุมัติ") return false;
    if (isAdmin) return true;
    return approverName ? namesMatch(j.approver, approverName) : false;
  });

  return NextResponse.json({ pos: pendingPOs, jos: pendingJOs });
}
