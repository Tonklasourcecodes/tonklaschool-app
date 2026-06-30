"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Wrench, Plus, ChevronLeft, AlertTriangle, CheckCircle2, Clock, UserCheck } from "lucide-react";
import type { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from "@/lib/types";

const STATUS_META: Record<MaintenanceStatus, { label: string; color: string; bg: string }> = {
  open:        { label:"เปิด",              color:"#D97706", bg:"#FFF7ED" },
  assigned:    { label:"มอบหมายแล้ว",      color:"#2563EB", bg:"#EFF6FF" },
  in_progress: { label:"กำลังดำเนินการ",   color:"#7C3AED", bg:"#F5F3FF" },
  resolved:    { label:"แก้ไขแล้ว",        color:"#059669", bg:"#ECFDF5" },
  closed:      { label:"ปิด",              color:"#6B7280", bg:"#F9FAFB" },
};

const PRIORITY_META: Record<MaintenancePriority, { label: string; color: string }> = {
  low:    { label:"ต่ำ",    color:"#6B7280" },
  medium: { label:"กลาง",  color:"#D97706" },
  high:   { label:"สูง",   color:"#DC2626" },
  urgent: { label:"ด่วน!", color:"#991B1B" },
};

const PAGE_SIZE = 30;

export default function MaintenancePage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MaintenanceStatus | "all">("all");
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    setLoading(true);
    const qs = filter !== "all" ? `?status=${filter}` : "";
    fetch(`/api/maintenance${qs}`)
      .then((r) => r.json())
      .then((d) => { setRequests(d.requests ?? []); setShown(PAGE_SIZE); })
      .finally(() => setLoading(false));
  }, [filter]);

  const visible = requests.slice(0, shown);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid var(--border)", padding:"16px 24px" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/" style={{ color:"var(--subtle)", display:"flex", alignItems:"center" }}>
              <ChevronLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <Wrench size={18} style={{ color:"var(--maintenance-accent)" }} />
              <h1 style={{ fontWeight:700, fontSize:"1.1rem", color:"var(--text)" }}>ระบบแจ้งซ่อม</h1>
            </div>
          </div>
          <p style={{ fontSize:12, color:"var(--subtle)", marginLeft:42 }}>{requests.length} รายการ</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Actions + Filters */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {(["all","open","assigned","in_progress","resolved"] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                style={{
                  padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
                  background: filter === s ? "var(--text)" : "white",
                  color: filter === s ? "white" : "var(--muted)",
                  border: `1px solid ${filter === s ? "var(--text)" : "var(--border)"}`,
                  transition:"all 0.15s",
                }}>
                {s === "all" ? "ทั้งหมด" : STATUS_META[s]?.label}
              </button>
            ))}
          </div>
          <Link href="/maintenance/new"
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:12, background:"linear-gradient(135deg,#7C3AED,#6D28D9)", color:"white", fontWeight:700, fontSize:13, textDecoration:"none", boxShadow:"0 3px 10px rgba(124,58,237,0.25)" }}>
            <Plus size={15} /> แจ้งซ่อม
          </Link>
        </div>

        {/* Stats row for admin/maintenance_staff */}
        {(role === "admin" || role === "maintenance_staff") && !loading && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label:"รอดำเนินการ", count: requests.filter(r => r.status === "open").length, icon:<Clock size={16}/>, color:"#D97706" },
              { label:"กำลังดำเนินการ", count: requests.filter(r => r.status === "in_progress").length, icon:<UserCheck size={16}/>, color:"#7C3AED" },
              { label:"แก้ไขแล้ว", count: requests.filter(r => r.status === "resolved").length, icon:<CheckCircle2 size={16}/>, color:"#059669" },
            ].map((s) => (
              <div key={s.label} className="card p-4 text-center">
                <div style={{ color:s.color, margin:"0 auto 6px", width:"fit-content" }}>{s.icon}</div>
                <p style={{ fontSize:"1.4rem", fontWeight:800, color:"var(--text)" }}>{s.count}</p>
                <p style={{ fontSize:10, color:"var(--subtle)", marginTop:2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:90, borderRadius:14 }} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="card p-16 text-center">
            <Wrench size={40} style={{ color:"#D1C4B5", margin:"0 auto 12px" }} />
            <p style={{ color:"var(--subtle)", fontSize:14 }}>ไม่มีรายการ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((req, i) => {
              const sMeta = STATUS_META[req.status];
              const pMeta = PRIORITY_META[req.priority];
              return (
                <Link key={req.id} href={`/maintenance/${req.id}`} style={{ textDecoration:"none" }}>
                  <div className="card px-5 py-4 flex items-start justify-between gap-4 hover:-translate-y-0.5 transition-all cursor-pointer anim-in"
                    style={{ animationDelay:`${i * 0.03}s` }}>
                    {/* Left */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div style={{ width:38, height:38, borderRadius:10, background:"var(--maintenance-light)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                        <Wrench size={16} style={{ color:"var(--maintenance-accent)" }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>{req.title}</p>
                          {req.priority === "urgent" && (
                            <span className="flex items-center gap-1" style={{ fontSize:10, fontWeight:700, color:"#991B1B", background:"#FEF2F2", padding:"1px 6px", borderRadius:10 }}>
                              <AlertTriangle size={9} /> ด่วน
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize:11, color:"var(--subtle)", marginTop:2 }}>
                          {req.request_number} · {req.reporter_name}
                          {req.location && ` · ${req.location}`}
                        </p>
                        {req.category && (
                          <p style={{ fontSize:11, color:"var(--subtle)", marginTop:1 }}>{req.category.name}</p>
                        )}
                      </div>
                    </div>
                    {/* Right */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, color:sMeta.color, background:sMeta.bg }}>
                        {sMeta.label}
                      </span>
                      <span style={{ fontSize:11, fontWeight:600, color:pMeta.color }}>
                        ความสำคัญ{pMeta.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {shown < requests.length && (
              <button onClick={() => setShown(s => s + PAGE_SIZE)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:bg-stone-50"
                style={{ background:"white", border:"1px solid var(--border)", color:"var(--muted)" }}>
                แสดงเพิ่ม ({requests.length - shown} รายการ)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
