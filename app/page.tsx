"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBasket, Wrench, ArrowRight, ShoppingCart, HardHat, FileText, Hammer, Bell, User } from "lucide-react";

interface Stats {
  food: { pending: number; total: number };
  maintenance: { open: number; urgent: number; total: number };
  orders: { pending: number; total: number };
}

const SYSTEMS = [
  {
    key: "food",
    title: "ระบบวัตถุดิบ",
    sub: "สั่งวัตถุดิบสำหรับห้องครัว",
    href: "/food",
    newHref: "/food/new",
    newLabel: "+ สร้างใบสั่ง",
    roles: ["admin", "kitchen_staff"],
    icon: ShoppingBasket,
    gradient: "radial-gradient(ellipse at 20% 70%, rgba(52,211,153,0.9) 0%, transparent 55%), radial-gradient(ellipse at 80% 25%, rgba(16,185,129,0.75) 0%, transparent 55%), radial-gradient(ellipse at 55% 95%, rgba(5,150,105,0.65) 0%, transparent 45%), #064E3B",
    textColor: "rgba(255,255,255,0.95)",
    subColor: "rgba(255,255,255,0.55)",
    btnBg: "rgba(255,255,255,0.18)",
    btnBorder: "rgba(255,255,255,0.25)",
    btnColor: "white",
    accentBtn: "rgba(255,255,255,0.95)",
    accentBtnText: "#064E3B",
    statKey: "food" as const,
    size: "hero",
  },
  {
    key: "orders",
    title: "ระบบสั่งซื้อรายเดือน",
    sub: "แต่ละแผนกสั่งซื้อสินค้าประจำเดือน",
    href: "/orders",
    newHref: "/orders/new",
    newLabel: "+ สร้างรายการ",
    roles: null,
    icon: ShoppingCart,
    gradient: "radial-gradient(ellipse at 25% 65%, rgba(96,165,250,0.9) 0%, transparent 55%), radial-gradient(ellipse at 75% 20%, rgba(59,130,246,0.75) 0%, transparent 55%), radial-gradient(ellipse at 60% 90%, rgba(37,99,235,0.65) 0%, transparent 45%), #1E3A8A",
    textColor: "rgba(255,255,255,0.95)",
    subColor: "rgba(255,255,255,0.55)",
    btnBg: "rgba(255,255,255,0.18)",
    btnBorder: "rgba(255,255,255,0.25)",
    btnColor: "white",
    accentBtn: "rgba(255,255,255,0.95)",
    accentBtnText: "#1E3A8A",
    statKey: "orders" as const,
    size: "hero",
  },
];

const SMALL_SYSTEMS = [
  {
    key: "maintenance",
    title: "ระบบแจ้งซ่อม",
    sub: "แจ้งซ่อมบำรุง",
    href: "/maintenance",
    newHref: "/maintenance/new",
    newLabel: "+ แจ้งซ่อม",
    icon: Wrench,
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    statKey: "maintenance" as const,
  },
  {
    key: "chang",
    title: "ระบบช่าง",
    sub: "ดูรายการจาก AppSheet",
    href: "/chang",
    newHref: null,
    newLabel: null,
    icon: HardHat,
    color: "#0891B2",
    bg: "#ECFEFF",
    border: "#A5F3FC",
    statKey: null,
  },
  {
    key: "po",
    title: "ใบสั่งซื้อ (PO)",
    sub: "Purchase Orders",
    href: "/po",
    newHref: "/po/new",
    newLabel: "+ PO",
    icon: FileText,
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#FDE68A",
    statKey: null,
  },
  {
    key: "jo",
    title: "ใบสั่งจ้าง (JO)",
    sub: "Job Orders",
    href: "/jo",
    newHref: "/jo/new",
    newLabel: "+ JO",
    icon: Hammer,
    color: "#0891B2",
    bg: "#ECFEFF",
    border: "#A5F3FC",
    statKey: null,
  },
];

export default function HomePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const role = (session?.user as { role?: string })?.role;
  const rawName = (session?.user as { userName?: string })?.userName ?? session?.user?.name ?? "";
  const firstName = rawName.split(" ")[0];

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
        food: { pending: foodOrders.filter((o: { status: string }) => o.status === "pending").length, total: foodOrders.length },
        maintenance: {
          open: maintReqs.filter((r: { status: string }) => r.status === "open").length,
          urgent: maintReqs.filter((r: { priority: string; status: string }) => r.priority === "urgent" && r.status !== "closed").length,
          total: maintReqs.length,
        },
        orders: { pending: monthlyOrders.filter((o: { status: string }) => o.status === "pending").length, total: monthlyOrders.length },
      });
    }).catch(() => {});
  }, []);

  const totalPending = stats ? stats.food.pending + stats.orders.pending : 0;
  const totalUrgent = stats?.maintenance.urgent ?? 0;
  const totalAll = stats ? stats.food.total + stats.orders.total + stats.maintenance.total : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#EDEAE6", fontFamily: "'Noto Sans Thai', 'Sarabun', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#059669,#34d399)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14 }}>🌱</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9C9289" }}>Tonkla School</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {totalUrgent > 0 && (
            <div style={{ position: "relative" }}>
              <Bell size={18} style={{ color: "#6B6460" }} />
              <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#EF4444", border: "2px solid #EDEAE6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 8, color: "white", fontWeight: 800 }}>{totalUrgent}</span>
              </div>
            </div>
          )}
          <Link href="/settings/users">
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#D6CFC8,#BEB5AD)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <User size={16} style={{ color: "#7A736D" }} />
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Greeting */}
      <div style={{ padding: "28px 24px 0", maxWidth: 960, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9C9289", textTransform: "uppercase", marginBottom: 6 }}>
          {new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 3.8rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#1C1815", lineHeight: 1.05, marginBottom: 0 }}>
          {firstName ? `สวัสดี, ${firstName}` : "ระบบจัดการ"}
        </h1>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <StatPill value={totalPending} label="รออนุมัติ" color="#D97706" bg="#FEF3C7" />
          <StatPill value={totalUrgent} label="ด่วน" color="#DC2626" bg="#FEE2E2" />
          <StatPill value={totalAll} label="ทั้งหมด" color="#374151" bg="#F3F4F6" />
        </div>
      </div>

      {/* Main cards */}
      <div style={{ padding: "28px 24px 48px", maxWidth: 960, margin: "0 auto" }}>

        {/* Hero gradient cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
          {SYSTEMS.map((sys) => {
            const Icon = sys.icon;
            const canCreate = sys.roles === null || (sys.roles && role && sys.roles.includes(role));
            const pending = sys.statKey === "food" ? stats?.food.pending : stats?.orders.pending;
            const total = sys.statKey === "food" ? stats?.food.total : stats?.orders.total;

            return (
              <div key={sys.key} style={{
                borderRadius: 24,
                overflow: "hidden",
                background: sys.gradient,
                padding: 28,
                position: "relative",
                minHeight: 200,
              }}>
                {/* dot grid overlay */}
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }} />

                <div style={{ position: "relative" }}>
                  {/* Icon + stats row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.25)" }}>
                      <Icon size={22} color="white" strokeWidth={1.8} />
                    </div>
                    {stats && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-0.04em" }}>{total ?? 0}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 500, marginTop: 2 }}>รายการทั้งหมด</div>
                      </div>
                    )}
                  </div>

                  <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: sys.textColor, marginBottom: 4, letterSpacing: "-0.01em" }}>{sys.title}</h2>
                  <p style={{ fontSize: 12, color: sys.subColor, marginBottom: 20 }}>{sys.sub}</p>

                  {pending !== undefined && pending > 0 && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 20, background: "rgba(251,191,36,0.25)", border: "1px solid rgba(251,191,36,0.4)", marginBottom: 16 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FBBF24", animation: "pulse 2s infinite" }} />
                      <span style={{ fontSize: 11, color: "#FDE68A", fontWeight: 600 }}>รออนุมัติ {pending} รายการ</span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <Link href={sys.href} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 14, background: sys.btnBg, border: `1px solid ${sys.btnBorder}`, color: sys.btnColor, fontSize: 13, fontWeight: 600, textDecoration: "none", backdropFilter: "blur(8px)", transition: "all 0.2s" }}>
                      ดูรายการ <ArrowRight size={13} />
                    </Link>
                    {canCreate && sys.newHref && (
                      <Link href={sys.newHref} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 14, background: sys.accentBtn, color: sys.accentBtnText, fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                        {sys.newLabel}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Small cards 2x2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {SMALL_SYSTEMS.map((sys) => {
            const Icon = sys.icon;
            const urgentCount = sys.key === "maintenance" ? stats?.maintenance.urgent : undefined;
            const totalCount = sys.key === "maintenance" ? stats?.maintenance.total : undefined;

            return (
              <div key={sys.key} style={{ background: "white", borderRadius: 20, padding: 22, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: sys.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${sys.border}` }}>
                    <Icon size={19} style={{ color: sys.color }} strokeWidth={1.8} />
                  </div>
                  {urgentCount !== undefined && urgentCount > 0 && (
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 10, color: "white", fontWeight: 800 }}>{urgentCount}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1C1815", marginBottom: 2 }}>{sys.title}</div>
                  <div style={{ fontSize: 11, color: "#9C9289" }}>{sys.sub}</div>
                  {totalCount !== undefined && (
                    <div style={{ fontSize: 10, color: "#B4A99E", marginTop: 4 }}>ทั้งหมด {totalCount} รายการ</div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <Link href={sys.href} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 12px", borderRadius: 11, background: sys.bg, color: sys.color, fontSize: 12, fontWeight: 600, textDecoration: "none", border: `1px solid ${sys.border}` }}>
                    ดู <ArrowRight size={11} />
                  </Link>
                  {sys.newHref && (
                    <Link href={sys.newHref} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 10px", borderRadius: 11, background: sys.color, color: "white", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      {sys.newLabel}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function StatPill({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 20, background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1C1815", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 11, color: "#9C9289", fontWeight: 500 }}>{label}</span>
    </div>
  );
}
