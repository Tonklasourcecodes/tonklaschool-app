"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, FileText, Pencil, Printer, CheckCircle, XCircle } from "lucide-react";
import type { PO, POOrder } from "@/lib/types-po";
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

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const poNumber = id.replace(/~/g, "/");
  const { data: session } = useSession();

  const [po, setPo] = useState<PO | null>(null);
  const [orders, setOrders] = useState<POOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<"approve" | "reject">("approve");

  const role = (session?.user as { role?: string })?.role;
  const canApprove = role === "admin" || role === "approver";

  useEffect(() => {
    fetch(`/api/po/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPo(d.po);
        setOrders(d.orders ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove(status: "อนุมัติแล้ว" | "ยกเลิก") {
    setApproving(true);
    try {
      const res = await fetch(`/api/po/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: status, approvalDate: todayThai() }),
      });
      const d = await res.json() as { po?: PO; error?: string };
      if (d.error) throw new Error(d.error);
      if (d.po) setPo(d.po);
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

  if (error || !po) {
    return (
      <div className="p-8">
        <p className="text-sm mb-2" style={{ color: "#DC2626" }}>{error || "ไม่พบ PO"}</p>
        <Link href="/po" className="text-sm" style={{ color: "#16A34A" }}>← กลับรายการ</Link>
      </div>
    );
  }

  const shipping = parseFloat(po.shipping.replace(/,/g, "")) || 0;
  const discount = parseFloat(po.discount.replace(/,/g, "")) || 0;

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
          href="/po"
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-all hover:-translate-x-0.5"
          style={{ color: "#A8A29E" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#059669"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#A8A29E"; }}
        >
          <ArrowLeft size={15} /> กลับรายการ PO
        </Link>

        <div className="flex items-center gap-2">
          <StatusBadge status={po.approvalStatus} />
          {(role === "admin" || po.approvalStatus === "รออนุมัติ") && (
            <button
              onClick={() => router.push(`/po/${id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.08)", color: "#78716C", backdropFilter: "blur(4px)" }}
            >
              <Pencil size={12} /> แก้ไข
            </button>
          )}
          <button
            onClick={() => router.push(`/po/${id}/print`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #34d399, #059669)", boxShadow: "0 2px 8px rgba(5,150,105,0.3)" }}
          >
            <Printer size={12} /> ใบอนุมัติสั่งซื้อ
          </button>
          <button
            onClick={() => router.push(`/po/${id}/print-receive`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #60a5fa, #2563eb)", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
          >
            <Printer size={12} /> ตรวจรับของ
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
              ใบสั่งซื้อ · {po.orderDate || "—"}
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1C1815", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 4 }}>
              {poNumber}
            </h1>
            <p style={{ color: "#78716C", fontSize: 13 }}>{po.supplierName}</p>
          </div>
          <div className="text-right shrink-0">
            <p style={{ color: "#9C9289", fontSize: 11, marginBottom: 4 }}>ยอดรวม</p>
            <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {fmt(po.grandTotal)}
            </p>
          </div>
        </div>

        {/* ── Info section ──────────────────────── */}
        <section className="card p-5">
          <div className="section-label">ข้อมูลการสั่งซื้อ</div>
          <div className="space-y-0">
            <InfoRow label="ร้านค้า / ผู้จัดหา" value={po.supplierName} />
            <InfoRow label="ผู้สั่งซื้อ" value={po.requester} />
            <InfoRow label="วันที่สั่งซื้อ" value={po.orderDate} />
            {po.prevPO && <InfoRow label="PO อ้างอิง" value={po.prevPO} />}
            {po.notes && <InfoRow label="หมายเหตุ" value={po.notes} />}
          </div>
        </section>

        {/* ── Items table ───────────────────────── */}
        {orders.length > 0 && (
          <section className="card p-5">
            <div className="section-label">รายการสินค้า <span style={{ color: "#C4B9AD", fontSize: 11, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>({orders.length} รายการ)</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.055)" }}>
                    {["#", "ชื่อสินค้า", "จำนวน", "หน่วย", "ราคา/หน่วย", "ยอดรวม"].map((h) => (
                      <th key={h} className="pb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-left" style={{ color: "#C4B9AD" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={i} className="group" style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                      <td className="py-3 pr-3 text-xs" style={{ color: "#B4A99E" }}>{o.lineIndex || i + 1}</td>
                      <td className="py-3 pr-3 font-medium" style={{ color: "#1C1917" }}>{o.itemName}</td>
                      <td className="py-3 pr-3 tabular-nums" style={{ color: "#57534E" }}>{o.qty}</td>
                      <td className="py-3 pr-3 text-xs" style={{ color: "#78716C" }}>{o.unit}</td>
                      <td className="py-3 pr-3 tabular-nums text-right text-xs" style={{ color: "#57534E" }}>{fmt(o.priceIncl)}</td>
                      <td className="py-3 tabular-nums text-right font-bold" style={{ color: "#1C1917" }}>{fmt(o.totalIncl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.05)] ml-auto max-w-[260px] space-y-1.5 text-sm">
              <div className="flex justify-between" style={{ color: "#78716C" }}>
                <span>ยอดสินค้า incl. VAT</span>
                <span className="tabular-nums">{fmt(po.subtotal)}</span>
              </div>
              {shipping > 0 && (
                <div className="flex justify-between" style={{ color: "#78716C" }}>
                  <span>ค่าขนส่ง</span><span className="tabular-nums">+{fmt(po.shipping)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between" style={{ color: "#78716C" }}>
                  <span>ส่วนลด</span><span className="tabular-nums">−{fmt(po.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[15px] pt-1.5 border-t border-[rgba(0,0,0,0.055)]" style={{ color: "#111110" }}>
                <span>รวมเป็นเงิน</span>
                <span className="tabular-nums" style={{ color: "#059669" }}>{fmt(po.grandTotal)}</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Approval section ──────────────────── */}
        {po.approvalStatus === "รออนุมัติ" && canApprove ? (
          <section
            className="rounded-2xl overflow-hidden"
            style={{ border: "1.5px solid rgba(217,119,6,0.4)", boxShadow: "0 4px 20px rgba(217,119,6,0.12)" }}
          >
            {/* Header */}
            <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#D97706" }} />
                  <span className="font-bold text-sm" style={{ color: "#92400E", fontFamily: "var(--font-display)" }}>รอการอนุมัติ</span>
                </div>
                <StatusBadge status={po.approvalStatus} />
              </div>
            </div>
            {/* Flow */}
            <div className="bg-white px-5 py-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 rounded-xl p-3.5" style={{ background: "#F8F6F2" }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: "#B4A99E" }}>ผู้ขออนุมัติ</p>
                  <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>{po.requester || "—"}</p>
                </div>
                <div style={{ color: "#D4C8BC", fontSize: 18, fontWeight: 300 }}>→</div>
                <div className="flex-1 rounded-xl p-3.5" style={{ background: "#FFFBEB", border: "1px solid rgba(217,119,6,0.15)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: "#D97706" }}>ผู้อนุมัติ</p>
                  <p className="text-sm font-semibold" style={{ color: "#92400E" }}>{po.approver || "—"}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove("อนุมัติแล้ว")}
                  disabled={approving}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #34d399, #059669)",
                    boxShadow: "0 4px 20px rgba(5,150,105,0.3)",
                  }}
                >
                  {approving ? "กำลังบันทึก..." : "✓  อนุมัติรายการนี้"}
                </button>
                <button
                  onClick={() => handleApprove("ยกเลิก")}
                  disabled={approving}
                  className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                  style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
                >
                  ✗  ไม่อนุมัติ
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="section-label" style={{ marginBottom: 0 }}>การขออนุมัติ</div>
              <StatusBadge status={po.approvalStatus} />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 rounded-xl p-3.5" style={{ background: "#F8F6F2" }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: "#B4A99E" }}>จาก (ผู้ขอ)</p>
                <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>{po.requester || "—"}</p>
              </div>
              <div style={{ color: "#D4C8BC", fontSize: 18, fontWeight: 300 }}>→</div>
              <div className="flex-1 rounded-xl p-3.5" style={{ background: "#F8F6F2" }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: "#B4A99E" }}>ถึง (ผู้อนุมัติ)</p>
                <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>{po.approver || "—"}</p>
              </div>
            </div>
            {po.approvalDate && (
              <p className="text-xs mb-3" style={{ color: "#A8A29E" }}>วันที่อนุมัติ: {po.approvalDate}</p>
            )}
            {!canApprove && po.approvalStatus === "รออนุมัติ" && (
              <p className="text-xs px-3.5 py-3 rounded-xl" style={{ background: "#FFFBEB", color: "#92400E", border: "1px solid rgba(217,119,6,0.15)" }}>
                ⏳ รอการพิจารณาจาก {po.approver || "ผู้อนุมัติ"}
              </p>
            )}
            {po.approvalStatus === "อนุมัติแล้ว" && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", border: "1px solid rgba(22,163,74,0.15)" }}>
                <CheckCircle size={16} style={{ color: "#16A34A" }} />
                <span className="text-sm font-semibold" style={{ color: "#15803D" }}>อนุมัติโดย {po.approver}</span>
              </div>
            )}
            {po.approvalStatus === "ยกเลิก" && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "linear-gradient(135deg, #FEF2F2, #FEE2E2)", border: "1px solid rgba(220,38,38,0.15)" }}>
                <XCircle size={16} style={{ color: "#DC2626" }} />
                <span className="text-sm font-semibold" style={{ color: "#991B1B" }}>ไม่อนุมัติ</span>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
