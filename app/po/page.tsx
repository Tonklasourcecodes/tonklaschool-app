"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, FileText, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { SkeletonTableRow } from "@/components/Skeleton";
import { useRouter } from "next/navigation";
import type { PO } from "@/lib/types-po";

const STATUS_MAP: Record<string, { dot: string; label: string; pill: string; text: string }> = {
  "รออนุมัติ":   { dot: "#D97706", label: "รออนุมัติ",   pill: "#FEF3C7", text: "#92400E" },
  "อนุมัติแล้ว": { dot: "#16A34A", label: "อนุมัติแล้ว", pill: "#DCFCE7", text: "#14532D" },
  "ยกเลิก":     { dot: "#DC2626", label: "ยกเลิก",     pill: "#FEE2E2", text: "#991B1B" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status];
  if (!s) return <span className="text-xs" style={{ color: "#B4A99E" }}>—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: s.pill, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function fmt(val: string) {
  const n = parseFloat((val ?? "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2 }) + " ฿";
}

function parseTHDate(d: string): Date | null {
  const parts = (d ?? "").split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const ce = parseInt(year) > 2500 ? parseInt(year) - 543 : parseInt(year);
  const dt = new Date(ce, parseInt(month) - 1, parseInt(day));
  return isNaN(dt.getTime()) ? null : dt;
}

const DATE_PRESETS = [
  { key: "all",    label: "ทั้งหมด" },
  { key: "month",  label: "เดือนนี้" },
  { key: "3month", label: "3 เดือน" },
  { key: "year",   label: "ปีนี้" },
];

const STATUS_FILTERS = [
  { key: "all",        label: "ทุกสถานะ" },
  { key: "รออนุมัติ",   label: "รออนุมัติ" },
  { key: "อนุมัติแล้ว", label: "อนุมัติแล้ว" },
  { key: "ยกเลิก",     label: "ยกเลิก" },
];

export default function POListPage() {
  const router = useRouter();
  const [pos, setPos] = useState<PO[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [requesterFilter, setRequesterFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(30);

  const now = new Date();

  useEffect(() => {
    setLoading(true);
    fetch("/api/po?q=")
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setPos(d.pos ?? []); })
      .catch((e) => setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"))
      .finally(() => setLoading(false));
  }, []);

  const requesters = useMemo(
    () => ["all", ...Array.from(new Set(pos.map((p) => p.requester).filter(Boolean))).sort()],
    [pos]
  );

  function inDateRange(dateStr: string) {
    if (dateFilter === "all") return true;
    const d = parseTHDate(dateStr);
    if (!d) return false;
    if (dateFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateFilter === "3month") { const c = new Date(now); c.setMonth(c.getMonth() - 3); return d >= c; }
    if (dateFilter === "year") return d.getFullYear() === now.getFullYear();
    return true;
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pos.filter((po) => {
      const matchSearch = !q || [po.poNumber, po.supplierName, po.requester].join(" ").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || po.approvalStatus === statusFilter;
      const matchDate = inDateRange(po.orderDate);
      const matchReq = requesterFilter === "all" || po.requester === requesterFilter;
      return matchSearch && matchStatus && matchDate && matchReq;
    });
  }, [pos, search, statusFilter, dateFilter, requesterFilter]);

  const counts = useMemo(() => {
    const r: Record<string, number> = { all: pos.length };
    for (const po of pos) r[po.approvalStatus] = (r[po.approvalStatus] ?? 0) + 1;
    return r;
  }, [pos]);

  const totalValue = useMemo(() =>
    displayed.reduce((sum, po) => sum + (parseFloat((po.grandTotal || "0").replace(/,/g, "")) || 0), 0),
    [displayed]
  );

  const activeFilterCount = [
    statusFilter !== "all",
    dateFilter !== "all",
    requesterFilter !== "all",
  ].filter(Boolean).length;

  // Reset to first page when filters change
  useEffect(() => { setPageSize(30); }, [search, statusFilter, dateFilter, requesterFilter]);

  function clearFilters() {
    setStatusFilter("all");
    setDateFilter("all");
    setRequesterFilter("all");
    setSearch("");
  }

  const paged = displayed.slice(0, pageSize);
  const hasMore = displayed.length > pageSize;

  return (
    <div className="min-h-full" style={{ background: "var(--bg)" }}>
      {/* Page header */}
      <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1C1815", letterSpacing: "-0.025em" }}>ใบสั่งซื้อ (PO)</h1>
            <p style={{ fontSize: 13, color: "#9C9289", marginTop: 4 }}>
              {loading ? "กำลังโหลด..." : `${pos.length} รายการทั้งหมด`}
            </p>
          </div>
          <Link
            href="/po/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
            style={{
              color: "white",
              background: "#059669",
              boxShadow: "0 2px 10px rgba(5,150,105,0.25)",
              textDecoration: "none",
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            สร้าง PO ใหม่
          </Link>
        </div>

        {/* Summary chips */}
        {!loading && (
          <div className="flex items-center gap-2 flex-wrap mt-4">
            {Object.entries(STATUS_MAP).map(([key, s]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: statusFilter === key ? s.pill : "white",
                  color: statusFilter === key ? s.text : "#9C9289",
                  border: statusFilter === key ? `1px solid ${s.dot}50` : "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusFilter === key ? s.dot : "#D4C8BC" }} />
                {key}
                <span className="font-bold tabular-nums">{counts[key] ?? 0}</span>
              </button>
            ))}
            <div className="ml-auto text-right">
              <span className="text-xs" style={{ color: "#B4A99E" }}>ยอดรวมที่แสดง</span>
              <div className="text-sm font-bold tabular-nums" style={{ color: "#059669" }}>
                {totalValue.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 md:px-8 py-5">
        {/* Search + filter toggle */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#B4A99E" }} />
            <input
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
              style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#1C1917", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              placeholder="ค้นหาเลขที่ PO, ร้านค้า, ผู้สั่ง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = "#16A34A"; e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.08)"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: showFilters || activeFilterCount > 0 ? "#ECFDF5" : "white",
              color: showFilters || activeFilterCount > 0 ? "#16A34A" : "#78716C",
              border: showFilters || activeFilterCount > 0 ? "1px solid #BBF7D0" : "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <SlidersHorizontal size={14} />
            ตัวกรอง
            {activeFilterCount > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#16A34A", color: "white" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div
            className="bg-white rounded-2xl p-4 mb-4 space-y-4"
            style={{ border: "1px solid rgba(22,163,74,0.12)", boxShadow: "0 2px 12px rgba(22,163,74,0.06)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">ตัวกรองเพิ่มเติม</span>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                  <X size={12} /> ล้างทั้งหมด
                </button>
              )}
            </div>

            {/* Date filter */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">ช่วงเวลา</p>
              <div className="flex gap-2 flex-wrap">
                {DATE_PRESETS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setDateFilter(key)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: dateFilter === key ? "#16A34A" : "#F8FAFC",
                      color: dateFilter === key ? "white" : "#64748B",
                      border: dateFilter === key ? "none" : "1px solid #E2E8F0",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">สถานะ</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_FILTERS.map(({ key, label }) => {
                  const s = STATUS_MAP[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: statusFilter === key ? (s?.pill ?? "#16A34A") : "#F8FAFC",
                        color: statusFilter === key ? (s?.text ?? "white") : "#64748B",
                        border: statusFilter === key ? `1px solid ${s?.dot ?? "#16A34A"}40` : "1px solid #E2E8F0",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Requester filter */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">ผู้สั่งซื้อ</p>
              <div className="relative inline-block">
                <select
                  value={requesterFilter}
                  onChange={(e) => setRequesterFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg outline-none transition-all"
                  style={{
                    background: requesterFilter !== "all" ? "#ECFDF5" : "#F8FAFC",
                    border: requesterFilter !== "all" ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                    color: requesterFilter !== "all" ? "#166534" : "#374151",
                    fontWeight: requesterFilter !== "all" ? 600 : 400,
                  }}
                >
                  <option value="all">ทุกคน</option>
                  {requesters.filter((r) => r !== "all").map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 text-sm px-4 py-3 rounded-xl" style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FEE2E2" }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.055)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          {loading ? (
            <table className="w-full">
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}
              </tbody>
            </table>
          ) : displayed.length === 0 ? (
            <div className="p-14 text-center">
              <FileText size={32} className="mx-auto mb-3" style={{ color: "#D4C8BC" }} />
              <p className="text-sm font-semibold" style={{ color: "#A8A29E" }}>ไม่พบใบสั่งซื้อ</p>
              <p className="text-xs mt-1" style={{ color: "#C4B9AD" }}>ลองเปลี่ยนตัวกรอง หรือสร้าง PO ใหม่</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="mt-3 text-xs font-semibold" style={{ color: "#16A34A" }}>
                  ล้างตัวกรอง →
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-slate-50">
                {paged.map((po) => (
                  <div
                    key={po.poNumber}
                    onClick={() => router.push(`/po/${po.poNumber.replace(/\//g, "~")}`)}
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md" style={{ background: "#ECFDF5", color: "#15803D" }}>
                          {po.poNumber}
                        </span>
                        <StatusBadge status={po.approvalStatus} />
                      </div>
                      <p className="text-sm font-semibold truncate" style={{ color: "#1C1917" }}>{po.supplierName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>
                        {po.requester || "—"} · {po.orderDate || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums" style={{ color: "#1C1917" }}>{fmt(po.grandTotal)}</p>
                      <ChevronRight size={14} style={{ color: "#D4C8BC", marginLeft: "auto", marginTop: 4 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <table className="hidden md:table w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.01)" }}>
                    {["เลขที่ PO", "วันที่", "ร้านค้า / ผู้จัดหา", "ผู้สั่งซื้อ", "ยอดรวม", "สถานะ", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#B4A99E" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((po) => (
                    <tr
                      key={po.poNumber}
                      onClick={() => router.push(`/po/${po.poNumber.replace(/\//g, "~")}`)}
                      className="cursor-pointer group transition-all duration-150"
                      style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "linear-gradient(90deg, rgba(5,150,105,0.03) 0%, transparent 60%)";
                        (e.currentTarget as HTMLElement).style.transform = "translateX(2px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                      }}
                    >
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg" style={{ background: "#ECFDF5", color: "#15803D" }}>
                          {po.poNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[13px]" style={{ color: "#78716C" }}>
                        {po.orderDate || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-[13px] font-semibold" style={{ color: "#1C1917" }}>{po.supplierName}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ background: "#F8FAFC", color: "#475569" }}>
                          {po.requester || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-[13px] font-bold tabular-nums" style={{ color: "#1C1917" }}>
                          {fmt(po.grandTotal)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={po.approvalStatus} />
                      </td>
                      <td className="px-3 py-4">
                        <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" style={{ color: "#D4C8BC" }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMore && (
                <div className="px-4 py-3 text-center" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                  <button
                    onClick={() => setPageSize((p) => p + 30)}
                    className="text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    style={{ background: "#ECFDF5", color: "#16A34A" }}
                  >
                    แสดงเพิ่ม ({displayed.length - pageSize} รายการที่เหลือ)
                  </button>
                </div>
              )}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(0,0,0,0.04)", background: "rgba(0,0,0,0.01)" }}>
                <p className="text-xs" style={{ color: "#B4A99E" }}>
                  แสดง <span className="font-semibold" style={{ color: "#78716C" }}>{paged.length}</span> จาก {displayed.length} รายการ
                  {displayed.length !== pos.length && ` (กรองจาก ${pos.length})`}
                </p>
                <p className="text-xs font-semibold" style={{ color: "#16A34A" }}>
                  ยอดรวม: {totalValue.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
