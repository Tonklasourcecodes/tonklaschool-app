"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle, XCircle, Package, Loader2 } from "lucide-react";
import type { FoodOrder, FoodOrderStatus } from "@/lib/types";

const STATUS_TH: Record<FoodOrderStatus, string> = {
  draft: "ร่าง", pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ", received: "รับของแล้ว",
};
const STATUS_COLOR: Record<FoodOrderStatus, { color: string; bg: string }> = {
  draft:    { color: "#92400E", bg: "#FEF3C7" },
  pending:  { color: "#D97706", bg: "#FFF7ED" },
  approved: { color: "#059669", bg: "#ECFDF5" },
  rejected: { color: "#DC2626", bg: "#FEF2F2" },
  received: { color: "#7C3AED", bg: "#F5F3FF" },
};

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

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <span style={{ fontSize: 12, width: 120, flexShrink: 0, color: "#9C9289", paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#1C1815" }}>{value}</span>
    </div>
  );
}

export default function FoodOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;
  const [order, setOrder] = useState<FoodOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/food/${id}`)
      .then(r => r.json())
      .then(d => setOrder(d.order ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: FoodOrderStatus) {
    setActing(status);
    try {
      const res = await fetch(`/api/food/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (res.ok) { setOrder(d.order); router.refresh(); }
    } finally { setActing(null); }
  }

  if (loading) {
    return (
      <div style={{ background: "#F0EDE9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "#C4B9AD" }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ background: "#F0EDE9", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <p style={{ fontSize: 14, color: "#9C9289" }}>ไม่พบรายการ</p>
        <a href="/food" style={{ fontSize: 14, color: "#059669" }}>กลับหน้ารายการ</a>
      </div>
    );
  }

  const { color, bg } = STATUS_COLOR[order.status];
  const canApprove = (role === "admin" || role === "kitchen_staff") && order.status === "pending";
  const canReceive = (role === "admin" || role === "kitchen_staff") && order.status === "approved";
  const canSubmit = order.status === "draft";

  return (
    <div style={{ background: "#F0EDE9", minHeight: "100vh" }}>
      {/* ── Hero header ─────────────────────────── */}
      <div style={{ padding: "44px 44px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9C9289", marginBottom: 8 }}>
              ใบสั่งวัตถุดิบ
            </p>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 800, fontFamily: "monospace", color: "#1C1815", letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 8 }}>
              {order.order_number}
            </h1>
            <p style={{ fontSize: 15, color: "#6B6560" }}>
              {new Date(order.order_date).toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 700,
            padding: "5px 14px", borderRadius: 999, background: bg, color,
          }}>
            {STATUS_TH[order.status]}
          </span>
        </div>
      </div>

      {/* ── Content ─────────────────────────────── */}
      <div style={{ padding: "0 44px 48px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Total strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#9C9289" }}>ยอดรวม</span>
          <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#059669", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            ฿{order.total_amount.toLocaleString()}
          </span>
        </div>

        {/* Info card */}
        <Card>
          <div style={{ padding: "28px 32px 24px" }}>
            <SectionLabel>ข้อมูลใบสั่ง</SectionLabel>
            <InfoRow label="ผู้สั่ง" value={order.requester_name} />
            <InfoRow label="วันที่" value={new Date(order.order_date).toLocaleDateString("th-TH", { weekday: "short", year: "numeric", month: "long", day: "numeric" })} />
            {order.approver_name && <InfoRow label="ผู้อนุมัติ" value={order.approver_name} />}
            {order.notes && <InfoRow label="หมายเหตุ" value={order.notes} />}
          </div>
        </Card>

        {/* Items card */}
        <Card>
          <div style={{ padding: "28px 32px 24px" }}>
            <SectionLabel>รายการวัตถุดิบ</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {(order.items ?? []).map(it => (
                <div key={it.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1815" }}>{it.ingredient_name}</p>
                    <p style={{ fontSize: 12, color: "#9C9289", marginTop: 2 }}>{it.qty} {it.unit} × ฿{it.unit_price}</p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#059669", fontVariantNumeric: "tabular-nums" }}>
                    ฿{it.total_price.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            {/* Total row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>ยอดรวมทั้งสิ้น</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#059669", fontVariantNumeric: "tabular-nums" }}>
                ฿{order.total_amount.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Actions card */}
        {(canApprove || canReceive || canSubmit) && (
          <Card>
            <div style={{ padding: "28px 32px 28px" }}>
              <SectionLabel>การดำเนินการ</SectionLabel>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {canSubmit && (
                  <button
                    onClick={() => updateStatus("pending")}
                    disabled={!!acting}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "12px 24px", borderRadius: 14, fontSize: 14, fontWeight: 800,
                      background: "linear-gradient(135deg, #34d399, #059669)", color: "white",
                      border: "none", cursor: acting ? "not-allowed" : "pointer",
                      opacity: acting ? 0.6 : 1,
                    }}
                  >
                    {acting === "pending" && <Loader2 size={14} className="animate-spin" />}
                    ส่งขออนุมัติ
                  </button>
                )}
                {canApprove && (
                  <>
                    <button
                      onClick={() => updateStatus("approved")}
                      disabled={!!acting}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "12px 24px", borderRadius: 14, fontSize: 14, fontWeight: 800,
                        background: "linear-gradient(135deg, #34d399, #059669)", color: "white",
                        border: "none", cursor: acting ? "not-allowed" : "pointer",
                        opacity: acting ? 0.6 : 1,
                      }}
                    >
                      {acting === "approved" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => updateStatus("rejected")}
                      disabled={!!acting}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "12px 24px", borderRadius: 14, fontSize: 14, fontWeight: 800,
                        background: "white", color: "#DC2626",
                        border: "1px solid #FECACA", cursor: acting ? "not-allowed" : "pointer",
                        opacity: acting ? 0.6 : 1,
                      }}
                    >
                      {acting === "rejected" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={15} />}
                      ไม่อนุมัติ
                    </button>
                  </>
                )}
                {canReceive && (
                  <button
                    onClick={() => updateStatus("received")}
                    disabled={!!acting}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "12px 24px", borderRadius: 14, fontSize: 14, fontWeight: 800,
                      background: "linear-gradient(135deg, #a78bfa, #7C3AED)", color: "white",
                      border: "none", cursor: acting ? "not-allowed" : "pointer",
                      opacity: acting ? 0.6 : 1,
                    }}
                  >
                    {acting === "received" ? <Loader2 size={14} className="animate-spin" /> : <Package size={15} />}
                    ยืนยันรับของ
                  </button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
