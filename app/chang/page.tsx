"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Wrench, RefreshCw, AlertCircle, Clock, CheckCircle2, Search } from "lucide-react";
import type { SheetRepair } from "@/lib/sheets-reader";

const REPAIR_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  "เสร็จสิ้น":     { label:"เสร็จสิ้น",   color:"#059669", bg:"#ECFDF5" },
  "กำลังซ่อม":     { label:"กำลังซ่อม",  color:"#D97706", bg:"#FFF7ED" },
  "รอดำเนินการ":   { label:"รอดำเนินการ", color:"#3B82F6", bg:"#EFF6FF" },
  "": { label:"ไม่ระบุ", color:"#6B7280", bg:"#F3F4F6" },
};

const APPROVAL_META: Record<string, { label: string; color: string }> = {
  "อนุมัติ": { label:"อนุมัติ", color:"#059669" },
  "ไม่อนุมัติ": { label:"ไม่อนุมัติ", color:"#DC2626" },
  "": { label:"รอ", color:"#D97706" },
};

const ACCENT = "#7C3AED";
const PAGE_SIZE = 30;

export default function ChangPage() {
  const [repairs, setRepairs] = useState<SheetRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<SheetRepair | null>(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch("/api/chang");
      const d = await res.json();
      setRepairs(d.repairs ?? []);
      setShown(PAGE_SIZE);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = repairs.filter(r => {
    const matchSearch = !search || [r.code, r.title, r.reporterName, r.location, r.category].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.repairStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const visible = filtered.slice(0, shown);
  const statuses = ["all", ...Array.from(new Set(repairs.map(r => r.repairStatus)))];

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)" }}>
      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid var(--border)", padding:"16px 24px" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-1">
              <Link href="/" style={{ color:"var(--subtle)", display:"flex" }}><ChevronLeft size={18}/></Link>
              <div className="flex items-center gap-2">
                <Wrench size={18} style={{ color: ACCENT }}/>
                <h1 style={{ fontWeight:700, fontSize:"1.1rem", color:"var(--text)" }}>ระบบช่าง</h1>
              </div>
            </div>
            <button onClick={() => load(true)} disabled={refreshing}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:10,
                background:"white", border:"1px solid var(--border)", color:"var(--muted)", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""}/>
              รีเฟรช
            </button>
          </div>
          <p style={{ fontSize:12, color:"var(--subtle)", marginLeft:42 }}>
            {repairs.length} รายการ (ข้อมูลจาก Google Sheets · อ่านอย่างเดียว)
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label:"ทั้งหมด", count: repairs.length, Icon: Wrench, color: ACCENT },
              { label:"รอดำเนินการ", count: repairs.filter(r=>!r.repairStatus||r.repairStatus==="รอดำเนินการ").length, Icon: Clock, color:"#D97706" },
              { label:"เสร็จสิ้น", count: repairs.filter(r=>r.repairStatus==="เสร็จสิ้น").length, Icon: CheckCircle2, color:"#059669" },
            ].map(s => (
              <div key={s.label} className="card p-4 flex items-center gap-3">
                <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <s.Icon size={16} style={{ color: s.color }}/>
                </div>
                <div>
                  <p style={{ fontSize:"1.3rem", fontWeight:800, color:"var(--text)", lineHeight:1 }}>{s.count}</p>
                  <p style={{ fontSize:10, color:"var(--subtle)", marginTop:2 }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search + filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div style={{ position:"relative", flex:1, minWidth:200 }}>
            <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--subtle)" }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหารหัส, ชื่อเรื่อง, ผู้แจ้ง..."
              style={{ width:"100%", padding:"7px 10px 7px 32px", borderRadius:10, border:"1px solid var(--border)", fontSize:13, outline:"none" }}/>
          </div>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
                background: filterStatus===s ? "var(--text)" : "white",
                color: filterStatus===s ? "white" : "var(--muted)",
                border:`1px solid ${filterStatus===s ? "var(--text)" : "var(--border)"}` }}>
              {s === "all" ? "ทั้งหมด" : (s || "ไม่ระบุ")}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton" style={{ height:72, borderRadius:14 }}/>)}</div>
        ) : visible.length === 0 ? (
          <div className="card p-16 text-center">
            <AlertCircle size={40} style={{ color:"#D1C4B5", margin:"0 auto 12px" }}/>
            <p style={{ color:"var(--subtle)", fontSize:14 }}>ไม่มีรายการ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((repair, i) => {
              const sMeta = REPAIR_STATUS_META[repair.repairStatus] ?? REPAIR_STATUS_META[""];
              const aMeta = APPROVAL_META[repair.approvalStatus] ?? APPROVAL_META[""];
              return (
                <div key={repair.code} onClick={() => setSelected(selected?.code === repair.code ? null : repair)}
                  className="card px-5 py-4 cursor-pointer hover:-translate-y-0.5 transition-all anim-in"
                  style={{ animationDelay:`${i*0.02}s` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize:10, fontWeight:700, color:"var(--subtle)", fontFamily:"monospace" }}>{repair.code}</span>
                        {repair.urgency && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:20, background:`${ACCENT}18`, color:ACCENT, fontWeight:600 }}>{repair.urgency}</span>}
                      </div>
                      <p style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>{repair.title}</p>
                      <p style={{ fontSize:11, color:"var(--subtle)", marginTop:2 }}>
                        {repair.reporterName} · {repair.location} {repair.floor && `ชั้น${repair.floor}`} · {repair.reportedAt.slice(0,10)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span style={{ fontSize:11, fontWeight:600, color: aMeta.color }}>
                        {aMeta.label}
                      </span>
                      <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, color:sMeta.color, background:sMeta.bg }}>
                        {sMeta.label}
                      </span>
                    </div>
                  </div>
                  {/* Expanded detail */}
                  {selected?.code === repair.code && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid var(--border)" }} className="grid grid-cols-2 gap-3">
                      {[
                        { label:"ประเภทงาน", value: repair.category },
                        { label:"รายละเอียด", value: repair.description },
                        { label:"สถานที่", value: `${repair.location} ${repair.locationDetail}` },
                        { label:"ช่าง", value: repair.technicianName || "-" },
                        { label:"หมายเหตุการซ่อม", value: repair.repairNote || "-" },
                        ...(repair.totalCost > 0 ? [{ label:"ค่าใช้จ่าย", value: `฿${repair.totalCost.toLocaleString()}` }] : []),
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p style={{ fontSize:10, fontWeight:600, color:"var(--subtle)" }}>{label}</p>
                          <p style={{ fontSize:12, color:"var(--text)", marginTop:2 }}>{value}</p>
                        </div>
                      ))}
                      {[repair.photo1, repair.photo2, repair.photo3].filter(Boolean).length > 0 && (
                        <div className="col-span-2">
                          <p style={{ fontSize:10, fontWeight:600, color:"var(--subtle)", marginBottom:6 }}>รูปภาพ</p>
                          <div className="flex gap-2">
                            {[repair.photo1, repair.photo2, repair.photo3].filter(Boolean).map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                style={{ display:"block", width:60, height:60, borderRadius:8, background:"var(--border)", overflow:"hidden", flexShrink:0 }}>
                                <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => (e.currentTarget.style.display="none")}/>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {shown < filtered.length && (
              <button onClick={() => setShown(s => s + PAGE_SIZE)}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background:"white", border:"1px solid var(--border)", color:"var(--muted)" }}>
                แสดงเพิ่ม ({filtered.length - shown} รายการ)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
