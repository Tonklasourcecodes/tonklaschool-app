"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PO } from "@/lib/types-po";

const S = {
  "รออนุมัติ":   { bg: "#FEF3C7", text: "#92400E", dot: "#D97706" },
  "อนุมัติแล้ว": { bg: "#DCFCE7", text: "#14532D", dot: "#16A34A" },
  "ยกเลิก":     { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
};

function Badge({ status }: { status: string }) {
  const s = S[status as keyof typeof S];
  if (!s) return <span style={{ fontSize: 11, color: "#B4A99E" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.text }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />{status}
    </span>
  );
}

function fmt(val: string) {
  const n = parseFloat((val ?? "").replace(/,/g, ""));
  return isNaN(n) ? "—" : n.toLocaleString("th-TH", { maximumFractionDigits: 0 }) + " ฿";
}

function parseTH(d: string) {
  const p = (d ?? "").split("/");
  if (p.length !== 3) return null;
  const ce = parseInt(p[2]) > 2500 ? parseInt(p[2]) - 543 : parseInt(p[2]);
  const dt = new Date(ce, parseInt(p[1]) - 1, parseInt(p[0]));
  return isNaN(dt.getTime()) ? null : dt;
}

const DATE_OPTS = [
  { k: "all", l: "ทั้งหมด" }, { k: "month", l: "เดือนนี้" },
  { k: "3month", l: "3 เดือน" }, { k: "year", l: "ปีนี้" },
];
const STATUS_OPTS = [
  { k: "all", l: "ทุกสถานะ" }, { k: "รออนุมัติ", l: "รออนุมัติ" },
  { k: "อนุมัติแล้ว", l: "อนุมัติแล้ว" }, { k: "ยกเลิก", l: "ยกเลิก" },
];

export default function POListPage() {
  const router = useRouter();
  const [pos, setPos] = useState<PO[]>([]);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [dateF, setDateF] = useState("all");
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(40);
  const now = new Date();

  useEffect(() => {
    setLoading(true);
    fetch("/api/po?q=").then(r => r.json())
      .then(d => setPos(d.pos ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPageSize(40); }, [search, statusF, dateF]);

  function inRange(ds: string) {
    if (dateF === "all") return true;
    const d = parseTH(ds); if (!d) return false;
    if (dateF === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateF === "3month") { const c = new Date(now); c.setMonth(c.getMonth() - 3); return d >= c; }
    if (dateF === "year") return d.getFullYear() === now.getFullYear();
    return true;
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pos.filter(p =>
      (!q || [p.poNumber, p.supplierName, p.requester].join(" ").toLowerCase().includes(q)) &&
      (statusF === "all" || p.approvalStatus === statusF) &&
      inRange(p.orderDate)
    );
  }, [pos, search, statusF, dateF]);

  const counts = useMemo(() => {
    const r: Record<string, number> = { all: pos.length };
    for (const p of pos) r[p.approvalStatus] = (r[p.approvalStatus] ?? 0) + 1;
    return r;
  }, [pos]);

  const totalValue = useMemo(() => displayed.reduce((s, p) => s + (parseFloat((p.grandTotal || "0").replace(/,/g, "")) || 0), 0), [displayed]);
  const paged = displayed.slice(0, pageSize);
  const anyFilter = statusF !== "all" || dateF !== "all" || search !== "";

  return (
    <div style={{ minHeight: "100%", background: "#F0EDE9" }}>

      {/* ── Big header ── */}
      <div style={{ padding: "44px 44px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9C9289", marginBottom: 8 }}>จัดซื้อ</p>
            <h1 style={{ fontSize: "clamp(2.8rem,5vw,4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#1C1815", margin: 0 }}>
              ใบสั่งซื้อ
              <br />
              <span style={{ color: "#059669" }}>PO</span>
            </h1>
          </div>
          <Link href="/po/new" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 16,
            background: "#059669", color: "white", fontWeight: 800, fontSize: 14,
            textDecoration: "none", boxShadow: "0 4px 20px rgba(5,150,105,0.3)", letterSpacing: "-0.01em",
          }}>
            <Plus size={15} strokeWidth={2.5} /> สร้าง PO ใหม่
          </Link>
        </div>

        {/* Stat strip */}
        <div style={{ display: "flex", gap: 0, marginBottom: 32, borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 24 }}>
          {[
            { label: "ทั้งหมด", value: counts.all ?? 0, accent: "#1C1815" },
            { label: "รออนุมัติ", value: counts["รออนุมัติ"] ?? 0, accent: "#D97706" },
            { label: "อนุมัติแล้ว", value: counts["อนุมัติแล้ว"] ?? 0, accent: "#059669" },
            { label: "ยกเลิก", value: counts["ยกเลิก"] ?? 0, accent: "#DC2626" },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, paddingRight: 24, borderRight: i < 3 ? "1px solid rgba(0,0,0,0.07)" : "none", paddingLeft: i > 0 ? 24 : 0 }}>
              <div style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 900, letterSpacing: "-0.05em", color: loading ? "#D4C8BC" : s.accent, lineHeight: 1, marginBottom: 4 }}>
                {loading ? "—" : s.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9C9289" }}>{s.label}</div>
            </div>
          ))}
          <div style={{ flex: 1.5, paddingLeft: 24 }}>
            <div style={{ fontSize: "clamp(1.2rem,2vw,1.8rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#1C1815", lineHeight: 1, marginBottom: 4 }}>
              {loading ? "—" : totalValue.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
              <span style={{ fontSize: "0.45em", color: "#9C9289", marginLeft: 5 }}>฿</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9C9289" }}>
              {displayed.length !== pos.length ? `มูลค่า (${displayed.length} รายการ)` : "มูลค่ารวม"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ padding: "0 44px 24px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={13} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#B4A99E" }} />
          <input
            style={{ width: "100%", paddingLeft: 36, paddingRight: search ? 32 : 14, paddingTop: 10, paddingBottom: 10, background: "white", border: "1.5px solid rgba(0,0,0,0.07)", borderRadius: 14, fontSize: 13, color: "#1C1815", outline: "none", boxSizing: "border-box" }}
            placeholder="ค้นหา PO, ร้านค้า, ผู้สั่ง..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#B4A99E" }}><X size={13} /></button>}
        </div>

        {/* Status pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {STATUS_OPTS.map(o => {
            const active = statusF === o.k;
            const s = S[o.k as keyof typeof S];
            return (
              <button key={o.k} onClick={() => setStatusF(o.k)} style={{
                padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.12s",
                background: active ? (s?.bg ?? "#1C1815") : "white",
                color: active ? (s?.text ?? "white") : "#78716C",
                boxShadow: active ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
              }}>{o.l}{o.k !== "all" && ` ${counts[o.k] ?? 0}`}</button>
            );
          })}
        </div>

        {/* Date pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {DATE_OPTS.map(o => (
            <button key={o.k} onClick={() => setDateF(o.k)} style={{
              padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
              background: dateF === o.k ? "#0D1F14" : "white",
              color: dateF === o.k ? "#34d399" : "#78716C",
              boxShadow: dateF === o.k ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
            }}>{o.l}</button>
          ))}
        </div>

        {anyFilter && (
          <button onClick={() => { setSearch(""); setStatusF("all"); setDateF("all"); }} style={{
            padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
            background: "#FEE2E2", color: "#991B1B",
          }}>ล้างทั้งหมด</button>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ padding: "0 44px 48px" }}>
        <div style={{ background: "white", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {[...Array(8)].map((_, i) => <div key={i} style={{ height: 52, borderRadius: 12, background: "#F5F2EE", marginBottom: 8 }} />)}
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#A8A29E", marginBottom: 4 }}>ไม่พบใบสั่งซื้อ</p>
              <p style={{ fontSize: 12, color: "#C4B9AD" }}>ลองเปลี่ยนตัวกรอง หรือสร้าง PO ใหม่</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 130px auto 130px", gap: 12, padding: "11px 24px", background: "rgba(0,0,0,0.015)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                {["เลขที่ PO", "ร้านค้า / ผู้จัดหา", "ผู้สั่งซื้อ", "มูลค่า", "สถานะ"].map(h => (
                  <div key={h} style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#C4B9AD" }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {paged.map((po, i) => (
                <div key={po.poNumber}
                  onClick={() => router.push(`/po/${po.poNumber.replace(/\//g, "~")}`)}
                  style={{
                    display: "grid", gridTemplateColumns: "150px 1fr 130px auto 130px", gap: 12, alignItems: "center",
                    padding: "16px 24px", borderBottom: i < paged.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#FAFAF8"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                >
                  <div>
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, padding: "4px 9px", borderRadius: 7, background: "#ECFDF5", color: "#15803D" }}>{po.poNumber}</span>
                    <div style={{ fontSize: 10, color: "#B4A99E", marginTop: 4 }}>{po.orderDate || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1815", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.supplierName}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#78716C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.requester || "—"}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1C1815", textAlign: "right", whiteSpace: "nowrap" }}>{fmt(po.grandTotal)}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Badge status={po.approvalStatus} />
                    <ChevronRight size={13} style={{ color: "#D4C8BC" }} />
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(0,0,0,0.04)", background: "rgba(0,0,0,0.01)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#B4A99E" }}>
                  แสดง <strong style={{ color: "#78716C" }}>{paged.length}</strong> จาก {displayed.length} รายการ
                  {displayed.length !== pos.length && ` · กรองจาก ${pos.length}`}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {displayed.length > pageSize && (
                    <button onClick={() => setPageSize(p => p + 40)} style={{
                      fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: "#ECFDF5", color: "#15803D",
                    }}>
                      แสดงเพิ่ม {displayed.length - pageSize} รายการ
                    </button>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#059669" }}>
                    {totalValue.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
