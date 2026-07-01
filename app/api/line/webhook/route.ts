import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { updatePO } from "@/lib/po";
import { updateJO } from "@/lib/jo";
import { replyMessage } from "@/lib/line";
import { getRows, updateCells, appendRow } from "@/lib/sheets-po";

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET!;
  const hash = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return hash === signature;
}

async function saveLineUserId(lineUserId: string, email: string): Promise<boolean> {
  const rows = await getRows("Roles");
  const emailLower = email.trim().toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    const rowEmail = (rows[i]?.[0] ?? "").toLowerCase().trim();
    if (rowEmail === emailLower) {
      await updateCells("Roles", i + 1, 3, [lineUserId]);
      return true;
    }
  }
  // Not found — create new row as approver automatically
  await appendRow("Roles", [emailLower, "approver", "", lineUserId]);
  return true;
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    events: Array<{
      type: string;
      replyToken: string;
      source?: { userId?: string };
      message?: { type: string; text?: string };
      postback?: { data: string };
    }>;
  };

  for (const event of body.events) {
    const lineUserId = event.source?.userId;

    // --- Follow event: user added bot as friend ---
    if (event.type === "follow" && lineUserId) {
      await replyMessage(
        event.replyToken,
        "สวัสดี! 👋 เพื่อรับการแจ้งเตือนใบสั่งซื้อ กรุณาส่ง email ที่ใช้ login ระบบมาเลยนะครับ\n\nตัวอย่าง: name@tonkla.ac.th"
      ).catch(() => {});
      continue;
    }

    // --- Message event: user sends email to register ---
    if (event.type === "message" && event.message?.type === "text" && lineUserId) {
      const text = (event.message.text ?? "").trim();
      // Check if message looks like an email
      if (text.includes("@") && text.includes(".")) {
        const saved = await saveLineUserId(lineUserId, text).catch(() => false);
        if (saved) {
          await replyMessage(
            event.replyToken,
            `✅ ลงทะเบียนสำเร็จ!\nคุณจะได้รับการแจ้งเตือนเมื่อมีใบสั่งซื้อรออนุมัติแล้วครับ`
          ).catch(() => {});
        } else {
          await replyMessage(
            event.replyToken,
            `❌ ไม่พบ email นี้ในระบบ\nกรุณาตรวจสอบ email ที่ใช้ login หรือติดต่อผู้ดูแลระบบครับ`
          ).catch(() => {});
        }
        continue;
      }
      // Non-email message — give hint
      await replyMessage(
        event.replyToken,
        "📧 กรุณาส่ง email ที่ใช้ login ระบบมาเพื่อลงทะเบียนรับการแจ้งเตือนครับ"
      ).catch(() => {});
      continue;
    }

    // --- Postback: approve / reject PO or JO ---
    if (event.type !== "postback" || !event.postback) continue;

    const params = new URLSearchParams(event.postback.data);
    const action = params.get("action");
    const type = params.get("type") as "PO" | "JO";
    const id = params.get("id");

    if (!action || !type || !id) continue;

    const isApproved = action === "approve";
    const statusText = isApproved ? "อนุมัติแล้ว" : "ไม่อนุมัติ";
    const today = new Date().toLocaleDateString("th-TH", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

    try {
      console.log(`[LINE webhook] ${action} ${type} ${id}`);
      if (type === "PO") {
        await updatePO(id, { approvalStatus: statusText, approvalDate: today });
      } else {
        await updateJO(id, { approvalStatus: statusText, approvalDate: today });
      }

      const label = type === "PO" ? "ใบสั่งซื้อ" : "ใบจ้าง";
      const emoji = isApproved ? "✅" : "❌";
      await replyMessage(
        event.replyToken,
        `${emoji} ${label} ${id} — ${statusText} เรียบร้อยแล้ว`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[LINE webhook] Error processing ${type} ${id}:`, msg);
      await replyMessage(event.replyToken, `เกิดข้อผิดพลาด: ${msg.slice(0, 100)}`).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
