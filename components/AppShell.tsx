"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, FileText, Hammer, ShoppingCart, ShoppingBasket,
  Wrench, HardHat, Settings, ChevronRight, Bell, LogOut, Package, ArrowLeft,
} from "lucide-react";

const NAV = [
  { href: "/",            label: "Dashboard",         icon: LayoutDashboard, group: null },
  { href: "/po",          label: "ใบสั่งซื้อ (PO)",   icon: FileText,        group: "จัดซื้อ" },
  { href: "/jo",          label: "ใบสั่งจ้าง (JO)",   icon: Hammer,          group: "จัดซื้อ" },
  { href: "/orders",      label: "สั่งซื้อรายเดือน",  icon: ShoppingCart,    group: "จัดซื้อ" },
  { href: "/suppliers",   label: "ผู้จำหน่าย",         icon: Package,         group: "จัดซื้อ" },
  { href: "/food",        label: "ระบบวัตถุดิบ",       icon: ShoppingBasket,  group: "ห้องครัว" },
  { href: "/maintenance", label: "ระบบแจ้งซ่อม",      icon: Wrench,          group: "ซ่อมบำรุง" },
  { href: "/chang",       label: "ระบบช่าง",           icon: HardHat,         group: "ซ่อมบำรุง" },
  { href: "/settings",    label: "ตั้งค่า",            icon: Settings,        group: null },
];

const GROUP_ORDER = [null, "จัดซื้อ", "ห้องครัว", "ซ่อมบำรุง"];

function groupNav() {
  const result: { group: string | null; items: typeof NAV }[] = [];
  for (const g of GROUP_ORDER) {
    const items = NAV.filter((n) => n.group === g);
    if (items.length) result.push({ group: g, items });
  }
  return result;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const router = useRouter();

  if (pathname === "/login") return <>{children}</>;

  const segments = pathname.split("/").filter(Boolean);
  const isSubPage = segments.length >= 2; // e.g. /po/PO-001, /food/new

  const userName = (session?.user as { userName?: string; approverName?: string })?.approverName
    ?? (session?.user as { userName?: string })?.userName
    ?? session?.user?.name ?? "";
  const displayName = userName.split(" ")[0];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#EDEAE6" }}>
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "#E8E4DF", borderRight: "1px solid rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg,#059669,#34d399)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
            }}>🌱</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1C1815", letterSpacing: "-0.01em", lineHeight: 1.2 }}>ต้นกล้า</div>
              <div style={{ fontSize: 9.5, color: "#9C9289", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Tonkla School</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          {groupNav().map(({ group, items }) => (
            <div key={group ?? "_top"} style={{ marginBottom: 20 }}>
              {group && (
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C4B9AD", padding: "0 8px", marginBottom: 4 }}>
                  {group}
                </div>
              )}
              {items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href} style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", borderRadius: 10, marginBottom: 1,
                    textDecoration: "none", transition: "all 0.15s",
                    background: active ? "#F0FDF4" : "transparent",
                    color: active ? "#059669" : "#5C5450",
                  }}>
                    <Icon size={15} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, flex: 1 }}>{label}</span>
                    {active && <ChevronRight size={12} style={{ color: "#059669", opacity: 0.6 }} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 10 }}>
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#D6CFC8,#BEB5AD)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#7A736D" }}>{displayName?.[0]?.toUpperCase() ?? "?"}</span>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1C1815", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName || "User"}</div>
              <div style={{ fontSize: 10, color: "#B4A99E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</div>
            </div>
            <Link href="/api/auth/signout" style={{ color: "#C4B9AD", flexShrink: 0 }}>
              <LogOut size={13} />
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{
          height: 52, flexShrink: 0, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 28px",
          background: "rgba(237,234,230,0.8)", backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}>
          {/* Back button + Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isSubPage && (
              <button
                onClick={() => router.back()}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)",
                  background: "white", color: "#5C5450", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F0FDF4"; (e.currentTarget as HTMLButtonElement).style.color = "#059669"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#BBF7D0"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "white"; (e.currentTarget as HTMLButtonElement).style.color = "#5C5450"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.08)"; }}
              >
                <ArrowLeft size={13} /> ย้อนกลับ
              </button>
            )}
            <Breadcrumb pathname={pathname} />
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Bell size={16} style={{ color: "#9C9289" }} />
            <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.1)" }} />
            <span style={{ fontSize: 12, color: "#7A736D", fontWeight: 500 }}>{displayName}</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

const BREADCRUMB_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/po": "ใบสั่งซื้อ (PO)",
  "/jo": "ใบสั่งจ้าง (JO)",
  "/orders": "สั่งซื้อรายเดือน",
  "/food": "ระบบวัตถุดิบ",
  "/maintenance": "ระบบแจ้งซ่อม",
  "/chang": "ระบบช่าง",
  "/suppliers": "ผู้จำหน่าย",
  "/items": "รายการสินค้า",
  "/settings": "ตั้งค่า",
  "/approvals": "อนุมัติ",
};

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  const topSection = "/" + (segments[0] ?? "");
  const sectionLabel = BREADCRUMB_MAP[topSection] ?? segments[0];

  if (pathname === "/") {
    return <span style={{ fontSize: 13, fontWeight: 600, color: "#5C5450" }}>Dashboard</span>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Link href="/" style={{ fontSize: 12, color: "#9C9289", textDecoration: "none", fontWeight: 500 }}>หน้าหลัก</Link>
      <ChevronRight size={12} style={{ color: "#C4B9AD" }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1815" }}>{sectionLabel}</span>
      {segments.length > 1 && segments[1] !== "new" && (
        <>
          <ChevronRight size={12} style={{ color: "#C4B9AD" }} />
          <span style={{ fontSize: 12, color: "#9C9289", fontFamily: "monospace" }}>
            {segments[1] === "new" ? "สร้างใหม่" : decodeURIComponent(segments[1]).replace(/~/g, "/")}
          </span>
        </>
      )}
      {segments.length > 1 && segments[1] === "new" && (
        <>
          <ChevronRight size={12} style={{ color: "#C4B9AD" }} />
          <span style={{ fontSize: 12, color: "#9C9289" }}>สร้างใหม่</span>
        </>
      )}
    </div>
  );
}
