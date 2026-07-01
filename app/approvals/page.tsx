"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, XCircle, Loader2, Clock, ChevronRight, FileText, Hammer } from "lucide-react";
import Link from "next/link";
import type { PO, JO } from "@/lib/types-po";
import { useToast } from "@/components/Toaster";
import { SkeletonBox } from "@/components/Skeleton";

type ApprovalItem = { kind: "PO"; data: PO } | { kind: "JO"; data: JO };

function todayTH() {
  return new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmt(val: string) {
  const n = parseFloat((val || "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2 }) + " ฿";
}

function ApprovalSkeleton() {
  return (
    <div style={{ background: "white", borderRadius: 24, padding: 20, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <SkeletonBox className="h-5 w-12 rounded-full" />
        <SkeletonBox className="h-5 w-28" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <SkeletonBox className="h-14 rounded-xl" />
        <SkeletonBox className="h-14 rounded-xl" />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <SkeletonBox className="h-11 flex-1 rounded-xl" />
        <SkeletonBox className="h-11 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const toast = useToast();

  const user = session?.user as { role?: string; approverName?: string } | undefined;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json() as { pos: PO[]; jos: JO[] };
      const all: ApprovalItem[] = [
        ...data.pos.map((p) => ({ kind: "PO" as const, data: p })),
        ...data.jos.map((j) => ({ kind: "JO" as const, data: j })),
      ];
      setItems(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleAction(item: ApprovalItem, action: "approve" | "reject") {
    const itemId = item.kind === "PO" ? item.data.poNumber : item.data.joNumber;
    const urlId = itemId.replace(/\//g, "~");
    const endpoint = item.kind === "PO" ? `/api/po/${urlId}` : `/api/jo/${urlId}`;
    const statusText = action === "approve" ? "อนุมัติแล้ว" : "ไม่อนุมัติ";
    // Optimistic: remove card immediately
    setItems((prev) => prev.filter((i) => {
      const iid = i.kind === "PO" ? i.data.poNumber : i.data.joNumber;
      return iid !== itemId;
    }));
    setActioning(itemId);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: statusText, approvalDate: todayTH() }),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      if (action === "approve") {
        toast.success(`อนุมัติแล้ว`, `${itemId} ได้รับการอนุมัติเรียบร้อย`);
      } else {
        toast.info(`ไม่อนุมัติ`, `${itemId} ถูกปฏิเสธแล้ว`);
      }
      void load();
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกผลการอนุมัติได้");
      void load(); // Restore on failure
    } finally {
      setActioning(null);
    }
  }

  return (
    <div style={{ minHeight: "100%", background: "#F0EDE9" }}>
      {/* Header */}
      <div style={{ padding: "44px 44px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#D97706", marginBottom: 8 }}>
          อนุมัติ
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "clamp(2.8rem,5vw,4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#111110", margin: 0 }}>
              รออนุมัติ
            </h1>
            {!loading && (
              <p style={{ fontSize: 13, color: "#A8A29E", marginTop: 10 }}>
                {user?.role === "admin"
                  ? "แสดงทุกรายการที่รออนุมัติในระบบ"
                  : user?.approverName
                    ? `รายการที่ส่งมาให้ ${user.approverName} พิจารณา`
                    : "รายการที่รออนุมัติ"
                }
              </p>
            )}
          </div>
          {!loading && items.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 900, color: "#D97706", lineHeight: 1 }}>{items.length}</span>
              <span style={{ fontSize: 13, color: "#A8A29E" }}>รายการ</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 44px 48px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => <ApprovalSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 24, border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)", padding: "64px 20px", textAlign: "center",
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#F0FDF4,#DCFCE7)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={30} style={{ color: "#16A34A" }} />
            </div>
            <p style={{ fontWeight: 700, color: "#1C1917", fontSize: 15, marginBottom: 6 }}>ไม่มีรายการค้างอนุมัติ</p>
            <p style={{ fontSize: 13, color: "#A8A29E" }}>ทุกรายการได้รับการพิจารณาแล้ว</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {items.map((item) => {
              const itemId = item.kind === "PO" ? item.data.poNumber : item.data.joNumber;
              const supplier = item.data.supplierName;
              const requester = item.data.requester;
              const total = item.data.grandTotal;
              const date = item.kind === "PO" ? item.data.orderDate : item.data.startDate;
              const detailUrl = item.kind === "PO"
                ? `/po/${itemId.replace(/\//g, "~")}`
                : `/jo/${itemId.replace(/\//g, "~")}`;
              const isPO = item.kind === "PO";
              const isActioning = actioning === itemId;

              return (
                <div key={itemId} style={{ background: "white", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  {/* Top accent stripe */}
                  <div style={{ height: 4, background: isPO ? "linear-gradient(90deg,#10b981,#059669)" : "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />

                  <div style={{ padding: 20 }}>
                    {/* Title row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: isPO ? "#ECFDF5" : "#F5F3FF" }}>
                          {isPO
                            ? <FileText size={15} style={{ color: "#059669" }} />
                            : <Hammer size={15} style={{ color: "#7C3AED" }} />
                          }
                        </div>
                        <div>
                          <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 4, color: isPO ? "#059669" : "#7C3AED", background: isPO ? "#ECFDF5" : "#F5F3FF" }}>
                            {isPO ? "ใบสั่งซื้อ" : "ใบจ้างงาน"}
                          </span>
                          <p style={{ fontWeight: 800, color: "#111110", fontSize: 14, margin: 0, lineHeight: 1.2 }}>{itemId}</p>
                        </div>
                      </div>
                      <Link href={detailUrl}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#A8A29E", textDecoration: "none", flexShrink: 0, marginTop: 4 }}>
                        ดูรายละเอียด <ChevronRight size={12} />
                      </Link>
                    </div>

                    {/* Info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                      {[
                        { label: "ร้านค้า / ผู้รับจ้าง", value: supplier || "—", accent: false },
                        { label: "ผู้ขออนุมัติ", value: requester || "—", accent: false },
                        { label: "วันที่", value: date || "—", accent: false },
                        { label: "ยอดรวม", value: fmt(total), accent: true },
                      ].map(({ label, value, accent }) => (
                        <div key={label} style={{ borderRadius: 14, padding: 12, background: accent ? (isPO ? "#ECFDF5" : "#F5F3FF") : "#F8FAFC" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: accent ? (isPO ? "#059669" : "#7C3AED") : "#A8A29E", marginBottom: 4 }}>{label}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: accent ? (isPO ? "#059669" : "#7C3AED") : "#1C1917", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        disabled={isActioning}
                        onClick={() => handleAction(item, "approve")}
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          padding: "12px 0", borderRadius: 14, fontWeight: 700, fontSize: 13, color: "white",
                          border: "none", cursor: isActioning ? "not-allowed" : "pointer", opacity: isActioning ? 0.6 : 1,
                          background: "linear-gradient(135deg,#10b981,#059669)",
                          boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
                          transition: "all 0.15s",
                        }}
                      >
                        {isActioning ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={15} />}
                        อนุมัติรายการนี้
                      </button>
                      <button
                        disabled={isActioning}
                        onClick={() => handleAction(item, "reject")}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          padding: "12px 20px", borderRadius: 14, fontWeight: 700, fontSize: 13,
                          border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626",
                          cursor: isActioning ? "not-allowed" : "pointer", opacity: isActioning ? 0.6 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        <XCircle size={15} />
                        ไม่อนุมัติ
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
