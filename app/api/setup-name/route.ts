import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { registerWorkerName } from "@/lib/roles";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { displayName } = await req.json() as { displayName?: string };
  if (!displayName?.trim()) {
    return NextResponse.json({ error: "ต้องเลือกชื่อ" }, { status: 400 });
  }
  await registerWorkerName(session.user.email, displayName.trim());
  const res = NextResponse.json({ ok: true });
  // Long-lived cookie (1 year) — middleware reads this so user doesn't repeat setup on every login.
  // JWT gets the real approverName on next Google sign-in via Sheets lookup.
  res.cookies.set("worker-name-set", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
