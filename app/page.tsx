"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBasket, Wrench, ArrowRight, Clock, CheckCircle, AlertTriangle, ShoppingCart, HardHat, FileText, Hammer } from "lucide-react";

interface Stats {
  food: { pending: number; total: number };
  maintenance: { open: number; urgent: number; total: number };
  orders: { pending: number; total: number };
}

export default function HomePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const role = (session?.user as { role?: string })?.role;
  const userName = (session?.user as { userName?: string })?.userName ?? session?.user?.name?.split(" ")[0] ?? "";

  useEffect(() => {
    Promise.all([
      fetch("/api/food").then((r) => r.json()),
      fetch("/api/maintenance").then((r) => r.json()),
      fetch("/api/monthly-orders").then((r) => r.json()),
    ]).then(([fd, md, od]) => {
      const foodOrders = fd.orders ?? [];
      const maintReqs = md.requests ?? [];
      const monthlyOrders = od.orders ?? [];
      setStats({
        food: {
          pending: foodOrders.filter((o: { status: string }) => o.status === "pending").length,
          total: foodOrders.length,
        },
        maintenance: {
          open: maintReqs.filter((r: { status: string }) => r.status === "open").length,
          urgent: maintReqs.filter((r: { priority: string; status: string }) => r.priority === "urgent" && r.status !== "closed").length,
          total: maintReqs.length,
        },
        orders: {
          pending: monthlyOrders.filter((o: { status: string }) => o.status === "pending").length,
          total: monthlyOrders.length,
        },
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#051A0C 0%,#0A3320 55%,#061C0E 100%)", padding: "48px 32px 40px" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.05, backgroundImage:"radial-gradient(circle,#34d399 1px,transparent 1px)", backgroundSize:"22px 22px", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:-80, right:-60, width:340, height:340, background:"radial-gradient(circle,rgba(52,211,153,0.12) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div className="relative max-w-2xl mx-auto">
          <p style={{ color:"rgba(52,211,153,0.6)", fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:10 }}>
            โรงเรียนต้นกล้า · Tonkla School
          </p>
          <h1 style={{ color:"white", fontSize:"2.6rem", fontWeight:800, letterSpacing:"-0.025em", lineHeight:1.1, marginBottom:10 }}>
            {userName ? `สวัสดี, ${userName}` : "ระบบจัดการ"}
          </h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>
            {new Date().toLocaleDateString("th-TH", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>

          {/* Alert strip */}
          {stats && (stats.food.pending > 0 || stats.maintenance.urgent > 0) && (
            <div className="mt-5 flex items-center gap-4 flex-wrap" style={{ padding:"10px 16px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)" }}>
              {stats.food.pending > 0 && (
                <div className="flex items-center gap-2">
                  <span className="animate-pulse" style={{ width:6, height:6, borderRadius:"50%", background:"#f59e0b", display:"inline-block" }} />
                  <span style={{ color:"#fbbf24", fontSize:13 }}>วัตถุดิบรออนุมัติ {stats.food.pending} รายการ</span>
                </div>
              )}
              {stats.maintenance.urgent > 0 && (
                <div className="flex items-center gap-2">
                  <span className="animate-pulse" style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", display:"inline-block" }} />
                  <span style={{ color:"#fca5a5", fontSize:13 }}>แจ้งซ่อมด่วน {stats.maintenance.urgent} รายการ</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* System cards */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {/* วัตถุดิบ */}
        <div className="anim-in anim-d1">
          <div className="card overflow-hidden">
            <div style={{ height:4, background:"linear-gradient(90deg,#059669,#34d399)" }} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div style={{ width:44, height:44, borderRadius:12, background:"var(--food-light)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <ShoppingBasket size={22} style={{ color:"var(--food-accent)" }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:"var(--text)" }}>ระบบวัตถุดิบ</h2>
                    <p style={{ fontSize:12, color:"var(--subtle)", marginTop:2 }}>สั่งวัตถุดิบสำหรับห้องครัว</p>
                  </div>
                </div>
                {stats && (
                  <div className="flex items-center gap-3">
                    {stats.food.pending > 0 && (
                      <div className="flex items-center gap-1.5" style={{ fontSize:12, color:"#D97706" }}>
                        <Clock size={13} />
                        <span>รออนุมัติ {stats.food.pending}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5" style={{ fontSize:12, color:"var(--subtle)" }}>
                      <CheckCircle size={13} />
                      <span>ทั้งหมด {stats.food.total}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Link href="/food" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background:"var(--food-light)", color:"var(--food-accent)", border:"1px solid #BBF7D0" }}>
                  ดูรายการ <ArrowRight size={14} />
                </Link>
                {(role === "admin" || role === "kitchen_staff") && (
                  <Link href="/food/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                    style={{ background:"linear-gradient(135deg,#059669,#10b981)", color:"white", boxShadow:"0 4px 14px rgba(5,150,105,0.3)" }}>
                    + สร้างใบสั่ง
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ระบบสั่งซื้อรายเดือน */}
        <div className="anim-in anim-d2">
          <div className="card overflow-hidden">
            <div style={{ height:4, background:"linear-gradient(90deg,#0369A1,#38BDF8)" }} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div style={{ width:44, height:44, borderRadius:12, background:"#E0F2FE", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <ShoppingCart size={22} style={{ color:"#0369A1" }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:"var(--text)" }}>ระบบสั่งซื้อรายเดือน</h2>
                    <p style={{ fontSize:12, color:"var(--subtle)", marginTop:2 }}>แต่ละแผนกสั่งซื้อสินค้าประจำเดือน</p>
                  </div>
                </div>
                {stats?.orders && (
                  <div className="flex items-center gap-3">
                    {stats.orders.pending > 0 && (
                      <div className="flex items-center gap-1.5" style={{ fontSize:12, color:"#D97706" }}>
                        <Clock size={13} />
                        <span>รออนุมัติ {stats.orders.pending}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5" style={{ fontSize:12, color:"var(--subtle)" }}>
                      <CheckCircle size={13} />
                      <span>ทั้งหมด {stats.orders.total}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Link href="/orders" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background:"#E0F2FE", color:"#0369A1", border:"1px solid #BAE6FD" }}>
                  ดูรายการ <ArrowRight size={14} />
                </Link>
                <Link href="/orders/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{ background:"linear-gradient(135deg,#0369A1,#0284C7)", color:"white", boxShadow:"0 4px 14px rgba(3,105,161,0.3)" }}>
                  + สร้างรายการ
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ระบบช่าง */}
        <div className="anim-in" style={{ animationDelay:"0.15s" }}>
          <div className="card overflow-hidden">
            <div style={{ height:4, background:"linear-gradient(90deg,#7C3AED,#C084FC)" }} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div style={{ width:44, height:44, borderRadius:12, background:"#F5F3FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <HardHat size={22} style={{ color:"#7C3AED" }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:"var(--text)" }}>ระบบช่าง</h2>
                    <p style={{ fontSize:12, color:"var(--subtle)", marginTop:2 }}>ดูรายการแจ้งซ่อมจาก AppSheet</p>
                  </div>
                </div>
              </div>
              <Link href="/chang" className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                style={{ background:"#F5F3FF", color:"#7C3AED", border:"1px solid #DDD6FE" }}>
                ดูข้อมูล <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* แจ้งซ่อม (legacy) */}
        <div className="anim-in anim-d3">
          <div className="card overflow-hidden">
            <div style={{ height:4, background:"linear-gradient(90deg,#7C3AED,#a78bfa)" }} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div style={{ width:44, height:44, borderRadius:12, background:"var(--maintenance-light)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Wrench size={22} style={{ color:"var(--maintenance-accent)" }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:"var(--text)" }}>ระบบแจ้งซ่อม</h2>
                    <p style={{ fontSize:12, color:"var(--subtle)", marginTop:2 }}>แจ้งซ่อมบำรุงสิ่งอำนวยความสะดวก</p>
                  </div>
                </div>
                {stats && (
                  <div className="flex items-center gap-3">
                    {stats.maintenance.urgent > 0 && (
                      <div className="flex items-center gap-1.5" style={{ fontSize:12, color:"#DC2626" }}>
                        <AlertTriangle size={13} />
                        <span>ด่วน {stats.maintenance.urgent}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5" style={{ fontSize:12, color:"var(--subtle)" }}>
                      <CheckCircle size={13} />
                      <span>ทั้งหมด {stats.maintenance.total}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Link href="/maintenance" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background:"var(--maintenance-light)", color:"var(--maintenance-accent)", border:"1px solid #DDD6FE" }}>
                  ดูรายการ <ArrowRight size={14} />
                </Link>
                <Link href="/maintenance/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{ background:"linear-gradient(135deg,#7C3AED,#6D28D9)", color:"white", boxShadow:"0 4px 14px rgba(124,58,237,0.3)" }}>
                  + แจ้งซ่อม
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* PO */}
        <div className="anim-in" style={{ animationDelay:"0.25s" }}>
          <div className="card overflow-hidden">
            <div style={{ height:4, background:"linear-gradient(90deg,#D97706,#F59E0B)" }} />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width:44, height:44, borderRadius:12, background:"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <FileText size={22} style={{ color:"#D97706" }} strokeWidth={1.8} />
                </div>
                <div>
                  <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:"var(--text)" }}>ใบสั่งซื้อ (PO)</h2>
                  <p style={{ fontSize:12, color:"var(--subtle)", marginTop:2 }}>Purchase Orders</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/po" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background:"#FEF3C7", color:"#D97706", border:"1px solid #FDE68A" }}>
                  ดูรายการ <ArrowRight size={14} />
                </Link>
                <Link href="/po/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{ background:"linear-gradient(135deg,#D97706,#F59E0B)", color:"white", boxShadow:"0 4px 14px rgba(217,119,6,0.3)" }}>
                  + สร้าง PO
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* JO */}
        <div className="anim-in" style={{ animationDelay:"0.3s" }}>
          <div className="card overflow-hidden">
            <div style={{ height:4, background:"linear-gradient(90deg,#0891B2,#22D3EE)" }} />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width:44, height:44, borderRadius:12, background:"#ECFEFF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Hammer size={22} style={{ color:"#0891B2" }} strokeWidth={1.8} />
                </div>
                <div>
                  <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:"var(--text)" }}>ใบสั่งจ้าง (JO)</h2>
                  <p style={{ fontSize:12, color:"var(--subtle)", marginTop:2 }}>Job Orders</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/jo" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background:"#ECFEFF", color:"#0891B2", border:"1px solid #A5F3FC" }}>
                  ดูรายการ <ArrowRight size={14} />
                </Link>
                <Link href="/jo/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{ background:"linear-gradient(135deg,#0891B2,#22D3EE)", color:"white", boxShadow:"0 4px 14px rgba(8,145,178,0.3)" }}>
                  + สร้าง JO
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
