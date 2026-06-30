"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShoppingBasket, Plus, ChevronLeft, Clock, CheckCircle2, XCircle, Package } from "lucide-react";
import type { FoodOrder, FoodOrderStatus } from "@/lib/types";

const STATUS_META: Record<FoodOrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:    { label:"ร่าง",         color:"#92400E", bg:"#FEF3C7", icon:<Clock size={11}/> },
  pending:  { label:"รออนุมัติ",    color:"#D97706", bg:"#FFF7ED", icon:<Clock size={11}/> },
  approved: { label:"อนุมัติแล้ว",  color:"#059669", bg:"#ECFDF5", icon:<CheckCircle2 size={11}/> },
  rejected: { label:"ไม่อนุมัติ",   color:"#DC2626", bg:"#FEF2F2", icon:<XCircle size={11}/> },
  received: { label:"รับของแล้ว",   color:"#7C3AED", bg:"#F5F3FF", icon:<Package size={11}/> },
};

const PAGE_SIZE = 30;

export default function FoodPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FoodOrderStatus | "all">("all");
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    setLoading(true);
    const qs = filter !== "all" ? `?status=${filter}` : "";
    fetch(`/api/food${qs}`)
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders ?? []); setShown(PAGE_SIZE); })
      .finally(() => setLoading(false));
  }, [filter]);

  const visible = orders.slice(0, shown);

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
              <ShoppingBasket size={18} style={{ color:"var(--food-accent)" }} />
              <h1 style={{ fontWeight:700, fontSize:"1.1rem", color:"var(--text)" }}>ระบบวัตถุดิบ</h1>
            </div>
          </div>
          <p style={{ fontSize:12, color:"var(--subtle)", marginLeft:42 }}>{orders.length} รายการ</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Actions + Filters */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {(["all","pending","approved","rejected","received"] as const).map((s) => (
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
          {(role === "admin" || role === "kitchen_staff") && (
            <Link href="/food/new"
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:12, background:"linear-gradient(135deg,#059669,#10b981)", color:"white", fontWeight:700, fontSize:13, textDecoration:"none", boxShadow:"0 3px 10px rgba(5,150,105,0.25)" }}>
              <Plus size={15} /> สร้างใบสั่ง
            </Link>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:80, borderRadius:14 }} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="card p-16 text-center">
            <ShoppingBasket size={40} style={{ color:"#D1C4B5", margin:"0 auto 12px" }} />
            <p style={{ color:"var(--subtle)", fontSize:14 }}>ไม่มีรายการ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((order, i) => {
              const meta = STATUS_META[order.status];
              return (
                <Link key={order.id} href={`/food/${order.id}`} style={{ textDecoration:"none" }}>
                  <div className={`card px-5 py-4 flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-all cursor-pointer anim-in`}
                    style={{ animationDelay:`${i * 0.03}s` }}>
                    {/* Left */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div style={{ width:38, height:38, borderRadius:10, background:"var(--food-light)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <ShoppingBasket size={16} style={{ color:"var(--food-accent)" }} />
                      </div>
                      <div className="min-w-0">
                        <p style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>{order.order_number}</p>
                        <p style={{ fontSize:11, color:"var(--subtle)", marginTop:1 }}>
                          {order.requester_name} · {new Date(order.order_date).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                    </div>
                    {/* Right */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {order.total_amount > 0 && (
                        <span style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>
                          ฿{order.total_amount.toLocaleString()}
                        </span>
                      )}
                      <span style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, color:meta.color, background:meta.bg }}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {shown < orders.length && (
              <button onClick={() => setShown(s => s + PAGE_SIZE)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:bg-stone-50"
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
