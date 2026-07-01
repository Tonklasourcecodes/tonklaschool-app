"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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

const GROUP_ACCENT: Record<string, string> = {
  "จัดซื้อ": "#34d399",
  "ห้องครัว": "#34d399",
  "ซ่อมบำรุง": "#a78bfa",
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

      {/* ── Sidebar ── */}
      <aside style={{
        width: 248, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "#111210",
        borderRight: "1px solid rgba(255,255,255,0.04)",
      }}>

        {/* Logo */}
        <div style={{ padding: "20px 16px 16px" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(135deg,#34d399 0%,#059669 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 19, boxShadow: "0 4px 14px rgba(52,211,153,0.35)",
            }}>🌱</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white", letterSpacing: "-0.03em", lineHeight: 1.1 }}>ต้นกล้า</div>
              <div style={{ fontSize: 9, color: "rgba(52,211,153,0.45)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 1 }}>TONKLA SCHOOL</div>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px 8px" }} />

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "4px 10px 0", scrollbarWidth: "none" }}>

          {/* Dashboard (ungrouped) */}
          {ungrouped.filter(n => n.href !== "/settings").map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 12, marginBottom: 2,
                textDecoration: "none", transition: "all 0.12s",
                background: active ? "rgba(52,211,153,0.12)" : "transparent",
                color: active ? "#34d399" : "rgba(255,255,255,0.45)",
              }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = active ? "#34d399" : "rgba(255,255,255,0.75)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "rgba(52,211,153,0.12)" : "transparent"; (e.currentTarget as HTMLElement).style.color = active ? "#34d399" : "rgba(255,255,255,0.45)"; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: active ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.05)",
                  transition: "all 0.12s",
                }}>
                  <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, letterSpacing: "-0.01em" }}>{label}</span>
                {active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />}
              </Link>
            );
          })}

          {/* Grouped */}
          {grouped.map(({ group, items }) => {
            const accent = GROUP_ACCENT[group] ?? "#34d399";
            return (
              <div key={group} style={{ marginTop: 20 }}>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "rgba(255,255,255,0.2)", padding: "0 12px", marginBottom: 4,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ flex: 1 }}>{group}</span>
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", flex: 1 }} />
                </div>
                {items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link key={href} href={href} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", borderRadius: 12, marginBottom: 2,
                      textDecoration: "none", transition: "all 0.12s",
                      background: active ? `${accent}18` : "transparent",
                      color: active ? accent : "rgba(255,255,255,0.45)",
                    }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = active ? accent : "rgba(255,255,255,0.75)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? `${accent}18` : "transparent"; (e.currentTarget as HTMLElement).style.color = active ? accent : "rgba(255,255,255,0.45)"; }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: active ? `${accent}25` : "rgba(255,255,255,0.05)",
                        transition: "all 0.12s",
                      }}>
                        <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, letterSpacing: "-0.01em" }}>{label}</span>
                      {active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: accent, flexShrink: 0 }} />}
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Settings at bottom of nav */}
          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 2px 8px" }} />
            {ungrouped.filter(n => n.href === "/settings").map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 12,
                  textDecoration: "none", transition: "all 0.12s",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? "rgba(255,255,255,0.08)" : "transparent"; (e.currentTarget as HTMLElement).style.color = active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)"; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.05)",
                  }}>
                    <Icon size={14} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em" }}>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            borderRadius: 14, background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" style={{
                width: 32, height: 32, borderRadius: 10, objectFit: "cover", flexShrink: 0,
                border: "1.5px solid rgba(52,211,153,0.3)",
              }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg,#1a3a22,#2d5c38)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1.5px solid rgba(52,211,153,0.25)",
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#34d399" }}>{displayName[0]?.toUpperCase()}</span>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{session?.user?.email}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="ออกจากระบบ"
              style={{
                background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.3)", flexShrink: 0,
                width: 28, height: 28, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F0EDE9" }}>

        {/* Top bar */}
        <header style={{
          height: 48, flexShrink: 0, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 32px",
          background: "rgba(240,237,233,0.85)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isSubPage && (
              <button onClick={() => router.back()} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.09)",
                background: "white", color: "#5C5450", fontSize: 12, fontWeight: 600,
                cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <ArrowLeft size={12} /> ย้อนกลับ
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {pathname !== "/" && (
                <>
                  <Link href="/" style={{ fontSize: 12, color: "#B4A99E", textDecoration: "none" }}>หน้าหลัก</Link>
                  <ChevronRight size={11} style={{ color: "#C8C0B8" }} />
                </>
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1815" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#9C9289", fontWeight: 500 }}>{displayName}</span>
            {session?.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" style={{ width: 24, height: 24, borderRadius: 8, objectFit: "cover", border: "1.5px solid rgba(0,0,0,0.08)" }} />
            )}
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
