"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Pencil, Printer, CheckCircle, XCircle } from "lucide-react";
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

function fmtNum(v: string) {
  const n = parseFloat((v || "").replace(/,/g, ""));
  return isNaN(n) ? "—" : n.toLocaleString("th-TH", { minimumFractionDigits: 2 });
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
      <div style={{ background: "#F0EDE9", minHeight: "100vh", padding: "44px" }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ height: 120, borderRadius: 24, background: "rgba(0,0,0,0.06)", marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  if (error || !jo) {
    return (
      <div style={{ background: "#F0EDE9", minHeight: "100vh", padding: "44px" }}>
        <p style={{ fontSize: 14, color: "#DC2626", marginBottom: 8 }}>{error || "ไม่พบ JO"}</p>
        <a href="/jo" style={{ fontSize: 14, color: "#7C3AED" }}>← กลับรายการ</a>
      </div>
    );
  }

  const deposit = parseFloat((jo.deposit || "").replace(/,/g, "")) || 0;

  return (
    <div style={{ background: "#F0EDE9", minHeight: "100vh" }}>
      <ApproveSuccess show={showSuccess} type={successType} />

      {/* ── Hero header ─────────────────────────── */}
      <div style={{ padding: "44px 44px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9C9289", marginBottom: 8 }}>
              ใบจ้างงาน · {jo.startDate || "—"}
            </p>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 800, fontFamily: "monospace", color: "#1C1815", letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 8 }}>
              {joNumber}
            </h1>
            <p style={{ fontSize: 15, color: "#6B6560" }}>{jo.supplierName}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <StatusBadge status={jo.approvalStatus} />
            {(role === "admin" || jo.approvalStatus === "รออนุมัติ") && (
              <button
                onClick={() => router.push(`/jo/${id}/edit`)}
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
              onClick={() => router.push(`/jo/${id}/print`)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: "linear-gradient(135deg, #a78bfa, #7c3aed)", color: "white",
                border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
              }}
            >
              <Printer size={13} /> พิมพ์ใบจ้าง
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────── */}
      <div style={{ padding: "0 44px 48px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Grand total strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#9C9289" }}>มูลค่างาน</span>
          <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#7C3AED", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {fmt(jo.grandTotal)}
          </span>
        </div>

        {/* Info card */}
        <Card>
          <div style={{ padding: "28px 32px 24px" }}>
            <SectionLabel>ข้อมูลงานจ้าง</SectionLabel>
            <InfoRow label="ผู้รับจ้าง" value={jo.supplierName} />
            <InfoRow label="ผู้จ้าง" value={jo.requester} />
            <InfoRow label="แผนก" value={jo.department} />
            <InfoRow label="สถานที่" value={jo.location} />
            <InfoRow label="วันที่เริ่มงาน" value={jo.startDate} />
            <InfoRow label="วันที่สิ้นสุด" value={jo.endDate} />
            <InfoRow label="หมายเหตุ" value={jo.notes} />
          </div>
        </Card>

        {/* Items */}
        {orders.length > 0 && (
          <Card>
            <div style={{ padding: "28px 32px 24px" }}>
              <SectionLabel>รายการจ้าง</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {orders.map((order, i) => {
                  const totalExcl = parseFloat((order.totalExcl || order.priceExcl || "").replace(/,/g, "")) || 0;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#C4B9AD", width: 20, flexShrink: 0, paddingTop: 2 }}>{i + 1}</span>
                        <div>
                          <p style={{ fontSize: 14, color: "#1C1815", fontWeight: 500 }}>{order.itemName || "—"}</p>
                          {(order.qty || order.unit) && (
                            <p style={{ fontSize: 12, color: "#9C9289", marginTop: 2 }}>{order.qty} {order.unit}</p>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#7C3AED", flexShrink: 0 }}>
                        {fmtNum(order.totalIncl || String(totalExcl))} ฿
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Finance card */}
        <Card>
          <div style={{ padding: "28px 32px 24px" }}>
            <SectionLabel>การเงิน</SectionLabel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, fontSize: 16, color: "#1C1815" }}>
              <span>มูลค่างาน</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "#7C3AED" }}>{fmt(jo.grandTotal)}</span>
            </div>
            {deposit > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, color: "#78716C", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                <span>ค่ามัดจำ</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(jo.deposit)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Approval */}
        {jo.approvalStatus === "รออนุมัติ" && canApprove ? (
          <Card style={{ border: "1.5px solid rgba(217,119,6,0.4)", boxShadow: "0 4px 20px rgba(217,119,6,0.10)" }}>
            <div style={{ padding: "24px 32px 8px", background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)", borderRadius: "24px 24px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97706", display: "inline-block" }} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#92400E" }}>รอการอนุมัติ</span>
                </div>
                <StatusBadge status={jo.approvalStatus} />
              </div>
            </div>
            <div style={{ padding: "20px 32px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ padding: "14px 16px", borderRadius: 16, background: "#F8F6F2" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#B4A99E", marginBottom: 4 }}>จาก (ผู้ขอ)</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1815" }}>{jo.requester || "—"}</p>
                </div>
                <span style={{ color: "#D4C8BC", fontSize: 18, textAlign: "center" }}>→</span>
                <div style={{ padding: "14px 16px", borderRadius: 16, background: "#FFFBEB", border: "1px solid rgba(217,119,6,0.15)" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#D97706", marginBottom: 4 }}>ผู้อนุมัติ</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#92400E" }}>{jo.approver || "—"}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => handleApprove("อนุมัติแล้ว")}
                  disabled={approving}
                  style={{
                    flex: 1, padding: "12px 24px", borderRadius: 14, fontWeight: 800, fontSize: 14,
                    background: "linear-gradient(135deg, #a78bfa, #7c3aed)", color: "white",
                    border: "none", cursor: approving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 20px rgba(124,58,237,0.25)", opacity: approving ? 0.6 : 1,
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
                <StatusBadge status={jo.approvalStatus} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ padding: "14px 16px", borderRadius: 16, background: "#F8F6F2" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B4A99E", marginBottom: 4 }}>จาก (ผู้ขอ)</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1815" }}>{jo.requester || "—"}</p>
                </div>
                <span style={{ color: "#D4C8BC", fontSize: 18, textAlign: "center" }}>→</span>
                <div style={{ padding: "14px 16px", borderRadius: 16, background: "#F8F6F2" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B4A99E", marginBottom: 4 }}>ถึง (ผู้อนุมัติ)</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1815" }}>{jo.approver || "—"}</p>
                </div>
              </div>
              {jo.approvalDate && (
                <p style={{ fontSize: 12, color: "#A8A29E", marginBottom: 12 }}>วันที่อนุมัติ: {jo.approvalDate}</p>
              )}
              {!canApprove && jo.approvalStatus === "รออนุมัติ" && (
                <p style={{ fontSize: 12, padding: "12px 16px", borderRadius: 14, background: "#FFFBEB", color: "#92400E", border: "1px solid rgba(217,119,6,0.15)" }}>
                  ⏳ รอการพิจารณาจาก {jo.approver || "ผู้อนุมัติ"}
                </p>
              )}
              {jo.approvalStatus === "อนุมัติแล้ว" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "#F0FDF4", border: "1px solid rgba(22,163,74,0.15)" }}>
                  <CheckCircle size={16} style={{ color: "#16A34A" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#15803D" }}>อนุมัติโดย {jo.approver}</span>
                </div>
              )}
              {jo.approvalStatus === "ยกเลิก" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.15)" }}>
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
