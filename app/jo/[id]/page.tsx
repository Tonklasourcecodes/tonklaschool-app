"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Hammer, Pencil, Printer, CheckCircle, XCircle } from "lucide-react";
import type { JO, JOOrder } from "@/lib/types-po";
import ApproveSuccess from "@/components/ApproveSuccess";

const STATUS_STYLE: Record<string, { dot: string; pill: string; text: string }> = {
  รออนุมัติ:   { dot: "#D97706", pill: "#FEF3C7", text: "#92400E" },
  อนุมัติแล้ว: { dot: "#16A34A", pill: "#DCFCE7", text: "#14532D" },
  ยกเลิก:     { dot: "#DC2626", pill: "#FEE2E2", text: "#991B1B" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status];
  if (!s) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
      style={{ background: s.pill, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

function fmt(val: string) {
  const n = parseFloat((val || "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2 }) + " ฿";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-2.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <span className="text-xs w-36 shrink-0 pt-0.5" style={{ color: "#A8A29E" }}>{label}</span>
      <span className="text-sm" style={{ color: "#1C1917" }}>{value}</span>
    </div>
  );
}

function todayThai() {
  return new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

export default function JODetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const joNumber = id.replace(/~/g, "/");
  const { data: session } = useSession();

  const [jo, setJo] = useState<JO | null>(null);
  const [orders, setOrders] = useState<JOOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<"approve" | "reject">("approve");

  const role = (session?.user as { role?: string })?.role;
  const canApprove = role === "admin" || role === "approver";

  useEffect(() => {
    fetch(`/api/jo/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setJo(d.jo);
        setOrders(d.orders ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove(status: "อนุมัติแล้ว" | "ยกเลิก") {
    setApproving(true);
    try {
      const res = await fetch(`/api/jo/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: status, approvalDate: todayThai() }),
      });
      const d = await res.json() as { jo?: JO; error?: string };
      if (d.error) throw new Error(d.error);
      if (d.jo) setJo(d.jo);
      setSuccessType(status === "อนุมัติแล้ว" ? "approve" : "reject");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2100);
    } catch {
      // ignore
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
      </div>
    );
  }

  if (error || !jo) {
    return (
      <div className="p-8">
        <p className="text-sm mb-2" style={{ color: "#DC2626" }}>{error || "ไม่พบ JO"}</p>
        <Link href="/jo" className="text-sm" style={{ color: "#7C3AED" }}>← กลับรายการ</Link>
      </div>
    );
  }

  const deposit = parseFloat((jo.deposit || "").replace(/,/g, "")) || 0;

  function fmtNum(v: string) {
    const n = parseFloat((v || "").replace(/,/g, ""));
    return isNaN(n) ? "—" : n.toLocaleString("th-TH", { minimumFractionDigits: 2 });
  }

  return (
    <div className="min-h-full" style={{ background: "var(--bg)" }}>
      <ApproveSuccess show={showSuccess} type={successType} />

      {/* ── Top bar ─────────────────────────────── */}
      <div
        className="sticky top-0 z-20 px-8 py-3 flex items-center justify-between"
        style={{
          background: "rgba(236,234,226,0.88)",
          backdropFilter: "blur(12px) saturate(1.4)",
          borderBottom: "1px solid rgba(0,0,0,0.055)",
        }}
      >
        <Link
          href="/jo"
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-all hover:-translate-x-0.5"
          style={{ color: "#A8A29E" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#7C3AED"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#A8A29E"; }}
        >
          <ArrowLeft size={15} /> กลับรายการ JO
        </Link>
        <div className="flex items-center gap-2">
          <StatusBadge status={jo.approvalStatus} />
          {(role === "admin" || jo.approvalStatus === "รออนุมัติ") && (
            <button
              onClick={() => router.push(`/jo/${id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.08)", color: "#78716C", backdropFilter: "blur(4px)" }}
            >
              <Pencil size={12} /> แก้ไข
            </button>
          )}
          <button
            onClick={() => router.push(`/jo/${id}/print`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }}
          >
            <Printer size={12} /> พิมพ์ใบจ้าง
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-3xl mx-auto space-y-4">

        {/* ── Summary card ──────────────────────── */}
        <div
          className="rounded-2xl p-5 flex items-start justify-between gap-4"
          style={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9C9289", marginBottom: 6 }}>
              ใบจ้างงาน · {jo.startDate || "—"}
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1C1815", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 4 }}>
              {joNumber}
            </h1>
            <p style={{ color: "#78716C", fontSize: 13 }}>{jo.supplierName}</p>
          </div>
          <div className="text-right shrink-0">
            <p style={{ color: "#9C9289", fontSize: 11, marginBottom: 4 }}>มูลค่างาน</p>
            <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {fmt(jo.grandTotal)}
            </p>
          </div>
        </div>

        <section
          className="bg-white rounded-2xl p-5"
          style={{ border: "1px solid rgba(0,0,0,0.055)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "#C4B9AD" }}>
            ข้อมูลงานจ้าง
          </h2>
          <InfoRow label="ผู้รับจ้าง" value={jo.supplierName} />
          <InfoRow label="ผู้จ้าง" value={jo.requester} />
          <InfoRow label="แผนก" value={jo.department} />
          <InfoRow label="สถานที่" value={jo.location} />
          <InfoRow label="วันที่เริ่มงาน" value={jo.startDate} />
          <InfoRow label="วันที่สิ้นสุด" value={jo.endDate} />
          <InfoRow label="หมายเหตุ" value={jo.notes} />
        </section>

        {orders.length > 0 && (
          <section
            className="bg-white rounded-2xl p-5"
            style={{ border: "1px solid rgba(0,0,0,0.055)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "#C4B9AD" }}>
              รายการจ้าง
            </h2>
            <div className="space-y-2">
              {orders.map((order, i) => {
                const totalExcl = parseFloat((order.totalExcl || order.priceExcl || "").replace(/,/g, "")) || 0;
                return (
                  <div key={i} className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <div className="flex gap-2.5">
                      <span className="text-xs font-bold w-5 shrink-0 pt-0.5" style={{ color: "#C4B9AD" }}>{i + 1}</span>
                      <div>
                        <p className="text-sm" style={{ color: "#1C1917" }}>{order.itemName || "—"}</p>
                        {(order.qty || order.unit) && (
                          <p className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>
                            {order.qty} {order.unit}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium tabular-nums shrink-0" style={{ color: "#7C3AED" }}>
                      {fmtNum(order.totalIncl || String(totalExcl))} ฿
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section
          className="bg-white rounded-2xl p-5"
          style={{ border: "1px solid rgba(0,0,0,0.055)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: "#C4B9AD" }}>
            การเงิน
          </h2>
          <div className="flex justify-between items-center font-bold text-base" style={{ color: "#1C1917" }}>
            <span>มูลค่างาน</span>
            <span className="tabular-nums" style={{ color: "#7C3AED" }}>{fmt(jo.grandTotal)}</span>
          </div>
          {deposit > 0 && (
            <div
              className="flex justify-between items-center text-sm mt-2.5 pt-2.5"
              style={{ borderTop: "1px solid rgba(0,0,0,0.05)", color: "#78716C" }}
            >
              <span>ค่ามัดจำ</span>
              <span className="tabular-nums">{fmt(jo.deposit)}</span>
            </div>
          )}
        </section>

        <section
          className="bg-white rounded-2xl p-5"
          style={{
            border: jo.approvalStatus === "รออนุมัติ" && canApprove
              ? "1.5px solid #D97706"
              : "1px solid rgba(0,0,0,0.055)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#C4B9AD" }}>
              การขออนุมัติ
            </h2>
            <StatusBadge status={jo.approvalStatus} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3.5" style={{ background: "#F8F6F2" }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "#B4A99E" }}>
                จาก (ผู้ขอ)
              </p>
              <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>{jo.requester || "—"}</p>
            </div>
            <div className="rounded-xl p-3.5" style={{ background: "#F8F6F2" }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "#B4A99E" }}>
                ถึง (ผู้อนุมัติ)
              </p>
              <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>{jo.approver || "—"}</p>
            </div>
          </div>

          {jo.approvalDate && (
            <p className="text-xs mb-3" style={{ color: "#A8A29E" }}>
              วันที่อนุมัติ: {jo.approvalDate}
            </p>
          )}

          {canApprove && jo.approvalStatus === "รออนุมัติ" && (
            <div className="flex gap-2.5">
              <button
                onClick={() => handleApprove("อนุมัติแล้ว")}
                disabled={approving}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-60 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.25)",
                }}
              >
                {approving ? "กำลังบันทึก..." : "✓ อนุมัติรายการนี้"}
              </button>
              <button
                onClick={() => handleApprove("ยกเลิก")}
                disabled={approving}
                className="px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                style={{ background: "white", border: "1px solid #FCA5A5", color: "#DC2626" }}
              >
                ✗ ไม่อนุมัติ
              </button>
            </div>
          )}

          {!canApprove && jo.approvalStatus === "รออนุมัติ" && (
            <p className="text-xs px-3 py-2.5 rounded-xl" style={{ background: "#FFFBEB", color: "#92400E" }}>
              รอการพิจารณาจาก {jo.approver || "ผู้อนุมัติ"}
            </p>
          )}

          {jo.approvalStatus === "อนุมัติแล้ว" && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#F0FDF4" }}>
              <CheckCircle size={16} style={{ color: "#16A34A" }} />
              <span className="text-sm font-medium" style={{ color: "#15803D" }}>
                อนุมัติโดย {jo.approver}
              </span>
            </div>
          )}

          {jo.approvalStatus === "ยกเลิก" && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#FEF2F2" }}>
              <XCircle size={16} style={{ color: "#DC2626" }} />
              <span className="text-sm font-medium" style={{ color: "#991B1B" }}>ไม่อนุมัติ</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

