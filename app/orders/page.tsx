"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShoppingCart, Plus, ChevronLeft, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import type { MonthlyOrder } from "@/lib/monthly-order-types";
import { THAI_MONTHS } from "@/lib/monthly-order-types";

const STATUS_META = {
  draft:    { label:"ร่าง",         color:"#92400E", bg:"#FEF3C7" },
  pending:  { label:"รออนุมัติ",    color:"#D97706", bg:"#FFF7ED" },
  approved: { label:"อนุมัติแล้ว",  color:"#059669", bg:"#ECFDF5" },
  rejected: { label:"ไม่อนุมัติ",   color:"#DC2626", bg:"#FEF2F2" },
};

const PAGE_SIZE = 30;
const ACCENT = "#0369A1";
const ACCENT_LIGHT = "#E0F2FE";

export default function OrdersPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [orders, setOrders] = useState<MonthlyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [shown, setShown] = useState(PAGE_SIZE);

  const currentYear = new Date().getFullYear() + 543;

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (filterStatus !== "all") sp.set("status", filterStatus);
    if (filterMonth !== "all") sp.set("month", filterMonth);
    sp.set("year", String(currentYear));
    fetch(`/api/monthly-orders?${sp}`)
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setShown(PAGE_SIZE); })
      .finally(() => setLoading(false));
  }, [filterStatus, filterMonth, currentYear]);

  const visible = orders.slice(0, shown);
  const totalAmount = orders.reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div style={{ background:"white", borderBottom:"1px solid var(--border)", padding:"16px 24px" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/" style={{ color:"var(--subtle)", display:"flex" }}><ChevronLeft size={18}/></Link>
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} style={{ color: ACCENT }}/>
              <h1 style={{ fontWeight:700, fontSize:"1.1rem", color:"var(--text)" }}>ระบบสั่งซื้อรายเดือน</h1>
            </div>
          </div>
          <p style={{ fontSize:12, color:"var(--subtle)", marginLeft:42 }}>
            {orders.length} รายการ · รวม ฿{totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Actions */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {/* Status filter */}
            {(["all","pending","approved","rejected"] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
                  background: filterStatus===s ? "var(--text)" : "white",
                  color: filterStatus===s ? "white" : "var(--muted)",
                  border:`1px solid ${filterStatus===s ? "var(--text)" : "var(--border)"}` }}>
                {s === "all" ? "ทั้งหมด" : STATUS_META[s].label}
              </button>
            ))}
            {/* Month filter */}
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:600, border:"1px solid var(--border)", background:"white", color:"var(--muted)", cursor:"pointer" }}>
              <option value="all">ทุกเดือน</option>
              {THAI_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <Link href="/orders/new"
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:12,
              background:`linear-gradient(135deg,${ACCENT},#0284C7)`, color:"white", fontWeight:700, fontSize:13, textDecoration:"none",
              boxShadow:`0 3px 10px rgba(3,105,161,0.25)` }}>
            <Plus size={15}/> สร้างรายการ
          </Link>
        </div>

        {/* Summary cards for admin */}
        {role === "admin" && !loading && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label:"รออนุมัติ", count: orders.filter(o=>o.status==="pending").length, color:"#D97706" },
              { label:"อนุมัติแล้ว", count: orders.filter(o=>o.status==="approved").length, color:"#059669" },
              { label:"ยอดรวม", count: `฿${totalAmount.toLocaleString()}`, color: ACCENT },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p style={{ fontSize: typeof s.count === "string" ? "1.1rem" : "1.4rem", fontWeight:800, color:"var(--text)" }}>{s.count}</p>
                <p style={{ fontSize:10, color:"var(--subtle)", marginTop:2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:80, borderRadius:14 }}/>)}</div>
        ) : visible.length === 0 ? (
          <div className="card p-16 text-center">
            <FileText size={40} style={{ color:"#D1C4B5", margin:"0 auto 12px" }}/>
            <p style={{ color:"var(--subtle)", fontSize:14 }}>ไม่มีรายการ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((order, i) => {
              const meta = STATUS_META[order.status];
              const StatusIcon = order.status === "approved" ? CheckCircle2 : order.status === "rejected" ? XCircle : Clock;
              return (
                <Link key={order.id} href={`/orders/${order.id}`} style={{ textDecoration:"none" }}>
                  <div className="card px-5 py-4 flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-all cursor-pointer anim-in"
                    style={{ animationDelay:`${i*0.03}s` }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div style={{ width:38, height:38, borderRadius:10, background: ACCENT_LIGHT, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <ShoppingCart size={16} style={{ color: ACCENT }}/>
                      </div>
                      <div className="min-w-0">
                        <p style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>
                          {order.department} · {order.order_month} {order.order_year}
                        </p>
                        <p style={{ fontSize:11, color:"var(--subtle)", marginTop:1 }}>
                          {order.requester_name} · ฿{order.total_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, color:meta.color, background:meta.bg, flexShrink:0 }}>
                      <StatusIcon size={11}/> {meta.label}
                    </span>
                  </div>
                </Link>
              );
            })}
            {shown < orders.length && (
              <button onClick={() => setShown(s => s + PAGE_SIZE)}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background:"white", border:"1px solid var(--border)", color:"var(--muted)" }}>
                แสดงเพิ่ม ({orders.length - shown} รายการ)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
