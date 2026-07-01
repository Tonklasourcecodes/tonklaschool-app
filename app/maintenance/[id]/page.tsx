"use client";
import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import type { MaintenanceRequest, MaintenanceStatus } from "@/lib/types";

const STATUS_FLOW: MaintenanceStatus[] = ["open", "assigned", "in_progress", "resolved", "closed"];

const STATUS_META: Record<MaintenanceStatus, { label: string; color: string; bg: string }> = {
  open:        { label: "เปิด",              color: "#D97706", bg: "#FFF7ED" },
  assigned:    { label: "มอบหมายแล้ว",      color: "#2563EB", bg: "#EFF6FF" },
  in_progress: { label: "กำลังดำเนินการ",   color: "#7C3AED", bg: "#F5F3FF" },
  resolved:    { label: "แก้ไขแล้ว",        color: "#059669", bg: "#ECFDF5" },
  closed:      { label: "ปิด",              color: "#6B7280", bg: "#F9FAFB" },
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "ต่ำ",   color: "#6B7280", bg: "#F3F4F6" },
  medium: { label: "กลาง", color: "#D97706", bg: "#FEF3C7" },
  high:   { label: "สูง",  color: "#DC2626", bg: "#FEE2E2" },
  urgent: { label: "ด่วน!", color: "#991B1B", bg: "#FEE2E2" },
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

export default function MaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [req, setReq] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number | "">("");
  const [actualCost, setActualCost] = useState<number | "">("");
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/maintenance/${id}`)
      .then(r => r.json())
      .then(d => setReq(d.request ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: MaintenanceStatus) {
    setActing(status);
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note: note || undefined,
          estimatedCost: estimatedCost !== "" ? estimatedCost : undefined,
          actualCost: actualCost !== "" ? actualCost : undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) { setReq(d.request); setNote(""); }
    } finally { setActing(null); }
  }

  if (loading) {
    return (
      <div style={{ background: "#F0EDE9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "#C4B9AD" }} />
      </div>
    );
  }

  if (!req) {
    return (
      <div style={{ background: "#F0EDE9", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <p style={{ fontSize: 14, color: "#9C9289" }}>ไม่พบคำร้อง</p>
        <a href="/maintenance" style={{ fontSize: 14, color: "#7C3AED" }}>กลับหน้ารายการ</a>
      </div>
    );
  }

  const meta = STATUS_META[req.status];
  const priorityMeta = PRIORITY_META[req.priority] ?? { label: req.priority, color: "#6B7280", bg: "#F3F4F6" };
  const canUpdateStatus = role === "admin" || role === "maintenance_staff";
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(req.status) + 1] as MaintenanceStatus | undefined;
  const nextLabel: Partial<Record<MaintenanceStatus, string>> = {
    assigned: "มอบหมายงาน", in_progress: "เริ่มดำเนินการ", resolved: "แจ้งแก้ไขแล้ว", closed: "ปิดงาน",
  };

  return (
    <div style={{ background: "#F0EDE9", minHeight: "100vh" }}>
      {/* ── Hero header ─────────────────────────── */}
      <div style={{ padding: "44px 44px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9C9289", marginBottom: 8 }}>
              {req.request_number}
            </p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#1C1815", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 12 }}>
              {req.title}
              {req.priority === "urgent" && (
                <AlertTriangle size={20} style={{ color: "#991B1B", display: "inline", marginLeft: 8, verticalAlign: "middle" }} />
              )}
            </h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: meta.bg, color: meta.color }}>
                {meta.label}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: priorityMeta.bg, color: priorityMeta.color }}>
                ระดับ: {priorityMeta.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────── */}
      <div style={{ padding: "0 44px 48px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Info card */}
        <Card>
          <div style={{ padding: "28px 32px 24px" }}>
            <SectionLabel>ข้อมูลคำร้อง</SectionLabel>
            <InfoRow label="ผู้แจ้ง" value={req.reporter_name} />
            {req.location && <InfoRow label="สถานที่" value={req.location} />}
            {req.category && <InfoRow label="ประเภท" value={req.category.name} />}
            {req.assigned_to_name && <InfoRow label="ช่างที่รับผิดชอบ" value={req.assigned_to_name} />}
            {req.estimated_cost ? <InfoRow label="ค่าใช้จ่ายโดยประมาณ" value={`฿${req.estimated_cost.toLocaleString()}`} /> : null}
            {req.actual_cost ? <InfoRow label="ค่าใช้จ่ายจริง" value={`฿${req.actual_cost.toLocaleString()}`} /> : null}
            <InfoRow label="วันที่แจ้ง" value={new Date(req.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })} />
            {req.description && (
              <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 16, background: "#F8F6F2" }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#C4B9AD", marginBottom: 6 }}>รายละเอียด</p>
                <p style={{ fontSize: 14, color: "#1C1815", lineHeight: 1.6 }}>{req.description}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Status timeline */}
        {req.history && req.history.length > 0 && (
          <Card>
            <div style={{ padding: "28px 32px 24px" }}>
              <SectionLabel>ประวัติสถานะ</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {req.history.map((h, i) => (
                  <div key={h.id ?? i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2,
                    }}>
                      <Clock size={13} style={{ color: "#7C3AED" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1815" }}>
                        {h.new_status ? (STATUS_META[h.new_status as MaintenanceStatus]?.label ?? h.new_status) : "เริ่มต้น"}
                      </p>
                      <p style={{ fontSize: 11, color: "#9C9289", marginTop: 2 }}>
                        {h.changed_by_email} · {new Date(h.changed_at).toLocaleDateString("th-TH")}
                      </p>
                      {h.note && <p style={{ fontSize: 13, color: "#6B6560", marginTop: 4 }}>{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Action panel */}
        {canUpdateStatus && req.status !== "closed" && (
          <Card>
            <div style={{ padding: "28px 32px 24px" }}>
              <SectionLabel>อัปเดตสถานะ</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#9C9289", display: "block", marginBottom: 8 }}>บันทึก (ถ้ามี)</label>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.1)", fontSize: 14,
                      outline: "none", background: "#F8F6F2", color: "#1C1815",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                {(nextStatus === "resolved" || nextStatus === "closed") && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#9C9289", display: "block", marginBottom: 8 }}>ค่าใช้จ่ายโดยประมาณ (฿)</label>
                      <input
                        type="number" min={0} value={estimatedCost}
                        onChange={e => setEstimatedCost(e.target.value === "" ? "" : Number(e.target.value))}
                        style={{
                          width: "100%", padding: "10px 14px", borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.1)", fontSize: 14,
                          outline: "none", background: "#F8F6F2", boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#9C9289", display: "block", marginBottom: 8 }}>ค่าใช้จ่ายจริง (฿)</label>
                      <input
                        type="number" min={0} value={actualCost}
                        onChange={e => setActualCost(e.target.value === "" ? "" : Number(e.target.value))}
                        style={{
                          width: "100%", padding: "10px 14px", borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.1)", fontSize: 14,
                          outline: "none", background: "#F8F6F2", boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {nextStatus && (
                    <button
                      onClick={() => updateStatus(nextStatus)}
                      disabled={!!acting}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "12px 24px", borderRadius: 14, fontSize: 14, fontWeight: 800,
                        background: "linear-gradient(135deg, #a78bfa, #7C3AED)", color: "white",
                        border: "none", cursor: acting ? "not-allowed" : "pointer",
                        opacity: acting ? 0.6 : 1,
                      }}
                    >
                      {acting === nextStatus && <Loader2 size={14} className="animate-spin" />}
                      {nextLabel[nextStatus] ?? nextStatus}
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus("closed")}
                    disabled={!!acting}
                    style={{
                      padding: "12px 24px", borderRadius: 14, fontSize: 14, fontWeight: 800,
                      background: "white", color: "#9C9289",
                      border: "1px solid rgba(0,0,0,0.1)", cursor: acting ? "not-allowed" : "pointer",
                      opacity: acting ? 0.6 : 1,
                    }}
                  >
                    ปิดงาน
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
