"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShoppingBasket, Plus, Clock, CheckCircle2, XCircle, Package } from "lucide-react";
import type { FoodOrder, FoodOrderStatus } from "@/lib/types";

const STATUS_META: Record<FoodOrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:    { label:"ร่าง",         color:"#92400E", bg:"#FEF3C7", icon:<Clock size={11}/> },
  pending:  { label:"รออนุมัติ",    color:"#D97706", bg:"#FFF7ED", icon:<Clock size={11}/> },
  approved: { label:"อนุมัติแล้ว",  color:"#14532D", bg:"#DCFCE7", icon:<CheckCircle2 size={11}/> },
  rejected: { label:"ไม่อนุมัติ",   color:"#991B1B", bg:"#FEE2E2", icon:<XCircle size={11}/> },
  received: { label:"รับของแล้ว",   color:"#5B21B6", bg:"#F5F3FF", icon:<Package size={11}/> },
};

const FILTER_LABELS: Record<FoodOrderStatus | "all", string> = {
  all: "ทั้งหมด",
  draft: "ร่าง",
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  received: "รับของแล้ว",
};

const ACCENT = "#10B981";
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
  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    approved: orders.filter(o => o.status === "approved").length,
    received: orders.filter(o => o.status === "received").length,
  };

  return (
    <div style={{ minHeight: "100%", background: "#F0EDE9" }}>
      {/* Header */}
      <div style={{ padding: "44px 44px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9C9289", marginBottom: 8 }}>ห้องครัว</p>
            <h1 style={{ fontSize: "clamp(2.8rem,5vw,4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#1C1815", margin: 0 }}>
              วัตถุดิบ<br /><span style={{ color: ACCENT }}>ห้องครัว</span>
            </h1>
          </div>
          {(role === "admin" || role === "kitchen_staff") && (
            <Link href="/food/new" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 20px", borderRadius: 16,
              background: "#059669", color: "white",
              fontWeight: 700, fontSize: 14, textDecoration: "none",
              boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
              flexShrink: 0,
            }}>
              <Plus size={16} /> สร้างใบสั่ง
            </Link>
          )}
        </div>

        {/* Stat strip */}
        <div style={{
          background: "white", borderRadius: 24,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          display: "flex", marginBottom: 0,
        }}>
          {[
            { label: "ทั้งหมด", value: counts.all, accent: false },
            { label: "รออนุมัติ", value: counts.pending, accent: false },
            { label: "อนุมัติแล้ว", value: counts.approved, accent: false },
            { label: "รับของแล้ว", value: counts.received, accent: true },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{
              flex: 1, padding: "24px 28px",
              borderRight: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none",
            }}>
              <div style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 900, color: stat.accent ? ACCENT : "#1C1815", lineHeight: 1 }}>
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
          {(["all", "pending", "approved", "rejected", "received"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: filter === s ? "#1C1815" : "white",
              color: filter === s ? ACCENT : "#9C9289",
              boxShadow: filter === s ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
              transition: "all 0.15s",
            }}>
              {FILTER_LABELS[s]}
            </button>
          ))}
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
            <ShoppingBasket size={40} style={{ color: "#D1C4B5", margin: "0 auto 12px" }} />
            <p style={{ color: "#9C9289", fontSize: 14 }}>ไม่มีรายการ</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((order) => {
              const meta = STATUS_META[order.status];
              return (
                <Link key={order.id} href={`/food/${order.id}`} style={{ textDecoration: "none" }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                      <span style={{
                        fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                        background: "#F5F2EE", color: "#6B6259",
                        padding: "4px 10px", borderRadius: 8, flexShrink: 0,
                      }}>{order.order_number}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "#1C1815", margin: 0 }}>{order.requester_name}</p>
                        <p style={{ fontSize: 12, color: "#9C9289", marginTop: 2 }}>
                          {new Date(order.order_date).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                    </div>
                    {/* Right */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      {order.total_amount > 0 && (
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#1C1815" }}>
                          ฿{order.total_amount.toLocaleString()}
                        </span>
                      )}
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 700,
                        padding: "3px 10px", borderRadius: 20,
                        color: meta.color, background: meta.bg,
                      }}>
                        {meta.icon} {meta.label}
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
