"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ShoppingBasket, Wrench, ArrowUpRight, Clock, CheckCircle,
  XCircle, TrendingUp, FileText, Hammer, Plus, ShoppingCart,
  HardHat, AlertTriangle, Package,
} from "lucide-react";
import type { PO, JO } from "@/lib/types-po";

/* ── animated counter ─────────────────────────────────── */
function useCountUp(target: number, active: boolean) {
  const [count, setCount] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!active || target === 0) { setCount(0); return; }
    const dur = 1100;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setCount(Math.round(target * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, active]);
  return active ? count : null;
}

/* ── stat card ─────────────────────────────────────────── */
function StatCard({ label, value, sub, accent, loading, href, icon: Icon }: {
  label: string; value: number; sub: string; accent: string;
  loading: boolean; href: string; icon: React.ElementType;
}) {
  const animated = useCountUp(value, !loading);
  return (
    <Link href={href} className="block group">
      <div className="bg-white rounded-[18px] p-5 relative overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl"
        style={{ border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div className="absolute top-0 left-0 right-0 h-[2.5px] rounded-t-[18px]"
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}66)` }} />
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}1a 0%, transparent 70%)` }} />
        <div className="flex items-start justify-between mb-4">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: `${accent}18` }}>
            <Icon size={16} style={{ color: accent }} strokeWidth={1.8} />
          </div>
          <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: accent }} />
        </div>
        <div className="tabular-nums leading-none mb-1.5" style={{
          fontSize: animated !== null && value > 0 ? "2.8rem" : "1.8rem",
          fontWeight: 800, letterSpacing: "-0.03em",
          color: animated !== null && value > 0 ? accent : "#D4C8BC",
        }}>
          {animated === null ? <span style={{ color: "#D4C8BC" }}>—</span> : animated}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: "#B4A99E" }}>{label}</p>
        {!loading && <p className="text-[11px]" style={{ color: "#C4B9AD" }}>{sub}</p>}
      </div>
    </Link>
  );
}

function fmtMoney(val: string) {
  const n = parseFloat((val ?? "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 }) + " ฿";
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "รออนุมัติ":   { bg: "#FEF3C7", text: "#92400E", dot: "#D97706" },
  "อนุมัติแล้ว": { bg: "#DCFCE7", text: "#14532D", dot: "#16A34A" },
  "ยกเลิก":     { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
};

interface FoodOrder { id: string; status: string; total_amount?: number; requester_name?: string; order_month?: string; }
interface MaintenanceReq { id: string; status: string; priority: string; title?: string; request_number?: string; reporter_name?: string; }
interface MonthlyOrder { id: string; status: string; total_amount?: number; requester_name?: string; department?: string; }

/* ── main ─────────────────────────────────────────────── */
export default function HomePage() {
  const { data: session } = useSession();
  const [pos, setPos] = useState<PO[]>([]);
  const [jos, setJos] = useState<JO[]>([]);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [maintReqs, setMaintReqs] = useState<MaintenanceReq[]>([]);
  const [monthlyOrders, setMonthlyOrders] = useState<MonthlyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTab, setPendingTab] = useState<"po" | "jo" | "orders">("po");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(true);

  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "admin" || role === "approver";
  const rawName = (session?.user as { userName?: string; approverName?: string })?.approverName
    ?? (session?.user as { userName?: string })?.userName
    ?? session?.user?.name ?? "";
  const userName = rawName.split(" ")[0];

  useEffect(() => {
    Promise.all([
      fetch("/api/po?q=").then((r) => r.json()).catch(() => ({ pos: [] })),
      fetch("/api/jo?q=").then((r) => r.json()).catch(() => ({ jos: [] })),
      fetch("/api/food").then((r) => r.json()).catch(() => ({ orders: [] })),
      fetch("/api/maintenance").then((r) => r.json()).catch(() => ({ requests: [] })),
      fetch("/api/monthly-orders").then((r) => r.json()).catch(() => ({ orders: [] })),
    ]).then(([pd, jd, fd, md, od]) => {
      setPos(pd.pos ?? []);
      setJos(jd.jos ?? []);
      setFoodOrders(fd.orders ?? []);
      setMaintReqs(md.requests ?? []);
      setMonthlyOrders(od.orders ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const poPending = pos.filter((p) => p.approvalStatus === "รออนุมัติ");
  const joPending = jos.filter((j) => j.approvalStatus === "รออนุมัติ");
  const ordersPending = monthlyOrders.filter((o) => o.status === "pending");
  const foodPending = foodOrders.filter((o) => o.status === "pending");
  const maintUrgent = maintReqs.filter((r) => r.priority === "urgent" && r.status !== "closed");
  const maintOpen = maintReqs.filter((r) => r.status === "open");
  const totalPendingCount = poPending.length + joPending.length + ordersPending.length + foodPending.length;
  const totalPoValue = pos.reduce((s, p) => s + (parseFloat((p.grandTotal || "0").replace(/,/g, "")) || 0), 0);

  async function handleApprove(type: "po" | "jo", id: string, status: "อนุมัติแล้ว" | "ยกเลิก") {
    setApprovingId(id);
    const encoded = id.replace(/\//g, "~");
    try {
      const res = await fetch(`/api/${type}/${encoded}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: status, approvalDate: new Date().toLocaleDateString("th-TH") }),
      });
      const d = await res.json() as { po?: PO; jo?: JO };
      if (type === "po" && d.po) setPos((prev) => prev.map((p) => p.poNumber === id ? d.po! : p));
      else if (type === "jo" && d.jo) setJos((prev) => prev.map((j) => j.joNumber === id ? d.jo! : j));
    } finally { setApprovingId(null); }
  }

  const thDate = new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-full" style={{ background: "var(--bg)" }}>
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{
        background: "linear-gradient(135deg, #051A0C 0%, #0A3320 55%, #061C0E 100%)",
        padding: "32px 36px 24px",
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(circle, #34d399 1px, transparent 1px)", backgroundSize: "22px 22px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -80, right: -60, width: 340, height: 340, background: "radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#059669,#34d399)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🌱</div>
              <span style={{ color: "rgba(52,211,153,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>โรงเรียนต้นกล้า · TONKLA SCHOOL</span>
            </div>
            <h1 style={{ color: "white", fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.08, marginBottom: 6 }}>
              {userName ? `สวัสดี, ${userName}` : "ระบบจัดการ"}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 13 }}>{thDate}</p>
          </div>

          <div className="flex gap-2.5 flex-wrap" style={{ marginTop: 4 }}>
            <Link href="/po/new" className="flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{
              padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none",
              color: "#051A0C", background: "linear-gradient(135deg,#34d399,#10b981)", boxShadow: "0 4px 20px rgba(52,211,153,0.35)",
            }}><Plus size={13} strokeWidth={2.5} /> สร้าง PO</Link>
            <Link href="/jo/new" className="flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{
              padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none",
              color: "white", background: "rgba(124,58,237,0.65)", border: "1px solid rgba(167,139,250,0.3)", backdropFilter: "blur(8px)",
            }}><Plus size={13} strokeWidth={2.5} /> สร้าง JO</Link>
            <Link href="/orders/new" className="flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{
              padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none",
              color: "white", background: "rgba(59,130,246,0.65)", border: "1px solid rgba(147,197,253,0.3)", backdropFilter: "blur(8px)",
            }}><Plus size={13} strokeWidth={2.5} /> สั่งซื้อ</Link>
            <Link href="/maintenance/new" className="flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{
              padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none",
              color: "white", background: "rgba(239,68,68,0.65)", border: "1px solid rgba(252,165,165,0.3)", backdropFilter: "blur(8px)",
            }}><Plus size={13} strokeWidth={2.5} /> แจ้งซ่อม</Link>
          </div>
        </div>

        {/* KPI strip */}
        {!loading && (
          <div className="relative mt-4 flex items-center gap-5 flex-wrap" style={{
            padding: "11px 18px", borderRadius: 12,
            background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)",
          }}>
            <div className="flex items-center gap-2">
              <TrendingUp size={12} style={{ color: "#34d399" }} />
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>มูลค่า PO รวม</span>
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: 13 }}>{totalPoValue.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿</span>
            </div>
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }} />
            <div className="flex items-center gap-2">
              <CheckCircle size={12} style={{ color: "#4ade80" }} />
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>PO อนุมัติแล้ว {pos.filter((p) => p.approvalStatus === "อนุมัติแล้ว").length} รายการ</span>
            </div>
            {totalPendingCount > 0 && (<>
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }} />
              <div className="flex items-center gap-2">
                <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                <span style={{ color: "#fbbf24", fontSize: 12 }}>รออนุมัติรวม {totalPendingCount} รายการ</span>
              </div>
            </>)}
            {maintUrgent.length > 0 && (<>
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }} />
              <div className="flex items-center gap-2">
                <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                <span style={{ color: "#fca5a5", fontSize: 12 }}>แจ้งซ่อมด่วน {maintUrgent.length} รายการ</span>
              </div>
            </>)}
          </div>
        )}
        {loading && <div className="relative mt-4 h-10 rounded-xl skeleton" />}
      </div>

      <div style={{ padding: "24px 36px 48px" }}>
        {/* ── Stat cards ───────────────────────────────── */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {[
            { label: "PO ทั้งหมด",          value: pos.length,           sub: `อนุมัติแล้ว ${pos.filter((p) => p.approvalStatus === "อนุมัติแล้ว").length}`, accent: "#059669", icon: FileText,       href: "/po" },
            { label: "JO ทั้งหมด",          value: jos.length,           sub: `อนุมัติแล้ว ${jos.filter((j) => j.approvalStatus === "อนุมัติแล้ว").length}`, accent: "#7C3AED", icon: Hammer,         href: "/jo" },
            { label: "สั่งซื้อรายเดือน",   value: monthlyOrders.length, sub: `รออนุมัติ ${ordersPending.length}`, accent: "#0369A1", icon: ShoppingCart,   href: "/orders" },
            { label: "วัตถุดิบ",            value: foodOrders.length,    sub: `รออนุมัติ ${foodPending.length}`, accent: "#10b981", icon: ShoppingBasket, href: "/food" },
            { label: "แจ้งซ่อม",           value: maintReqs.length,     sub: `เปิดอยู่ ${maintOpen.length} | ด่วน ${maintUrgent.length}`, accent: "#DC2626", icon: Wrench, href: "/maintenance" },
          ].map((card, i) => (
            <div key={card.href} className={`anim-in anim-d${Math.min(i + 1, 4)}`}>
              <StatCard {...card} loading={loading} />
            </div>
          ))}
        </div>

        {/* ── Pending approvals ─────────────────────────── */}
        {isAdmin && !loading && totalPendingCount > 0 && (
          <div className="rounded-[18px] overflow-hidden mb-6"
            style={{ border: "1.5px solid #FCD34D", boxShadow: "0 2px 16px rgba(217,119,6,0.09)" }}>
            <button
              className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:brightness-95"
              style={{ background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)" }}
              onClick={() => setShowPending((v) => !v)}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#D97706" }} />
                <span className="font-bold text-sm" style={{ color: "#92400E" }}>รายการรออนุมัติ</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#D97706", color: "white" }}>{totalPendingCount}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: "#92400E" }}>{showPending ? "ซ่อน ▲" : "แสดง ▼"}</span>
            </button>

            {showPending && (
              <div>
                <div className="flex gap-1.5 px-5 py-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  {([["po", "PO", poPending.length], ["jo", "JO", joPending.length], ["orders", "สั่งซื้อ", ordersPending.length]] as const).map(([tab, label, count]) => (
                    <button key={tab} onClick={() => setPendingTab(tab)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ background: pendingTab === tab ? "#D97706" : "rgba(0,0,0,0.06)", color: pendingTab === tab ? "white" : "#92400E" }}>
                      {label}
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ background: pendingTab === tab ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)" }}>{count}</span>
                    </button>
                  ))}
                </div>
                <div className="bg-white">
                  {pendingTab === "po" && (poPending.length === 0 ? (
                    <p className="text-center py-6 text-sm" style={{ color: "#B4A99E" }}>ไม่มีรายการรออนุมัติ</p>
                  ) : poPending.slice(0, 5).map((po, i) => {
                    const s = STATUS_STYLE[po.approvalStatus];
                    return (
                      <div key={po.poNumber} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-amber-50/40"
                        style={{ borderBottom: i < poPending.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                        <span className="text-xs font-bold font-mono px-2 py-1 rounded-lg shrink-0" style={{ background: "#ECFDF5", color: "#15803D" }}>{po.poNumber}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#1C1917" }}>{po.supplierName}</p>
                          <p className="text-xs" style={{ color: "#A8A29E" }}>จาก {po.requester || "—"} → {po.approver || "—"}</p>
                        </div>
                        <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#1C1917" }}>{fmtMoney(po.grandTotal)}</span>
                        {s && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0" style={{ background: s.bg, color: s.text }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />{po.approvalStatus}</span>}
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => handleApprove("po", po.poNumber, "อนุมัติแล้ว")} disabled={approvingId === po.poNumber}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-[9px] text-xs font-bold text-white transition-all disabled:opacity-60 hover:-translate-y-0.5"
                            style={{ background: "linear-gradient(135deg,#34d399,#059669)", boxShadow: "0 2px 8px rgba(5,150,105,0.25)" }}>
                            <CheckCircle size={12} />{approvingId === po.poNumber ? "..." : "อนุมัติ"}
                          </button>
                          <button onClick={() => handleApprove("po", po.poNumber, "ยกเลิก")} disabled={approvingId === po.poNumber}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-[9px] text-xs font-semibold transition-all disabled:opacity-60"
                            style={{ background: "white", border: "1px solid #FCA5A5", color: "#DC2626" }}>
                            <XCircle size={12} />ยกเลิก
                          </button>
                        </div>
                      </div>
                    );
                  }))}
                  {pendingTab === "jo" && (joPending.length === 0 ? (
                    <p className="text-center py-6 text-sm" style={{ color: "#B4A99E" }}>ไม่มีรายการรออนุมัติ</p>
                  ) : joPending.slice(0, 5).map((jo, i) => {
                    const s = STATUS_STYLE[jo.approvalStatus];
                    return (
                      <div key={jo.joNumber} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-amber-50/40"
                        style={{ borderBottom: i < joPending.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                        <span className="text-xs font-bold font-mono px-2 py-1 rounded-lg shrink-0" style={{ background: "#F5F3FF", color: "#6D28D9" }}>{jo.joNumber}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#1C1917" }}>{jo.supplierName}</p>
                          <p className="text-xs" style={{ color: "#A8A29E" }}>จาก {jo.requester || "—"} → {jo.approver || "—"}</p>
                        </div>
                        <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#1C1917" }}>{fmtMoney(jo.grandTotal)}</span>
                        {s && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0" style={{ background: s.bg, color: s.text }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />{jo.approvalStatus}</span>}
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => handleApprove("jo", jo.joNumber, "อนุมัติแล้ว")} disabled={approvingId === jo.joNumber}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-[9px] text-xs font-bold text-white transition-all disabled:opacity-60 hover:-translate-y-0.5"
                            style={{ background: "linear-gradient(135deg,#34d399,#059669)", boxShadow: "0 2px 8px rgba(5,150,105,0.25)" }}>
                            <CheckCircle size={12} />{approvingId === jo.joNumber ? "..." : "อนุมัติ"}
                          </button>
                          <button onClick={() => handleApprove("jo", jo.joNumber, "ยกเลิก")} disabled={approvingId === jo.joNumber}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-[9px] text-xs font-semibold transition-all disabled:opacity-60"
                            style={{ background: "white", border: "1px solid #FCA5A5", color: "#DC2626" }}>
                            <XCircle size={12} />ยกเลิก
                          </button>
                        </div>
                      </div>
                    );
                  }))}
                  {pendingTab === "orders" && (ordersPending.length === 0 ? (
                    <p className="text-center py-6 text-sm" style={{ color: "#B4A99E" }}>ไม่มีรายการรออนุมัติ</p>
                  ) : ordersPending.slice(0, 5).map((o, i) => (
                    <Link key={o.id} href={`/orders/${o.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-amber-50/40"
                      style={{ borderBottom: i < ordersPending.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none", textDecoration: "none" }}>
                      <span className="text-xs font-bold font-mono px-2 py-1 rounded-lg shrink-0" style={{ background: "#E0F2FE", color: "#0369A1" }}>ORD</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1C1917" }}>{o.department || "—"}</p>
                        <p className="text-xs" style={{ color: "#A8A29E" }}>จาก {o.requester_name || "—"}</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#1C1917" }}>{o.total_amount ? o.total_amount.toLocaleString("th-TH") + " ฿" : "—"}</span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0" style={{ background: "#FEF3C7", color: "#92400E" }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#D97706" }} />รออนุมัติ
                      </span>
                    </Link>
                  )))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Body: quick actions + recent POs ──────────── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "220px 1fr" }}>
          {/* Quick actions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: "#B4A99E" }}>ระบบทั้งหมด</p>
            <div className="space-y-1.5">
              {[
                { href: "/po",          label: "ใบสั่งซื้อ (PO)",     sub: "Purchase Orders",    icon: FileText,       color: "#059669", bg: "#F0FDF4" },
                { href: "/jo",          label: "ใบสั่งจ้าง (JO)",     sub: "Job Orders",         icon: Hammer,         color: "#7C3AED", bg: "#F5F3FF" },
                { href: "/orders",      label: "สั่งซื้อรายเดือน",   sub: "Monthly Orders",     icon: ShoppingCart,   color: "#0369A1", bg: "#E0F2FE" },
                { href: "/food",        label: "ระบบวัตถุดิบ",        sub: "Food Ingredients",   icon: ShoppingBasket, color: "#059669", bg: "#ECFDF5" },
                { href: "/maintenance", label: "ระบบแจ้งซ่อม",       sub: "Maintenance",        icon: Wrench,         color: "#7C3AED", bg: "#F5F3FF" },
                { href: "/chang",       label: "ระบบช่าง",            sub: "AppSheet Viewer",    icon: HardHat,        color: "#0891B2", bg: "#ECFEFF" },
                { href: "/suppliers",   label: "ผู้จำหน่าย",          sub: "Suppliers",          icon: Package,        color: "#64748B", bg: "#F8FAFC" },
              ].map(({ href, label, sub, icon: Icon, color, bg }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-[14px] group transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: "white", border: "1px solid rgba(0,0,0,0.055)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textDecoration: "none" }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: bg }}>
                    <Icon size={15} style={{ color }} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold leading-tight truncate" style={{ color: "#1C1917" }}>{label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "#B4A99E" }}>{sub}</div>
                  </div>
                  <ArrowUpRight size={12} style={{ color: "#D4C8BC" }} className="group-hover:text-slate-400 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent POs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#B4A99E" }}>รายการ PO ล่าสุด</p>
              <Link href="/po" className="flex items-center gap-1 text-xs font-semibold hover:opacity-80" style={{ color: "#059669", textDecoration: "none" }}>
                ดูทั้งหมด <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="bg-white rounded-[18px] overflow-hidden"
              style={{ border: "1px solid rgba(0,0,0,0.055)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="grid px-5 py-3 text-[9.5px] font-bold uppercase tracking-[0.12em]"
                style={{ gridTemplateColumns: "150px 1fr 110px 110px", borderBottom: "1px solid rgba(0,0,0,0.05)", color: "#C4B9AD", background: "rgba(0,0,0,0.01)" }}>
                <span>เลขที่</span><span>ผู้จำหน่าย</span><span className="text-right">มูลค่า</span><span className="pl-2">สถานะ</span>
              </div>
              {loading ? (
                <div className="p-4 space-y-2.5">{[...Array(6)].map((_, i) => <div key={i} className="h-11 rounded-xl skeleton" />)}</div>
              ) : pos.length === 0 ? (
                <div className="p-10 text-center text-sm" style={{ color: "#B4A99E" }}>ยังไม่มีรายการ PO</div>
              ) : (
                pos.slice(0, 8).map((po) => {
                  const s = STATUS_STYLE[po.approvalStatus];
                  return (
                    <Link key={po.poNumber} href={`/po/${po.poNumber.replace(/\//g, "~")}`}
                      className="grid px-5 py-3.5 items-center border-b last:border-0 transition-colors duration-100 hover:bg-stone-50/60"
                      style={{ gridTemplateColumns: "150px 1fr 110px 110px", borderColor: "rgba(0,0,0,0.04)", textDecoration: "none" }}>
                      <span className="text-[11px] font-bold font-mono px-2 py-1 rounded-lg inline-block w-fit" style={{ background: "#ECFDF5", color: "#15803D" }}>{po.poNumber}</span>
                      <div className="pr-3 min-w-0">
                        <div className="text-[13px] font-medium truncate" style={{ color: "#1C1917" }}>{po.supplierName}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: "#B4A99E" }}>{po.orderDate || "—"}</div>
                      </div>
                      <div className="text-[13px] font-bold tabular-nums text-right pr-2" style={{ color: "#1C1917" }}>{fmtMoney(po.grandTotal)}</div>
                      <div className="pl-2">
                        {s ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: s.bg, color: s.text }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />{po.approvalStatus}
                          </span>
                        ) : <span className="text-xs" style={{ color: "#B4A99E" }}>—</span>}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Maintenance alerts */}
            {maintUrgent.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#B4A99E" }}>แจ้งซ่อมด่วน</p>
                  <Link href="/maintenance" className="flex items-center gap-1 text-xs font-semibold hover:opacity-80" style={{ color: "#DC2626", textDecoration: "none" }}>ดูทั้งหมด <ArrowUpRight size={11} /></Link>
                </div>
                <div className="space-y-2">
                  {maintUrgent.slice(0, 3).map((r) => (
                    <Link key={r.id} href={`/maintenance/${r.id}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-[14px] transition-all hover:-translate-y-0.5"
                      style={{ background: "white", border: "1.5px solid #FEE2E2", boxShadow: "0 2px 8px rgba(220,38,38,0.08)", textDecoration: "none" }}>
                      <AlertTriangle size={15} style={{ color: "#DC2626", flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1C1917" }}>{r.title || r.request_number || "—"}</p>
                        <p className="text-xs" style={{ color: "#A8A29E" }}>จาก {r.reporter_name || "—"}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#FEE2E2", color: "#DC2626" }}>ด่วน</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
