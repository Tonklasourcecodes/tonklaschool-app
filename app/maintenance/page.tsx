"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Wrench, Plus, AlertTriangle } from "lucide-react";
import type { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from "@/lib/types";

const STATUS_META: Record<MaintenanceStatus, { label: string; color: string; bg: string }> = {
  open:        { label:"เปิด",              color:"#D97706", bg:"#FFF7ED" },
  assigned:    { label:"มอบหมายแล้ว",      color:"#2563EB", bg:"#EFF6FF" },
  in_progress: { label:"กำลังดำเนินการ",   color:"#7C3AED", bg:"#F5F3FF" },
  resolved:    { label:"แก้ไขแล้ว",        color:"#059669", bg:"#ECFDF5" },
  closed:      { label:"ปิด",              color:"#6B7280", bg:"#F9FAFB" },
};

const PRIORITY_META: Record<MaintenancePriority, { label: string; color: string; bg: string }> = {
  low:    { label:"ต่ำ",    color:"#6B7280", bg:"#F3F4F6" },
  medium: { label:"กลาง",  color:"#D97706", bg:"#FFF7ED" },
  high:   { label:"สูง",   color:"#DC2626", bg:"#FEE2E2" },
  urgent: { label:"ด่วน!", color:"#991B1B", bg:"#FEF2F2" },
};

const ACCENT = "#7C3AED";
const PAGE_SIZE = 30;

const FILTER_OPTIONS = ["all", "open", "assigned", "in_progress", "resolved"] as const;
type FilterOption = typeof FILTER_OPTIONS[number];

export default function MaintenancePage() {
  const { data: session } = useSession();
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
  const counts = {
    all: requests.length,
    open: requests.filter(r => r.status === "open").length,
    in_progress: requests.filter(r => r.status === "in_progress").length,
    resolved: requests.filter(r => r.status === "resolved").length,
    urgent: requests.filter(r => r.priority === "urgent").length,
  };

  const filterLabel = (s: FilterOption) => {
    if (s === "all") return "ทั้งหมด";
    return STATUS_META[s as MaintenanceStatus]?.label ?? s;
  };

  return (
    <div style={{ minHeight: "100%", background: "#F0EDE9" }}>
      {/* Header */}
      <div style={{ padding: "44px 44px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9C9289", marginBottom: 8 }}>ซ่อมบำรุง</p>
            <h1 style={{ fontSize: "clamp(2.8rem,5vw,4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#1C1815", margin: 0 }}>
              แจ้งซ่อม<br /><span style={{ color: ACCENT }}>ซ่อมบำรุง</span>
            </h1>
          </div>
          <Link href="/maintenance/new" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 20px", borderRadius: 16,
            background: ACCENT, color: "white",
            fontWeight: 700, fontSize: 14, textDecoration: "none",
            boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
            flexShrink: 0,
          }}>
            <Plus size={16} /> แจ้งซ่อม
          </Link>
        </div>

        {/* Stat strip */}
        <div style={{
          background: "white", borderRadius: 24,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          display: "flex",
        }}>
          {[
            { label: "ทั้งหมด", value: counts.all, accent: false },
            { label: "รอดำเนินการ", value: counts.open, accent: false },
            { label: "กำลังดำเนินการ", value: counts.in_progress, accent: false },
            { label: "แก้ไขแล้ว", value: counts.resolved, accent: false },
            { label: "ด่วน", value: counts.urgent, accentRed: true },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{
              flex: 1, padding: "24px 28px",
              borderRight: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none",
            }}>
              <div style={{
                fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 900, lineHeight: 1,
                color: "accentRed" in stat && stat.accentRed ? "#DC2626" : (stat.accent ? ACCENT : "#1C1815"),
              }}>
                {loading ? "—" : stat.value}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9C9289", marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "20px 44px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FILTER_OPTIONS.map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: filter === s ? "#1C1815" : "white",
              color: filter === s ? ACCENT : "#9C9289",
              boxShadow: filter === s ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
              transition: "all 0.15s",
            }}>
              {filterLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 44px 48px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 90, background: "#F5F2EE", borderRadius: 16 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 24,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            padding: "64px 32px", textAlign: "center",
          }}>
            <Wrench size={40} style={{ color: "#D1C4B5", margin: "0 auto 12px" }} />
            <p style={{ color: "#9C9289", fontSize: 14 }}>ไม่มีรายการ</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((req) => {
              const sMeta = STATUS_META[req.status];
              const pMeta = PRIORITY_META[req.priority];
              return (
                <Link key={req.id} href={`/maintenance/${req.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: "white", borderRadius: 20,
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                    padding: "16px 24px",
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
                    cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
                    {/* Left */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, background: "#F5F2EE", color: "#6B6259", padding: "4px 10px", borderRadius: 8, flexShrink: 0 }}>
                          {req.request_number}
                        </span>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "#1C1815", margin: 0 }}>{req.title}</p>
                        {req.priority === "urgent" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#991B1B", background: "#FEF2F2", padding: "2px 8px", borderRadius: 10 }}>
                            <AlertTriangle size={9} /> ด่วน
                          </span>
                        )}
                      </div>
                      {req.location && (
                        <p style={{ fontSize: 12, color: "#9C9289", margin: 0 }}>{req.location}</p>
                      )}
                      {req.category && (
                        <p style={{ fontSize: 12, color: "#9C9289", marginTop: 2 }}>{req.category.name}</p>
                      )}
                    </div>
                    {/* Right */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 700,
                        padding: "3px 10px", borderRadius: 20,
                        color: sMeta.color, background: sMeta.bg,
                      }}>
                        {sMeta.label}
                      </span>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 700,
                        padding: "3px 10px", borderRadius: 20,
                        color: pMeta.color, background: pMeta.bg,
                      }}>
                        {pMeta.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {shown < requests.length && (
              <button onClick={() => setShown(s => s + PAGE_SIZE)} style={{
                width: "100%", padding: "14px", borderRadius: 16, fontSize: 13, fontWeight: 700,
                background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#9C9289",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                แสดงเพิ่ม ({requests.length - shown} รายการ)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
