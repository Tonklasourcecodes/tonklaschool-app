"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, Loader2, AlertTriangle, Clock } from "lucide-react";
import type { MaintenanceRequest, MaintenanceStatus } from "@/lib/types";

const STATUS_FLOW: MaintenanceStatus[] = ["open", "assigned", "in_progress", "resolved", "closed"];

const STATUS_META: Record<MaintenanceStatus, { label: string; color: string; bg: string }> = {
  open:        { label:"เปิด",              color:"#D97706", bg:"#FFF7ED" },
  assigned:    { label:"มอบหมายแล้ว",      color:"#2563EB", bg:"#EFF6FF" },
  in_progress: { label:"กำลังดำเนินการ",   color:"#7C3AED", bg:"#F5F3FF" },
  resolved:    { label:"แก้ไขแล้ว",        color:"#059669", bg:"#ECFDF5" },
  closed:      { label:"ปิด",              color:"#6B7280", bg:"#F9FAFB" },
};

const PRIORITY_TH: Record<string, string> = { low:"ต่ำ", medium:"กลาง", high:"สูง", urgent:"ด่วน!" };

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
      <div className="min-h-screen flex items-center justify-center" style={{ background:"var(--bg)" }}>
        <Loader2 size={28} className="animate-spin" style={{ color:"var(--subtle)" }} />
      </div>
    );
  }
  if (!req) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background:"var(--bg)" }}>
        <p style={{ color:"var(--muted)" }}>ไม่พบคำร้อง</p>
        <Link href="/maintenance" style={{ marginTop:12, color:"var(--maintenance-accent)", fontSize:14 }}>กลับหน้ารายการ</Link>
      </div>
    );
  }

  const meta = STATUS_META[req.status];
  const canUpdateStatus = role === "admin" || role === "maintenance_staff";
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(req.status) + 1] as MaintenanceStatus | undefined;
  const nextLabel: Partial<Record<MaintenanceStatus, string>> = {
    assigned: "มอบหมายงาน", in_progress: "เริ่มดำเนินการ", resolved: "แจ้งแก้ไขแล้ว", closed: "ปิดงาน",
  };

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)" }}>
      <div style={{ background:"white", borderBottom:"1px solid var(--border)", padding:"16px 24px" }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/maintenance" style={{ color:"var(--subtle)", display:"flex", alignItems:"center" }}>
            <ChevronLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--text)" }} className="truncate">{req.title}</h1>
              {req.priority === "urgent" && <AlertTriangle size={14} style={{ color:"#991B1B", flexShrink:0 }} />}
            </div>
            <p style={{ fontSize:11, color:"var(--subtle)" }}>{req.request_number}</p>
          </div>
          <span style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600, color:meta.color, background:meta.bg, flexShrink:0 }}>
            {meta.label}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {/* Info */}
        <div className="card p-5">
          <h2 style={{ fontSize:11, fontWeight:700, color:"var(--subtle)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>ข้อมูลคำร้อง</h2>
          <div className="grid grid-cols-2 gap-y-3">
            {(
              [
                ["ผู้แจ้ง", req.reporter_name],
                ["ระดับ", PRIORITY_TH[req.priority] ?? req.priority],
                req.location ? ["สถานที่", req.location] : null,
                req.category ? ["ประเภท", req.category.name] : null,
                req.assigned_to_name ? ["ช่างที่รับผิดชอบ", req.assigned_to_name] : null,
                req.estimated_cost ? ["ค่าใช้จ่ายโดยประมาณ", `฿${req.estimated_cost.toLocaleString()}`] : null,
                req.actual_cost ? ["ค่าใช้จ่ายจริง", `฿${req.actual_cost.toLocaleString()}`] : null,
                ["วันที่แจ้ง", new Date(req.created_at).toLocaleDateString("th-TH", { year:"numeric", month:"long", day:"numeric" })],
              ] as ([string, string] | null)[]
            ).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize:11, color:"var(--subtle)", marginBottom:2 }}>{k}</p>
                <p style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{v}</p>
              </div>
            ))}
          </div>
          {req.description && (
            <div style={{ marginTop:14, padding:"10px 14px", borderRadius:12, background:"var(--bg)" }}>
              <p style={{ fontSize:12, color:"var(--muted)", marginBottom:4 }}>รายละเอียด</p>
              <p style={{ fontSize:13, color:"var(--text)", lineHeight:1.6 }}>{req.description}</p>
            </div>
          )}
        </div>

        {/* Status timeline */}
        {req.history && req.history.length > 0 && (
          <div className="card p-5">
            <h2 style={{ fontSize:11, fontWeight:700, color:"var(--subtle)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>ประวัติสถานะ</h2>
            <div className="space-y-3">
              {req.history.map((h, i) => (
                <div key={h.id ?? i} className="flex items-start gap-3">
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--maintenance-light)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                    <Clock size={12} style={{ color:"var(--maintenance-accent)" }} />
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>
                      {h.new_status ? (STATUS_META[h.new_status as MaintenanceStatus]?.label ?? h.new_status) : "เริ่มต้น"}
                    </p>
                    <p style={{ fontSize:11, color:"var(--subtle)", marginTop:1 }}>
                      {h.changed_by_email} · {new Date(h.changed_at).toLocaleDateString("th-TH")}
                    </p>
                    {h.note && <p style={{ fontSize:12, color:"var(--muted)", marginTop:3 }}>{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action panel */}
        {canUpdateStatus && req.status !== "closed" && (
          <div className="card p-5">
            <h2 style={{ fontSize:11, fontWeight:700, color:"var(--subtle)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>อัปเดตสถานะ</h2>
            <div className="space-y-3">
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>บันทึก (ถ้ามี)</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="หมายเหตุเพิ่มเติม"
                  style={{ width:"100%", padding:"8px 12px", borderRadius:10, border:"1px solid var(--border)", fontSize:13, outline:"none" }} />
              </div>
              {(nextStatus === "resolved" || nextStatus === "closed") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>ค่าใช้จ่ายโดยประมาณ (฿)</label>
                    <input type="number" min={0} value={estimatedCost} onChange={e => setEstimatedCost(e.target.value === "" ? "" : Number(e.target.value))}
                      style={{ width:"100%", padding:"8px 12px", borderRadius:10, border:"1px solid var(--border)", fontSize:13, outline:"none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>ค่าใช้จ่ายจริง (฿)</label>
                    <input type="number" min={0} value={actualCost} onChange={e => setActualCost(e.target.value === "" ? "" : Number(e.target.value))}
                      style={{ width:"100%", padding:"8px 12px", borderRadius:10, border:"1px solid var(--border)", fontSize:13, outline:"none" }} />
                  </div>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {nextStatus && (
                  <button onClick={() => updateStatus(nextStatus)} disabled={!!acting}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", borderRadius:12, fontSize:13, fontWeight:700, background:"linear-gradient(135deg,#7C3AED,#6D28D9)", color:"white", border:"none", cursor:"pointer" }}>
                    {acting === nextStatus && <Loader2 size={13} className="animate-spin" />}
                    {nextLabel[nextStatus] ?? nextStatus}
                  </button>
                )}
                <button onClick={() => updateStatus("closed")} disabled={!!acting}
                  style={{ padding:"8px 16px", borderRadius:12, fontSize:13, fontWeight:600, background:"white", color:"var(--muted)", border:"1px solid var(--border)", cursor:"pointer" }}>
                  ปิดงาน
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
