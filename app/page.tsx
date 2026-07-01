"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ShoppingBasket, Wrench, ArrowUpRight, Clock, CheckCircle,
  XCircle, TrendingUp, FileText, Hammer, Plus, ShoppingCart,
  HardHat, AlertTriangle,
} from "lucide-react";
import type { PO, JO } from "@/lib/types-po";

function useCountUp(target: number, active: boolean) {
  const [count, setCount] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!active || target === 0) { setCount(0); return; }
    const dur = 1100; const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setCount(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, active]);
  return active ? count : null;
}

function StatCard({ label, value, sub, accent, loading, href, icon: Icon }: {
  label: string; value: number; sub: string; accent: string;
  loading: boolean; href: string; icon: React.ElementType;
}) {
  const n = useCountUp(value, !loading);
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        background: "white", borderRadius: 20, padding: "22px 20px", position: "relative",
        overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
        transition: "all 0.2s", cursor: "pointer",
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.1)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)"; }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "20px 20px 0 0", background: `linear-gradient(90deg, ${accent}, ${accent}66)` }} />
        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${accent}12`, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={16} style={{ color: accent }} strokeWidth={1.8} />
          </div>
          <ArrowUpRight size={13} style={{ color: "#D4C8BC" }} />
        </div>
        <div style={{ fontSize: n !== null && value > 0 ? "2.6rem" : "1.8rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: n !== null && value > 0 ? accent : "#D4C8BC", marginBottom: 8 }}>
          {n === null ? "—" : n.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B4A99E", marginBottom: 3 }}>{label}</div>
        {!loading && <div style={{ fontSize: 11, color: "#C4B9AD" }}>{sub}</div>}
      </div>
    </Link>
  );
}

function fmtMoney(val: string) {
  const n = parseFloat((val ?? "").replace(/,/g, ""));
  return isNaN(n) ? "—" : n.toLocaleString("th-TH", { maximumFractionDigits: 0 }) + " ฿";
}

const S: Record<string, { bg: string; text: string; dot: string }> = {
  "รออนุมัติ":   { bg: "#FEF3C7", text: "#92400E", dot: "#D97706" },
  "อนุมัติแล้ว": { bg: "#DCFCE7", text: "#14532D", dot: "#16A34A" },
  "ยกเลิก":     { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
};

interface FoodOrder { id: string; status: string; total_amount?: number; requester_name?: string; }
interface MaintReq { id: string; status: string; priority: string; title?: string; request_number?: string; reporter_name?: string; }
interface MonthlyOrder { id: string; status: string; total_amount?: number; requester_name?: string; department?: string; }

export default function HomePage() {
  const { data: session } = useSession();
  const [pos, setPos] = useState<PO[]>([]);
  const [jos, setJos] = useState<JO[]>([]);
  const [food, setFood] = useState<FoodOrder[]>([]);
  const [maint, setMaint] = useState<MaintReq[]>([]);
  const [monthly, setMonthly] = useState<MonthlyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTab, setPendingTab] = useState<"po" | "jo">("po");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(true);

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
  const totalPending = poPending.length + joPending.length + monthly.filter(o => o.status === "pending").length + food.filter(o => o.status === "pending").length;
  const poValue = pos.reduce((s, p) => s + (parseFloat((p.grandTotal || "0").replace(/,/g, "")) || 0), 0);
  const urgentMaint = maint.filter(r => r.priority === "urgent" && r.status !== "closed");
  const thDate = new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  async function handleApprove(type: "po" | "jo", id: string, status: "อนุมัติแล้ว" | "ยกเลิก") {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/${type}/${id.replace(/\//g, "~")}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: status, approvalDate: new Date().toLocaleDateString("th-TH") }),
      });
      const d = await res.json() as { po?: PO; jo?: JO };
      if (type === "po" && d.po) setPos(prev => prev.map(p => p.poNumber === id ? d.po! : p));
      else if (type === "jo" && d.jo) setJos(prev => prev.map(j => j.joNumber === id ? d.jo! : j));
    } finally { setApprovingId(null); }
  }

  return (
    <div style={{ minHeight: "100%", background: "#F0EDE9", padding: "32px 36px 48px" }}>

      {/* ── Greeting ──────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#9C9289", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{thDate}</p>
            <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, color: "#1C1815", letterSpacing: "-0.035em", lineHeight: 1, marginBottom: 0 }}>
              {firstName ? `สวัสดี, ${firstName}` : "ระบบจัดการ"}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { href: "/po/new",          label: "+ PO",    bg: "linear-gradient(135deg,#059669,#34d399)", shadow: "rgba(5,150,105,0.35)", text: "#fff" },
              { href: "/jo/new",          label: "+ JO",    bg: "#1C1815", shadow: "rgba(0,0,0,0.2)", text: "#fff" },
              { href: "/orders/new",      label: "+ สั่งซื้อ", bg: "white", shadow: "rgba(0,0,0,0.08)", text: "#1C1815", border: "1px solid rgba(0,0,0,0.1)" },
              { href: "/maintenance/new", label: "+ แจ้งซ่อม", bg: "white", shadow: "rgba(0,0,0,0.08)", text: "#1C1815", border: "1px solid rgba(0,0,0,0.1)" },
            ].map(b => (
              <Link key={b.href} href={b.href} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
                borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none",
                background: b.bg, color: b.text, boxShadow: `0 4px 14px ${b.shadow}`,
                border: b.border ?? "none", transition: "all 0.2s",
              }}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        {!loading && (
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <TrendingUp size={13} style={{ color: "#059669" }} />
              <span style={{ fontSize: 12, color: "#9C9289" }}>มูลค่า PO</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "-0.02em" }}>{poValue.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿</span>
            </div>
            {totalPending > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, background: "#FFFBEB", border: "1px solid #FCD34D" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#92400E", fontWeight: 600 }}>รออนุมัติ {totalPending} รายการ</span>
              </div>
            )}
            {urgentMaint.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, background: "#FEF2F2", border: "1px solid #FECACA" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#991B1B", fontWeight: 600 }}>แจ้งซ่อมด่วน {urgentMaint.length} รายการ</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Stat cards ───────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "PO ทั้งหมด",        value: pos.length,     sub: `อนุมัติแล้ว ${pos.filter(p=>p.approvalStatus==="อนุมัติแล้ว").length}`, accent: "#059669", icon: FileText,       href: "/po" },
          { label: "JO ทั้งหมด",        value: jos.length,     sub: `อนุมัติแล้ว ${jos.filter(j=>j.approvalStatus==="อนุมัติแล้ว").length}`, accent: "#7C3AED", icon: Hammer,         href: "/jo" },
          { label: "สั่งซื้อรายเดือน", value: monthly.length, sub: `รออนุมัติ ${monthly.filter(o=>o.status==="pending").length}`,          accent: "#0369A1", icon: ShoppingCart,   href: "/orders" },
          { label: "วัตถุดิบ",          value: food.length,    sub: `รออนุมัติ ${food.filter(o=>o.status==="pending").length}`,             accent: "#10b981", icon: ShoppingBasket, href: "/food" },
          { label: "แจ้งซ่อม",         value: maint.length,   sub: `ด่วน ${urgentMaint.length} | เปิด ${maint.filter(r=>r.status==="open").length}`, accent: "#EF4444", icon: Wrench, href: "/maintenance" },
        ].map((c, i) => (
          <div key={c.href} style={{ animation: `fadeUp 0.4s ${i * 0.05}s both` }}>
            <StatCard {...c} loading={loading} />
          </div>
        ))}
      </div>

      {/* ── Body ─────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>

        {/* Left: pending + recent POs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Pending approvals */}
          {isAdmin && !loading && (poPending.length + joPending.length) > 0 && (
            <div style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1.5px solid #FCD34D", boxShadow: "0 2px 16px rgba(217,119,6,0.08)" }}>
              <button onClick={() => setShowPending(v => !v)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px", background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)",
                border: "none", cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D97706" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>รออนุมัติ</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#D97706", color: "white" }}>{poPending.length + joPending.length}</span>
                </div>
                <span style={{ fontSize: 11, color: "#92400E" }}>{showPending ? "▲" : "▼"}</span>
              </button>

              {showPending && (
                <>
                  <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    {(["po", "jo"] as const).map(tab => (
                      <button key={tab} onClick={() => setPendingTab(tab)} style={{
                        padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                        background: pendingTab === tab ? "#D97706" : "rgba(0,0,0,0.06)",
                        color: pendingTab === tab ? "white" : "#92400E",
                      }}>
                        {tab.toUpperCase()} <span style={{ opacity: 0.7 }}>({tab === "po" ? poPending.length : joPending.length})</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    {(pendingTab === "po" ? poPending : joPending).slice(0, 5).map((item, i, arr) => {
                      const isPO = pendingTab === "po";
                      const po = item as PO; const jo = item as JO;
                      const num = isPO ? po.poNumber : jo.joNumber;
                      const supplier = isPO ? po.supplierName : jo.supplierName;
                      const requester = isPO ? po.requester : jo.requester;
                      const amount = isPO ? po.grandTotal : jo.grandTotal;
                      const busy = approvingId === num;
                      return (
                        <div key={num} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", padding: "3px 8px", borderRadius: 6, background: isPO ? "#ECFDF5" : "#F5F3FF", color: isPO ? "#15803D" : "#6D28D9", flexShrink: 0 }}>{num}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1815", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{supplier}</div>
                            <div style={{ fontSize: 11, color: "#A8A29E" }}>จาก {requester || "—"}</div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1815", flexShrink: 0 }}>{fmtMoney(amount)}</span>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button onClick={() => handleApprove(pendingTab, num, "อนุมัติแล้ว")} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "white", background: "linear-gradient(135deg,#34d399,#059669)", opacity: busy ? 0.6 : 1 }}>
                              <CheckCircle size={12} />{busy ? "..." : "อนุมัติ"}
                            </button>
                            <button onClick={() => handleApprove(pendingTab, num, "ยกเลิก")} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, border: "1px solid #FCA5A5", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#DC2626", background: "white", opacity: busy ? 0.6 : 1 }}>
                              <XCircle size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Recent POs */}
          <div style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1815" }}>รายการ PO ล่าสุด</span>
              <Link href="/po" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#059669", textDecoration: "none" }}>ดูทั้งหมด <ArrowUpRight size={12} /></Link>
            </div>
            {loading ? (
              <div style={{ padding: 16 }}>{[...Array(5)].map((_, i) => <div key={i} style={{ height: 44, borderRadius: 12, background: "#F0EDE9", marginBottom: 8 }} />)}</div>
            ) : (
              pos.slice(0, 8).map((po, i) => {
                const s = S[po.approvalStatus];
                return (
                  <Link key={po.poNumber} href={`/po/${po.poNumber.replace(/\//g, "~")}`} style={{
                    display: "grid", gridTemplateColumns: "140px 1fr auto 100px", alignItems: "center",
                    gap: 12, padding: "12px 20px", borderBottom: i < 7 ? "1px solid rgba(0,0,0,0.04)" : "none",
                    textDecoration: "none", transition: "background 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "#FAFAF9"}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ""}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", padding: "3px 8px", borderRadius: 6, background: "#ECFDF5", color: "#15803D" }}>{po.poNumber}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#1C1815", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.supplierName}</div>
                      <div style={{ fontSize: 11, color: "#B4A99E" }}>{po.orderDate || "—"}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1815", textAlign: "right" }}>{fmtMoney(po.grandTotal)}</span>
                    {s ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.text }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />{po.approvalStatus}</span> : <span />}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Right: quick nav + urgent */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "white", borderRadius: 20, padding: "16px 14px", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#B4A99E", marginBottom: 10, padding: "0 4px" }}>ระบบทั้งหมด</p>
            {[
              { href: "/po",          label: "ใบสั่งซื้อ (PO)",    icon: FileText,       color: "#059669", bg: "#F0FDF4" },
              { href: "/jo",          label: "ใบสั่งจ้าง (JO)",    icon: Hammer,         color: "#7C3AED", bg: "#F5F3FF" },
              { href: "/orders",      label: "สั่งซื้อรายเดือน",  icon: ShoppingCart,   color: "#0369A1", bg: "#E0F2FE" },
              { href: "/food",        label: "วัตถุดิบ",            icon: ShoppingBasket, color: "#059669", bg: "#ECFDF5" },
              { href: "/maintenance", label: "แจ้งซ่อม",           icon: Wrench,         color: "#7C3AED", bg: "#F5F3FF" },
              { href: "/chang",       label: "ระบบช่าง",           icon: HardHat,        color: "#0891B2", bg: "#ECFEFF" },
            ].map(({ href, label, icon: Icon, color, bg }) => (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12,
                textDecoration: "none", transition: "background 0.15s", marginBottom: 2,
              }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "#F9F8F7"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ""}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={14} style={{ color }} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#3C3834" }}>{label}</span>
                <ArrowUpRight size={11} style={{ color: "#D4C8BC", marginLeft: "auto" }} />
              </Link>
            ))}
          </div>

          {urgentMaint.length > 0 && (
            <div style={{ background: "white", borderRadius: 20, padding: "16px 14px", border: "1.5px solid #FEE2E2", boxShadow: "0 2px 12px rgba(239,68,68,0.08)" }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#EF4444", marginBottom: 10, padding: "0 4px" }}>แจ้งซ่อมด่วน</p>
              {urgentMaint.slice(0, 3).map((r) => (
                <Link key={r.id} href={`/maintenance/${r.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12, textDecoration: "none", marginBottom: 4 }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "#FEF2F2"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ""}
                >
                  <AlertTriangle size={14} style={{ color: "#EF4444", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1C1815", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title || r.request_number || "—"}</div>
                    <div style={{ fontSize: 10, color: "#A8A29E" }}>{r.reporter_name || "—"}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Quick create */}
          <div style={{ background: "#0D1F14", borderRadius: 20, padding: 16 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(52,211,153,0.5)", marginBottom: 12 }}>สร้างใหม่</p>
            {[
              { href: "/po/new",          label: "+ สร้าง PO",     color: "#34d399" },
              { href: "/jo/new",          label: "+ สร้าง JO",     color: "#a78bfa" },
              { href: "/food/new",        label: "+ สั่งวัตถุดิบ", color: "#6ee7b7" },
              { href: "/maintenance/new", label: "+ แจ้งซ่อม",    color: "#fca5a5" },
            ].map(({ href, label, color }) => (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 12, marginBottom: 4,
                textDecoration: "none", fontSize: 13, fontWeight: 600, color,
                background: "rgba(255,255,255,0.05)", transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"}
              >
                <Plus size={13} strokeWidth={2.5} />{label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
