"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShoppingCart, Plus, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
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
  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    approved: orders.filter(o => o.status === "approved").length,
  };

  return (
    <div style={{ minHeight: "100%", background: "#F0EDE9" }}>
      {/* Header */}
      <div style={{ padding: "44px 44px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9C9289", marginBottom: 8 }}>จัดซื้อ</p>
            <h1 style={{ fontSize: "clamp(2.8rem,5vw,4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#1C1815", margin: 0 }}>
              สั่งซื้อ<br /><span style={{ color: ACCENT }}>รายเดือน</span>
            </h1>
          </div>
          <Link href="/orders/new" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 20px", borderRadius: 16,
            background: ACCENT, color: "white",
            fontWeight: 700, fontSize: 14, textDecoration: "none",
            boxShadow: "0 4px 14px rgba(3,105,161,0.3)",
            flexShrink: 0,
          }}>
            <Plus size={16} /> สร้างรายการ
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
            { label: "ทั้งหมด", value: loading ? "—" : String(counts.all), accent: false },
            { label: "รออนุมัติ", value: loading ? "—" : String(counts.pending), accent: false },
            { label: "อนุมัติแล้ว", value: loading ? "—" : String(counts.approved), accent: false },
            { label: "ยอดรวม", value: loading ? "—" : `฿${totalAmount.toLocaleString()}`, accent: true },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{
              flex: 1, padding: "24px 28px",
              borderRight: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none",
            }}>
              <div style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 900, color: stat.accent ? ACCENT : "#1C1815", lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9C9289", marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "20px 44px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["all", "pending", "approved", "rejected"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: filterStatus === s ? "#1C1815" : "white",
              color: filterStatus === s ? ACCENT : "#9C9289",
              boxShadow: filterStatus === s ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
              transition: "all 0.15s",
            }}>
              {s === "all" ? "ทั้งหมด" : STATUS_META[s].label}
            </button>
          ))}
          {/* Month filter as select pill */}
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{
            padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700,
            border: "none", cursor: "pointer",
            background: filterMonth !== "all" ? "#1C1815" : "white",
            color: filterMonth !== "all" ? ACCENT : "#9C9289",
            boxShadow: filterMonth !== "all" ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
            transition: "all 0.15s", appearance: "none", WebkitAppearance: "none",
            paddingRight: "20px",
          }}>
            <option value="all">ทุกเดือน</option>
            {THAI_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 44px 48px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 80, background: "#F5F2EE", borderRadius: 16 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 24,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            padding: "64px 32px", textAlign: "center",
          }}>
            <FileText size={40} style={{ color: "#D1C4B5", margin: "0 auto 12px" }} />
            <p style={{ color: "#9C9289", fontSize: 14 }}>ไม่มีรายการ</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((order) => {
              const meta = STATUS_META[order.status as keyof typeof STATUS_META] ?? STATUS_META.draft;
              const StatusIcon = order.status === "approved" ? CheckCircle2 : order.status === "rejected" ? XCircle : Clock;
              return (
                <Link key={order.id} href={`/orders/${order.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: "white", borderRadius: 20,
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                    padding: "16px 24px",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                    cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
                    {/* Left */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "#1C1815", margin: 0 }}>
                        {order.department}
                      </p>
                      <p style={{ fontSize: 12, color: "#9C9289", marginTop: 2 }}>
                        {order.order_month} {order.order_year}
                      </p>
                    </div>
                    {/* Right */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 12, color: "#9C9289", margin: 0 }}>{order.requester_name}</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: "#1C1815", marginTop: 2 }}>
                          ฿{order.total_amount.toLocaleString()}
                        </p>
                      </div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 700,
                        padding: "3px 10px", borderRadius: 20,
                        color: meta.color, background: meta.bg,
                      }}>
                        <StatusIcon size={11} /> {meta.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {shown < orders.length && (
              <button onClick={() => setShown(s => s + PAGE_SIZE)} style={{
                width: "100%", padding: "14px", borderRadius: 16, fontSize: 13, fontWeight: 700,
                background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#9C9289",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                แสดงเพิ่ม ({orders.length - shown} รายการ)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
