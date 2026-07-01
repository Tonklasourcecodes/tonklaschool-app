"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, FileText, Hammer, ShoppingCart, ShoppingBasket,
  Wrench, HardHat, Settings, ChevronRight, LogOut, Package, ArrowLeft,
} from "lucide-react";

const NAV = [
  { href: "/",            label: "Dashboard",        icon: LayoutDashboard },
  { href: "/po",          label: "ใบสั่งซื้อ (PO)",  icon: FileText,       group: "จัดซื้อ" },
  { href: "/jo",          label: "ใบสั่งจ้าง (JO)",  icon: Hammer,         group: "จัดซื้อ" },
  { href: "/orders",      label: "สั่งซื้อรายเดือน", icon: ShoppingCart,   group: "จัดซื้อ" },
  { href: "/suppliers",   label: "ผู้จำหน่าย",        icon: Package,        group: "จัดซื้อ" },
  { href: "/food",        label: "วัตถุดิบ",           icon: ShoppingBasket, group: "ห้องครัว" },
  { href: "/maintenance", label: "แจ้งซ่อม",          icon: Wrench,         group: "ซ่อมบำรุง" },
  { href: "/chang",       label: "ระบบช่าง",          icon: HardHat,        group: "ซ่อมบำรุง" },
  { href: "/settings",    label: "ตั้งค่า",           icon: Settings },
];

const GROUPS = ["จัดซื้อ", "ห้องครัว", "ซ่อมบำรุง"];

const BREADCRUMB_MAP: Record<string, string> = {
  "/": "Dashboard", "/po": "ใบสั่งซื้อ (PO)", "/jo": "ใบสั่งจ้าง (JO)",
  "/orders": "สั่งซื้อรายเดือน", "/food": "วัตถุดิบ", "/maintenance": "แจ้งซ่อม",
  "/chang": "ระบบช่าง", "/suppliers": "ผู้จำหน่าย", "/items": "สินค้า",
  "/settings": "ตั้งค่า", "/approvals": "อนุมัติ",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  if (pathname === "/login") return <>{children}</>;

  const segments = pathname.split("/").filter(Boolean);
  const isSubPage = segments.length >= 2;
  const topSection = "/" + (segments[0] ?? "");

  const rawName = (session?.user as { userName?: string; approverName?: string })?.approverName
    ?? (session?.user as { userName?: string })?.userName
    ?? session?.user?.name ?? "";
  const displayName = rawName.split(" ")[0] || "User";

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const ungrouped = NAV.filter((n) => !n.group);
  const grouped = GROUPS.map((g) => ({ group: g, items: NAV.filter((n) => n.group === g) }));

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── Dark Sidebar ─────────────────────────────── */}
      <aside style={{
        width: 224, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "#0D1F14", overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "22px 18px 18px" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg,#34d399,#059669)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>🌱</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>ต้นกล้า</div>
              <div style={{ fontSize: 9, color: "rgba(52,211,153,0.5)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>TONKLA SCHOOL</div>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 14px" }} />

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "14px 10px", scrollbarWidth: "none" }}>
          {/* Ungrouped top items */}
          {ungrouped.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "8px 10px", borderRadius: 10, marginBottom: 2,
                textDecoration: "none", transition: "all 0.15s",
                background: active ? "rgba(52,211,153,0.15)" : "transparent",
                borderLeft: active ? "2px solid #34d399" : "2px solid transparent",
                color: active ? "#34d399" : "rgba(255,255,255,0.5)",
              }}>
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 400 }}>{label}</span>
              </Link>
            );
          })}

          {/* Grouped items */}
          {grouped.map(({ group, items }) => (
            <div key={group} style={{ marginTop: 22 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", padding: "0 10px", marginBottom: 6 }}>
                {group}
              </div>
              {items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href} style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", borderRadius: 10, marginBottom: 2,
                    textDecoration: "none", transition: "all 0.15s",
                    background: active ? "rgba(52,211,153,0.15)" : "transparent",
                    borderLeft: active ? "2px solid #34d399" : "2px solid transparent",
                    color: active ? "#34d399" : "rgba(255,255,255,0.5)",
                  }}>
                    <Icon size={15} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 400 }}>{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: "10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px", borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid rgba(52,211,153,0.4)" }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#1a3a22,#2d5c38)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1.5px solid rgba(52,211,153,0.3)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>{displayName[0]?.toUpperCase()}</span>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</div>
            </div>
            <Link href="/api/auth/signout" style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0, display: "flex" }}>
              <LogOut size={13} />
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F0EDE9" }}>

        {/* Top bar */}
        <header style={{
          height: 50, flexShrink: 0, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 28px",
          background: "rgba(240,237,233,0.9)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isSubPage && (
              <button onClick={() => router.back()} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 11px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)",
                background: "white", color: "#5C5450", fontSize: 12, fontWeight: 600,
                cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}>
                <ArrowLeft size={12} /> ย้อนกลับ
              </button>
            )}
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {pathname !== "/" && (
                <>
                  <Link href="/" style={{ fontSize: 12, color: "#A09690", textDecoration: "none" }}>หน้าหลัก</Link>
                  <ChevronRight size={11} style={{ color: "#C8C0B8" }} />
                </>
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1815" }}>
                {BREADCRUMB_MAP[topSection] ?? segments[0] ?? "Dashboard"}
              </span>
              {segments.length > 1 && (
                <>
                  <ChevronRight size={11} style={{ color: "#C8C0B8" }} />
                  <span style={{ fontSize: 12, color: "#A09690", fontFamily: "monospace" }}>
                    {segments[1] === "new" ? "สร้างใหม่" : decodeURIComponent(segments[1]).replace(/~/g, "/")}
                  </span>
                </>
              )}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#9C9289", fontWeight: 500 }}>{displayName}</span>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
