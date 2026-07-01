"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, Pencil, Printer, CheckCircle, XCircle } from "lucide-react";
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
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 12, fontWeight: 700, padding: "5px 12px",
        borderRadius: 999, background: s.pill, color: s.text,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
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
    <div style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <span style={{ fontSize: 12, width: 120, flexShrink: 0, color: "#9C9289", paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#1C1815" }}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C4B9AD", marginBottom: 16 }}>
      {children}
    </p>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      borderRadius: 24, background: "white",
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
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
      <div style={{ background: "#F0EDE9", minHeight: "100vh", padding: "44px" }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ height: 120, borderRadius: 24, background: "rgba(0,0,0,0.06)", marginBottom: 16, animation: "pulse 1.5s infinite" }} />
        ))}
      </div>
    );
  }

  if (error || !po) {
    return (
      <div style={{ background: "#F0EDE9", minHeight: "100vh", padding: "44px" }}>
        <p style={{ fontSize: 14, color: "#DC2626", marginBottom: 8 }}>{error || "ไม่พบ PO"}</p>
        <a href="/po" style={{ fontSize: 14, color: "#059669" }}>← กลับรายการ</a>
      </div>
    );
  }

  const shipping = parseFloat(po.shipping.replace(/,/g, "")) || 0;
  const discount = parseFloat(po.discount.replace(/,/g, "")) || 0;

  return (
    <div style={{ background: "#F0EDE9", minHeight: "100vh" }}>
      <ApproveSuccess show={showSuccess} type={successType} />

      {/* ── Hero header ─────────────────────────── */}
      <div style={{ padding: "44px 44px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9C9289", marginBottom: 8 }}>
              ใบสั่งซื้อ · {po.orderDate || "—"}
            </p>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 800, fontFamily: "monospace", color: "#1C1815", letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 8 }}>
              {poNumber}
            </h1>
            <p style={{ fontSize: 15, color: "#6B6560" }}>{po.supplierName}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <StatusBadge status={po.approvalStatus} />
            {(role === "admin" || po.approvalStatus === "รออนุมัติ") && (
              <button
                onClick={() => router.push(`/po/${id}/edit`)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                  background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#78716C",
                  cursor: "pointer",
                }}
              >
                <Pencil size={13} /> แก้ไข
              </button>
            )}
            <button
              onClick={() => router.push(`/po/${id}/print`)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: "linear-gradient(135deg, #34d399, #059669)", color: "white",
                border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
              }}
            >
              <Printer size={13} /> ใบอนุมัติสั่งซื้อ
            </button>
            <button
              onClick={() => router.push(`/po/${id}/print-receive`)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: "linear-gradient(135deg, #60a5fa, #2563eb)", color: "white",
                border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
              }}
            >
              <Printer size={13} /> ตรวจรับของ
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────── */}
      <div style={{ padding: "0 44px 48px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Grand total strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#9C9289" }}>ยอดรวมทั้งสิ้น</span>
          <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#059669", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {fmt(po.grandTotal)}
          </span>
        </div>

        {/* Info card */}
        <Card>
          <div style={{ padding: "28px 32px 24px" }}>
            <SectionLabel>ข้อมูลการสั่งซื้อ</SectionLabel>
            <InfoRow label="ร้านค้า / ผู้จัดหา" value={po.supplierName} />
            <InfoRow label="ผู้สั่งซื้อ" value={po.requester} />
            <InfoRow label="วันที่สั่งซื้อ" value={po.orderDate} />
            {po.prevPO && <InfoRow label="PO อ้างอิง" value={po.prevPO} />}
            {po.notes && <InfoRow label="หมายเหตุ" value={po.notes} />}
          </div>
        </Card>

        {/* Items table */}
        {orders.length > 0 && (
          <Card>
            <div style={{ padding: "28px 32px 24px" }}>
              <SectionLabel>
                รายการสินค้า{" "}
                <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0, color: "#C4B9AD" }}>
                  ({orders.length} รายการ)
                </span>
              </SectionLabel>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 14, minWidth: 560, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      {["#", "ชื่อสินค้า", "จำนวน", "หน่วย", "ราคา/หน่วย", "ยอดรวม"].map((h) => (
                        <th key={h} style={{
                          paddingBottom: 10, textAlign: "left",
                          fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                          letterSpacing: "0.1em", color: "#C4B9AD",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                        <td style={{ padding: "12px 12px 12px 0", fontSize: 12, color: "#B4A99E" }}>{o.lineIndex || i + 1}</td>
                        <td style={{ padding: "12px 12px 12px 0", fontWeight: 600, color: "#1C1815" }}>{o.itemName}</td>
                        <td style={{ padding: "12px 12px 12px 0", fontVariantNumeric: "tabular-nums", color: "#57534E" }}>{o.qty}</td>
                        <td style={{ padding: "12px 12px 12px 0", fontSize: 12, color: "#78716C" }}>{o.unit}</td>
                        <td style={{ padding: "12px 12px 12px 0", fontVariantNumeric: "tabular-nums", textAlign: "right", fontSize: 12, color: "#57534E" }}>{fmt(o.priceIncl)}</td>
                        <td style={{ padding: "12px 0 12px 0", fontVariantNumeric: "tabular-nums", textAlign: "right", fontWeight: 700, color: "#1C1815" }}>{fmt(o.totalIncl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.05)", marginLeft: "auto", maxWidth: 280 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#78716C", marginBottom: 6 }}>
                  <span>ยอดสินค้า incl. VAT</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(po.subtotal)}</span>
                </div>
                {shipping > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#78716C", marginBottom: 6 }}>
                    <span>ค่าขนส่ง</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>+{fmt(po.shipping)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#78716C", marginBottom: 6 }}>
                    <span>ส่วนลด</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmt(po.discount)}</span>
                  </div>
                )}
                <div style={{
                  display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16,
                  paddingTop: 10, marginTop: 6, borderTop: "1px solid rgba(0,0,0,0.06)", color: "#1C1815",
                }}>
                  <span>รวมเป็นเงิน</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "#059669" }}>{fmt(po.grandTotal)}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Approval section */}
        {po.approvalStatus === "รออนุมัติ" && canApprove ? (
          <Card style={{ border: "1.5px solid rgba(217,119,6,0.4)", boxShadow: "0 4px 20px rgba(217,119,6,0.10)" }}>
            <div style={{ padding: "24px 32px 8px", background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)", borderRadius: "24px 24px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97706", display: "inline-block" }} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#92400E" }}>รอการอนุมัติ</span>
                </div>
                <StatusBadge status={po.approvalStatus} />
              </div>
            </div>
            <div style={{ padding: "20px 32px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, padding: "14px 16px", borderRadius: 16, background: "#F8F6F2" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#B4A99E", marginBottom: 4 }}>ผู้ขออนุมัติ</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1815" }}>{po.requester || "—"}</p>
                </div>
                <span style={{ color: "#D4C8BC", fontSize: 18 }}>→</span>
                <div style={{ flex: 1, padding: "14px 16px", borderRadius: 16, background: "#FFFBEB", border: "1px solid rgba(217,119,6,0.15)" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#D97706", marginBottom: 4 }}>ผู้อนุมัติ</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#92400E" }}>{po.approver || "—"}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => handleApprove("อนุมัติแล้ว")}
                  disabled={approving}
                  style={{
                    flex: 1, padding: "12px 24px", borderRadius: 14, fontWeight: 800, fontSize: 14,
                    background: "linear-gradient(135deg, #34d399, #059669)", color: "white",
                    border: "none", cursor: approving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 20px rgba(5,150,105,0.3)", opacity: approving ? 0.6 : 1,
                  }}
                >
                  {approving ? "กำลังบันทึก..." : "✓  อนุมัติรายการนี้"}
                </button>
                <button
                  onClick={() => handleApprove("ยกเลิก")}
                  disabled={approving}
                  style={{
                    padding: "12px 24px", borderRadius: 14, fontWeight: 800, fontSize: 14,
                    background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
                    cursor: approving ? "not-allowed" : "pointer", opacity: approving ? 0.6 : 1,
                  }}
                >
                  ✗  ไม่อนุมัติ
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ padding: "28px 32px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <SectionLabel>การขออนุมัติ</SectionLabel>
                <StatusBadge status={po.approvalStatus} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, padding: "14px 16px", borderRadius: 16, background: "#F8F6F2" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B4A99E", marginBottom: 4 }}>จาก (ผู้ขอ)</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1815" }}>{po.requester || "—"}</p>
                </div>
                <span style={{ color: "#D4C8BC", fontSize: 18 }}>→</span>
                <div style={{ flex: 1, padding: "14px 16px", borderRadius: 16, background: "#F8F6F2" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B4A99E", marginBottom: 4 }}>ถึง (ผู้อนุมัติ)</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1815" }}>{po.approver || "—"}</p>
                </div>
              </div>
              {po.approvalDate && (
                <p style={{ fontSize: 12, color: "#A8A29E", marginBottom: 12 }}>วันที่อนุมัติ: {po.approvalDate}</p>
              )}
              {!canApprove && po.approvalStatus === "รออนุมัติ" && (
                <p style={{ fontSize: 12, padding: "12px 16px", borderRadius: 14, background: "#FFFBEB", color: "#92400E", border: "1px solid rgba(217,119,6,0.15)" }}>
                  ⏳ รอการพิจารณาจาก {po.approver || "ผู้อนุมัติ"}
                </p>
              )}
              {po.approvalStatus === "อนุมัติแล้ว" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", border: "1px solid rgba(22,163,74,0.15)" }}>
                  <CheckCircle size={16} style={{ color: "#16A34A" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#15803D" }}>อนุมัติโดย {po.approver}</span>
                </div>
              )}
              {po.approvalStatus === "ยกเลิก" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "linear-gradient(135deg, #FEF2F2, #FEE2E2)", border: "1px solid rgba(220,38,38,0.15)" }}>
                  <XCircle size={16} style={{ color: "#DC2626" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#991B1B" }}>ไม่อนุมัติ</span>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
