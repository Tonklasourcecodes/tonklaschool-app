"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUpRight, CheckCircle, XCircle, Plus } from "lucide-react";
import type { PO, JO } from "@/lib/types-po";

function useCountUp(target: number, active: boolean) {
  const [n, setN] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!active || target === 0) { setN(0); return; }
    const start = performance.now(), dur = 1200;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, active]);
  return active ? n : null;
}

function BigNum({ value, loading }: { value: number; loading: boolean }) {
  const n = useCountUp(value, !loading);
  return <>{n === null ? "—" : n.toLocaleString()}</>;
}

function fmtMoney(val: string) {
  const n = parseFloat((val ?? "").replace(/,/g, ""));
  return isNaN(n) ? "—" : n.toLocaleString("th-TH", { maximumFractionDigits: 0 }) + " ฿";
}

interface FoodOrder { id: string; status: string; }
interface MaintReq { id: string; status: string; priority: string; title?: string; request_number?: string; }
interface MonthlyOrder { id: string; status: string; }

export default function HomePage() {
  const { data: session } = useSession();
  const [pos, setPos] = useState<PO[]>([]);
  const [jos, setJos] = useState<JO[]>([]);
  const [food, setFood] = useState<FoodOrder[]>([]);
  const [maint, setMaint] = useState<MaintReq[]>([]);
  const [monthly, setMonthly] = useState<MonthlyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "admin" || role === "approver";
  const rawName = (session?.user as { userName?: string; approverName?: string })?.approverName
    ?? (session?.user as { userName?: string })?.userName
    ?? session?.user?.name ?? "";
  const firstName = rawName.split(" ")[0];

  useEffect(() => {
    Promise.all([
      fetch("/api/po?q=").then(r => r.json()).catch(() => ({ pos: [] })),
      fetch("/api/jo?q=").then(r => r.json()).catch(() => ({ jos: [] })),
      fetch("/api/food").then(r => r.json()).catch(() => ({ orders: [] })),
      fetch("/api/maintenance").then(r => r.json()).catch(() => ({ requests: [] })),
      fetch("/api/monthly-orders").then(r => r.json()).catch(() => ({ orders: [] })),
    ]).then(([pd, jd, fd, md, od]) => {
      setPos(pd.pos ?? []); setJos(jd.jos ?? []);
      setFood(fd.orders ?? []); setMaint(md.requests ?? []); setMonthly(od.orders ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const poPending = pos.filter(p => p.approvalStatus === "รออนุมัติ");
  const joPending = jos.filter(j => j.approvalStatus === "รออนุมัติ");
  const totalPending = poPending.length + joPending.length + food.filter(o => o.status === "pending").length + monthly.filter(o => o.status === "pending").length;
  const urgentCount = maint.filter(r => r.priority === "urgent" && r.status !== "closed").length;
  const poValue = pos.reduce((s, p) => s + (parseFloat((p.grandTotal || "0").replace(/,/g, "")) || 0), 0);

  async function approve(type: "po" | "jo", id: string, status: "อนุมัติแล้ว" | "ยกเลิก") {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/${type}/${id.replace(/\//g, "~")}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: status, approvalDate: new Date().toLocaleDateString("th-TH") }),
      });
      const d = await res.json() as { po?: PO; jo?: JO };
      if (type === "po" && d.po) setPos(prev => prev.map(p => p.poNumber === id ? d.po! : p));
      if (type === "jo" && d.jo) setJos(prev => prev.map(j => j.joNumber === id ? d.jo! : j));
    } finally { setApprovingId(null); }
  }

  const thDate = new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "100%", background: "#F0EDE9", overflowX: "hidden" }}>

      {/* ══════════════════════════════════════════
          HERO — huge name + floating stats
      ══════════════════════════════════════════ */}
      <div style={{ padding: "48px 44px 0" }}>

        {/* Name */}
        <p style={{ fontSize: 12, fontWeight: 600, color: "#9C9289", letterSpacing: "0.04em", marginBottom: 6 }}>{thDate}</p>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: "clamp(3.5rem, 7vw, 5.5rem)", fontWeight: 900,
            letterSpacing: "-0.045em", lineHeight: 0.95,
            color: "#1C1815", margin: 0,
          }}>
            {firstName ? `สวัสดี, ${firstName}` : "ระบบจัดการ"}
          </h1>
        </div>

        {/* Giant stat row — Superpower style */}
        <div style={{ display: "flex", gap: 0, marginBottom: 44, borderBottom: "1px solid rgba(0,0,0,0.08)", paddingBottom: 32 }}>
          {[
            { label: "PO",          value: pos.length,   accent: "#059669", sub: `อนุมัติแล้ว ${pos.filter(p=>p.approvalStatus==="อนุมัติแล้ว").length}` },
            { label: "JO",          value: jos.length,   accent: "#7C3AED", sub: `อนุมัติแล้ว ${jos.filter(j=>j.approvalStatus==="อนุมัติแล้ว").length}` },
            { label: "รออนุมัติ",  value: totalPending, accent: totalPending > 0 ? "#D97706" : "#B4A99E", sub: "รายการทั้งหมด" },
            { label: "ด่วน",        value: urgentCount,  accent: urgentCount > 0 ? "#EF4444" : "#B4A99E", sub: "แจ้งซ่อมเร่งด่วน" },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, paddingRight: 32, borderRight: i < 3 ? "1px solid rgba(0,0,0,0.08)" : "none", paddingLeft: i > 0 ? 32 : 0 }}>
              <div style={{ fontSize: "clamp(2.4rem,4vw,3.8rem)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, color: s.accent, marginBottom: 6 }}>
                <BigNum value={s.value} loading={loading} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1C1815", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#B4A99E" }}>{loading ? "..." : s.sub}</div>
            </div>
          ))}
          {/* Total value */}
          <div style={{ flex: 1.5, paddingLeft: 32 }}>
            <div style={{ fontSize: "clamp(1.4rem,3vw,2.4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "#1C1815", marginBottom: 6 }}>
              {loading ? "—" : poValue.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
              <span style={{ fontSize: "0.4em", fontWeight: 600, color: "#9C9289", marginLeft: 4 }}>฿</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1C1815", marginBottom: 2 }}>มูลค่า PO รวม</div>
            <div style={{ fontSize: 11, color: "#B4A99E" }}>ปีงบประมาณปัจจุบัน</div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 44, flexWrap: "wrap" }}>
          {[
            { href: "/po/new",          label: "สร้าง PO",     bg: "#059669", text: "white", glow: "rgba(5,150,105,0.3)" },
            { href: "/jo/new",          label: "สร้าง JO",     bg: "#0D1F14", text: "white", glow: "rgba(0,0,0,0.15)" },
            { href: "/orders/new",      label: "สั่งซื้อรายเดือน", bg: "white", text: "#1C1815", border: true },
            { href: "/food/new",        label: "สั่งวัตถุดิบ",  bg: "white", text: "#1C1815", border: true },
            { href: "/maintenance/new", label: "แจ้งซ่อม",      bg: "white", text: "#1C1815", border: true },
          ].map(b => (
            <Link key={b.href} href={b.href} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 14,
              fontSize: 13, fontWeight: 700, textDecoration: "none", background: b.bg, color: b.text,
              border: b.border ? "1.5px solid rgba(0,0,0,0.1)" : "none",
              boxShadow: b.glow ? `0 4px 16px ${b.glow}` : "0 1px 4px rgba(0,0,0,0.07)",
              transition: "all 0.18s",
            }}>
              <Plus size={13} strokeWidth={2.5} />{b.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          GRADIENT HERO CARDS — Superpower style
      ══════════════════════════════════════════ */}
      <div style={{ padding: "0 44px", marginBottom: 36 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* PO Value card — forest green mesh */}
          <Link href="/po" style={{ textDecoration: "none", display: "block", borderRadius: 28, overflow: "hidden", position: "relative", minHeight: 220 }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 20% 70%, rgba(52,211,153,0.95) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.8) 0%, transparent 55%), radial-gradient(ellipse at 55% 100%, rgba(5,150,105,0.7) 0%, transparent 45%), #064E3B",
            }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            <div style={{ position: "relative", padding: "32px 32px 28px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.6)" }}>มูลค่า PO รวม</span>
                <ArrowUpRight size={18} style={{ color: "rgba(255,255,255,0.5)" }} />
              </div>
              <div>
                <div style={{ fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "white", lineHeight: 1, marginBottom: 8 }}>
                  {loading ? "—" : poValue.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                  <span style={{ fontSize: "0.38em", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginLeft: 6 }}>฿</span>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  {loading ? "..." : `จาก ${pos.length.toLocaleString()} ใบสั่งซื้อ`}
                </div>
              </div>
            </div>
          </Link>

          {/* Pending card — amber/orange mesh */}
          <Link href="/po" style={{ textDecoration: "none", display: "block", borderRadius: 28, overflow: "hidden", position: "relative", minHeight: 220 }}>
            <div style={{
              position: "absolute", inset: 0,
              background: totalPending > 0
                ? "radial-gradient(ellipse at 25% 65%, rgba(251,191,36,0.95) 0%, transparent 55%), radial-gradient(ellipse at 75% 25%, rgba(245,158,11,0.8) 0%, transparent 55%), radial-gradient(ellipse at 50% 95%, rgba(217,119,6,0.7) 0%, transparent 45%), #78350F"
                : "radial-gradient(ellipse at 25% 65%, rgba(167,243,208,0.5) 0%, transparent 55%), #F0FDF4",
            }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            <div style={{ position: "relative", padding: "32px 32px 28px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: totalPending > 0 ? "rgba(255,255,255,0.6)" : "rgba(5,150,105,0.6)" }}>รออนุมัติ</span>
                <ArrowUpRight size={18} style={{ color: totalPending > 0 ? "rgba(255,255,255,0.5)" : "rgba(5,150,105,0.4)" }} />
              </div>
              <div>
                <div style={{ fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: totalPending > 0 ? "white" : "#059669", lineHeight: 1, marginBottom: 8 }}>
                  {loading ? "—" : totalPending}
                </div>
                <div style={{ fontSize: 13, color: totalPending > 0 ? "rgba(255,255,255,0.6)" : "rgba(5,150,105,0.6)" }}>
                  {loading ? "..." : totalPending > 0 ? `PO ${poPending.length} · JO ${joPending.length} · อื่นๆ ${totalPending - poPending.length - joPending.length}` : "ทุกรายการอนุมัติแล้ว ✓"}
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BOTTOM: PENDING + RECENT PO
      ══════════════════════════════════════════ */}
      <div style={{ padding: "0 44px 48px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>

        {/* Recent PO table */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1C1815", margin: 0 }}>รายการ PO ล่าสุด</h2>
            <Link href="/po" style={{ fontSize: 12, fontWeight: 600, color: "#059669", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>ดูทั้งหมด <ArrowUpRight size={12} /></Link>
          </div>
          <div style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr auto 110px", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.01)" }}>
              {["เลขที่", "ผู้จำหน่าย", "มูลค่า", "สถานะ"].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C4B9AD" }}>{h}</div>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: 16 }}>
                {[...Array(6)].map((_, i) => <div key={i} style={{ height: 44, borderRadius: 10, background: "#F5F2EE", marginBottom: 8 }} />)}
              </div>
            ) : pos.slice(0, 10).map((po, i) => {
              const sMap: Record<string, { bg: string; color: string; dot: string }> = {
                "รออนุมัติ":   { bg: "#FEF3C7", color: "#92400E", dot: "#D97706" },
                "อนุมัติแล้ว": { bg: "#DCFCE7", color: "#14532D", dot: "#16A34A" },
                "ยกเลิก":     { bg: "#FEE2E2", color: "#991B1B", dot: "#DC2626" },
              };
              const s = sMap[po.approvalStatus];
              return (
                <Link key={po.poNumber} href={`/po/${po.poNumber.replace(/\//g, "~")}`} style={{
                  display: "grid", gridTemplateColumns: "140px 1fr auto 110px", gap: 12, alignItems: "center",
                  padding: "13px 20px", borderBottom: i < 9 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  textDecoration: "none", transition: "background 0.12s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "#FAFAF8"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ""}
                >
                  <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "#ECFDF5", color: "#15803D" }}>{po.poNumber}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1C1815", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.supplierName}</div>
                    <div style={{ fontSize: 11, color: "#B4A99E" }}>{po.orderDate || "—"}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1815" }}>{fmtMoney(po.grandTotal)}</span>
                  {s ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: s.bg, color: s.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />{po.approvalStatus}
                    </span>
                  ) : <span />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Pending approvals */}
          {isAdmin && (poPending.length + joPending.length) > 0 && (
            <div style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1.5px solid #FCD34D", boxShadow: "0 4px 20px rgba(217,119,6,0.1)" }}>
              <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97706", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>รออนุมัติ</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#D97706", color: "white", fontWeight: 700 }}>{poPending.length + joPending.length}</span>
                </div>
              </div>
              <div>
                {[...poPending.slice(0, 3).map(p => ({ type: "po" as const, num: p.poNumber, name: p.supplierName, amount: p.grandTotal })),
                  ...joPending.slice(0, 2).map(j => ({ type: "jo" as const, num: j.joNumber, name: j.supplierName, amount: j.grandTotal }))
                ].map((item, i, arr) => (
                  <div key={item.num} style={{ padding: "12px 18px", borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: item.type === "po" ? "#ECFDF5" : "#F5F3FF", color: item.type === "po" ? "#15803D" : "#6D28D9" }}>{item.num}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1C1815" }}>{fmtMoney(item.amount)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#5C5450", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => approve(item.type, item.num, "อนุมัติแล้ว")} disabled={approvingId === item.num} style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        padding: "7px 0", borderRadius: 10, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 700, color: "white",
                        background: "linear-gradient(135deg,#34d399,#059669)",
                        opacity: approvingId === item.num ? 0.6 : 1,
                      }}>
                        <CheckCircle size={12} />{approvingId === item.num ? "..." : "อนุมัติ"}
                      </button>
                      <button onClick={() => approve(item.type, item.num, "ยกเลิก")} disabled={approvingId === item.num} style={{
                        padding: "7px 12px", borderRadius: 10, border: "1px solid #FCA5A5",
                        cursor: "pointer", fontSize: 12, color: "#DC2626", background: "white",
                        opacity: approvingId === item.num ? 0.6 : 1,
                      }}>
                        <XCircle size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System quick access */}
          <div style={{ background: "white", borderRadius: 20, padding: 6, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {[
              { href: "/po",          emoji: "📄", label: "ใบสั่งซื้อ (PO)",   count: pos.length },
              { href: "/jo",          emoji: "🔨", label: "ใบสั่งจ้าง (JO)",   count: jos.length },
              { href: "/orders",      emoji: "🛒", label: "สั่งซื้อรายเดือน",  count: monthly.length },
              { href: "/food",        emoji: "🧺", label: "วัตถุดิบ",           count: food.length },
              { href: "/maintenance", emoji: "🔧", label: "แจ้งซ่อม",          count: maint.length },
              { href: "/chang",       emoji: "👷", label: "ระบบช่าง",          count: null },
              { href: "/suppliers",   emoji: "🏪", label: "ผู้จำหน่าย",        count: null },
            ].map(({ href, emoji, label, count }) => (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 14,
                textDecoration: "none", transition: "background 0.12s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "#F5F2EE"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ""}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#3C3834" }}>{label}</span>
                {count !== null && <span style={{ fontSize: 11, fontWeight: 700, color: "#B4A99E" }}>{loading ? "—" : count.toLocaleString()}</span>}
                <ArrowUpRight size={11} style={{ color: "#D4C8BC" }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
