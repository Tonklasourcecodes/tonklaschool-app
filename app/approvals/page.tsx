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
    <div className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-2">
        <SkeletonBox className="h-5 w-12 rounded-full" />
        <SkeletonBox className="h-5 w-28" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBox className="h-14 rounded-xl" />
        <SkeletonBox className="h-14 rounded-xl" />
      </div>
      <div className="flex gap-3">
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

  const cardStyle = { boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" };

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)" }}>
            <Clock size={17} style={{ color: "#D97706" }} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
            รออนุมัติ
          </h1>
        </div>
        <p className="text-sm text-slate-400 ml-12">
          {user?.role === "admin"
            ? "แสดงทุกรายการที่รออนุมัติในระบบ"
            : user?.approverName
              ? `รายการที่ส่งมาให้ ${user.approverName} พิจารณา`
              : "รายการที่รออนุมัติ"
          }
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <ApprovalSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" }}>
            <CheckCircle2 size={30} style={{ color: "#16A34A" }} />
          </div>
          <p className="font-semibold text-slate-700 mb-1">ไม่มีรายการค้างอนุมัติ</p>
          <p className="text-sm text-slate-400">ทุกรายการได้รับการพิจารณาแล้ว</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Count badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">{items.length} รายการ</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </div>

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
              <div key={itemId} className="bg-white rounded-2xl overflow-hidden" style={cardStyle}>
                {/* Top accent */}
                <div className="h-1" style={{ background: isPO ? "linear-gradient(90deg,#10b981,#059669)" : "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />

                <div className="p-5">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: isPO ? "#ECFDF5" : "#F5F3FF" }}>
                        {isPO
                          ? <FileText size={15} style={{ color: "#059669" }} />
                          : <Hammer size={15} style={{ color: "#7C3AED" }} />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: isPO ? "#059669" : "#7C3AED" }}>
                            {isPO ? "ใบสั่งซื้อ" : "ใบจ้างงาน"}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">{itemId}</p>
                      </div>
                    </div>
                    <Link href={detailUrl}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-1">
                      ดูรายละเอียด <ChevronRight size={12} />
                    </Link>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="rounded-xl p-3" style={{ background: "#F8FAFC" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">ร้านค้า / ผู้รับจ้าง</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{supplier || "—"}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "#F8FAFC" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">ผู้ขออนุมัติ</p>
                      <p className="text-sm font-semibold text-slate-800">{requester || "—"}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "#F8FAFC" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">วันที่</p>
                      <p className="text-sm font-semibold text-slate-800">{date || "—"}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: isPO ? "#ECFDF5" : "#F5F3FF" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                        style={{ color: isPO ? "#059669" : "#7C3AED" }}>ยอดรวม</p>
                      <p className="text-sm font-bold tabular-nums"
                        style={{ color: isPO ? "#059669" : "#7C3AED" }}>{fmt(total)}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2.5">
                    <button
                      disabled={isActioning}
                      onClick={() => handleAction(item, "approve")}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-60 hover:-translate-y-0.5"
                      style={{
                        background: "linear-gradient(135deg,#10b981,#059669)",
                        boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
                      }}
                    >
                      {isActioning
                        ? <Loader2 size={15} className="animate-spin" />
                        : <CheckCircle2 size={15} />
                      }
                      อนุมัติรายการนี้
                    </button>
                    <button
                      disabled={isActioning}
                      onClick={() => handleAction(item, "reject")}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                      style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
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
    </main>
  );
}
