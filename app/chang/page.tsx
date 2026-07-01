"use client";
import { useEffect, useState } from "react";
import { Wrench, RefreshCw, AlertCircle, Clock, CheckCircle2, Search } from "lucide-react";
import type { SheetRepair } from "@/lib/sheets-reader";

const REPAIR_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  "เสร็จสิ้น":     { label: "เสร็จสิ้น",   color: "#059669", bg: "#ECFDF5" },
  "กำลังซ่อม":     { label: "กำลังซ่อม",   color: "#D97706", bg: "#FFF7ED" },
  "รอดำเนินการ":   { label: "รอดำเนินการ", color: "#3B82F6", bg: "#EFF6FF" },
  "": { label: "ไม่ระบุ", color: "#6B7280", bg: "#F3F4F6" },
};

const APPROVAL_META: Record<string, { label: string; color: string }> = {
  "อนุมัติ":    { label: "อนุมัติ",    color: "#059669" },
  "ไม่อนุมัติ": { label: "ไม่อนุมัติ", color: "#DC2626" },
  "":           { label: "รอ",         color: "#D97706" },
};

const ACCENT = "#D97706";
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
    <div style={{ minHeight: "100%", background: "#F0EDE9" }}>
      {/* Header */}
      <div style={{ padding: "44px 44px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: ACCENT, marginBottom: 8 }}>
          ซ่อมบำรุง
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <h1 style={{ fontSize: "clamp(2.8rem,5vw,4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#111110", margin: 0 }}>
            ระบบช่าง
          </h1>
          <button
            onClick={() => load(true)} disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 18px", borderRadius: 12, fontSize: 12, fontWeight: 700,
              border: "none", cursor: refreshing ? "not-allowed" : "pointer",
              background: "white", color: "#78716C",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              marginBottom: 4,
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            รีเฟรช
          </button>
        </div>

        {/* Stat strip */}
        {!loading && (
          <div style={{ display: "flex", gap: 32, marginTop: 20 }}>
            {[
              { label: "ทั้งหมด", count: repairs.length, color: ACCENT },
              { label: "รอดำเนินการ", count: repairs.filter(r => !r.repairStatus || r.repairStatus === "รอดำเนินการ").length, color: "#3B82F6" },
              { label: "เสร็จสิ้น", count: repairs.filter(r => r.repairStatus === "เสร็จสิ้น").length, color: "#059669" },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 900, color: s.color, lineHeight: 1, margin: 0 }}>{s.count}</p>
                <p style={{ fontSize: 11, color: "#A8A29E", marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ padding: "0 44px 24px", marginTop: 28 }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#B4A99E", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหารหัส, ชื่อเรื่อง, ผู้แจ้ง..."
            style={{
              width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 11, paddingBottom: 11,
              borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", fontSize: 13, outline: "none",
              background: "white", color: "#1C1917", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{
                padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: "none",
                background: filterStatus === s ? "#111110" : "white",
                color: filterStatus === s ? "white" : "#78716C",
                boxShadow: filterStatus === s ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
              }}>
              {s === "all" ? "ทั้งหมด" : (s || "ไม่ระบุ")}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 44px 48px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 80, borderRadius: 16, background: "rgba(0,0,0,0.05)", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ background: "white", borderRadius: 24, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", padding: "64px 20px", textAlign: "center" }}>
            <AlertCircle size={40} style={{ color: "#D1C4B5", margin: "0 auto 12px" }} />
            <p style={{ color: "#A8A29E", fontSize: 14 }}>ไม่มีรายการ</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((repair) => {
              const sMeta = REPAIR_STATUS_META[repair.repairStatus] ?? REPAIR_STATUS_META[""];
              const aMeta = APPROVAL_META[repair.approvalStatus] ?? APPROVAL_META[""];
              const isOpen = selected?.code === repair.code;
              return (
                <div key={repair.code}
                  onClick={() => setSelected(isOpen ? null : repair)}
                  style={{
                    background: "white", borderRadius: 20,
                    border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                    padding: "16px 20px", cursor: "pointer",
                    transition: "transform 0.12s, box-shadow 0.12s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", fontFamily: "monospace" }}>{repair.code}</span>
                        {repair.urgency && (
                          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, background: `${ACCENT}18`, color: ACCENT, fontWeight: 700 }}>
                            {repair.urgency}
                          </span>
                        )}
                      </div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "#1C1917", margin: 0 }}>{repair.title}</p>
                      <p style={{ fontSize: 11, color: "#A8A29E", marginTop: 3 }}>
                        {repair.reporterName} · {repair.location}{repair.floor && ` ชั้น${repair.floor}`} · {repair.reportedAt.slice(0, 10)}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: aMeta.color }}>{aMeta.label}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: sMeta.color, background: sMeta.bg }}>
                        {sMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.06)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[
                        { label: "ประเภทงาน", value: repair.category },
                        { label: "รายละเอียด", value: repair.description },
                        { label: "สถานที่", value: `${repair.location} ${repair.locationDetail}` },
                        { label: "ช่าง", value: repair.technicianName || "-" },
                        { label: "หมายเหตุการซ่อม", value: repair.repairNote || "-" },
                        ...(repair.totalCost > 0 ? [{ label: "ค่าใช้จ่าย", value: `฿${repair.totalCost.toLocaleString()}` }] : []),
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: "#A8A29E" }}>{label}</p>
                          <p style={{ fontSize: 12, color: "#1C1917", marginTop: 2 }}>{value}</p>
                        </div>
                      ))}
                      {[repair.photo1, repair.photo2, repair.photo3].filter(Boolean).length > 0 && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: "#A8A29E", marginBottom: 8 }}>รูปภาพ</p>
                          <div style={{ display: "flex", gap: 8 }}>
                            {[repair.photo1, repair.photo2, repair.photo3].filter(Boolean).map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                style={{ display: "block", width: 60, height: 60, borderRadius: 10, background: "#F0EDE9", overflow: "hidden", flexShrink: 0 }}>
                                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />
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
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 16, fontSize: 13, fontWeight: 700,
                  background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#78716C", cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                แสดงเพิ่ม ({filtered.length - shown} รายการ)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
