"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, Trash2, Loader2, Copy } from "lucide-react";
import type { SheetItem } from "@/lib/sheets-reader";
import { THAI_MONTHS, currentThaiMonth, currentThaiYear } from "@/lib/monthly-order-types";

const ACCENT = "#0369A1";
const ACCENT_LIGHT = "#E0F2FE";

interface LineItem { item: SheetItem; qty: number }

export default function NewOrderPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [catalogItems, setCatalogItems] = useState<SheetItem[]>([]);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [month, setMonth] = useState(currentThaiMonth());
  const [year, setYear] = useState(currentThaiYear());
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState("");

  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    Promise.all([
      fetch("/api/monthly-orders/items").then(r => r.json()),
      fetch("/api/monthly-orders").then(r => r.json()),
    ]).then(([itemsData]) => {
      setCatalogItems(itemsData.items ?? []);
    });
    // Load departments
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments ?? []));
  }, []);

  const stores = useMemo(() => ["all", ...Array.from(new Set(catalogItems.map(i => i.store)))], [catalogItems]);
  const types = useMemo(() => ["all", ...Array.from(new Set(catalogItems.map(i => "").filter(Boolean)))], [catalogItems]);
  void types;

  const filtered = catalogItems.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchStore = filterStore === "all" || item.store === filterStore;
    return matchSearch && matchStore;
  });

  function addItem(item: SheetItem) {
    const exists = lines.find(l => l.item.code === item.code && l.item.store === item.store);
    if (exists) {
      setLines(prev => prev.map(l =>
        l.item.code === item.code && l.item.store === item.store
          ? { ...l, qty: l.qty + 1 } : l
      ));
    } else {
      setLines(prev => [...prev, { item, qty: item.defaultQty || 1 }]);
    }
  }

  async function copyLastMonth() {
    if (!department) { setError("กรุณาเลือกแผนกก่อน"); return; }
    setCopying(true);
    try {
      const res = await fetch(`/api/monthly-orders/last-month?dept=${encodeURIComponent(department)}&month=${encodeURIComponent(month)}&year=${year}`);
      const d = await res.json();
      if (!d.order?.items?.length) { setError("ไม่พบรายการเดือนที่แล้ว"); return; }
      const newLines: LineItem[] = d.order.items.map((item: { item_code: string; item_name: string; store: string; unit: string; unit_price: number; quantity: number }) => {
        const catalog = catalogItems.find(c => c.code === item.item_code && c.store === item.store);
        return {
          item: catalog ?? {
            code: item.item_code ?? "",
            name: item.item_name,
            store: item.store,
            unit: item.unit,
            price: item.unit_price,
            defaultQty: 1,
            macroCode: "",
            notes: "",
          },
          qty: item.quantity,
        };
      });
      setLines(newLines);
    } finally { setCopying(false); }
  }

  const total = lines.reduce((s, l) => s + l.qty * l.item.price, 0);

  async function handleSubmit(status: "draft" | "pending") {
    if (!department) { setError("กรุณาเลือกแผนก"); return; }
    if (!lines.length) { setError("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/monthly-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_month: month,
          order_year: year,
          department,
          status,
          notes,
          items: lines.map(l => ({
            item_code: l.item.code || undefined,
            item_name: l.item.name,
            store: l.item.store,
            item_type: "วัสดุสำนักงาน",
            quantity: l.qty,
            unit: l.item.unit,
            unit_price: l.item.price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); return; }
      router.push(`/orders/${data.order.id}`);
    } catch { setError("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  const inputStyle = { width:"100%", padding:"8px 12px", borderRadius:10, border:"1px solid var(--border)", fontSize:14, outline:"none", background:"white" };

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)" }}>
      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid var(--border)", padding:"16px 24px", position:"sticky", top:0, zIndex:10 }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/orders" style={{ color:"var(--subtle)", display:"flex" }}><ChevronLeft size={18}/></Link>
            <h1 style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--text)" }}>สร้างรายการสั่งซื้อ</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSubmit("draft")} disabled={saving}
              style={{ padding:"7px 16px", borderRadius:10, fontSize:12, fontWeight:600, background:"white", border:"1px solid var(--border)", color:"var(--muted)", cursor:"pointer" }}>
              บันทึกร่าง
            </button>
            <button onClick={() => handleSubmit("pending")} disabled={saving}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:10, fontSize:12, fontWeight:700,
                background:`linear-gradient(135deg,${ACCENT},#0284C7)`, color:"white", cursor:"pointer", border:"none" }}>
              {saving && <Loader2 size={13} className="animate-spin"/>} ส่งขออนุมัติ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {error && <div style={{ padding:"10px 16px", borderRadius:12, background:"#FEF2F2", color:"#DC2626", fontSize:13, border:"1px solid #FECACA" }}>{error}</div>}

        {/* Basic info */}
        <div className="card p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>แผนก <span style={{color:"#EF4444"}}>*</span></label>
              {role === "admin" ? (
                <select style={inputStyle} value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="">-- เลือกแผนก --</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input style={inputStyle} value={department} onChange={e => setDepartment(e.target.value)} placeholder="ชื่อแผนก"/>
              )}
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>เดือน</label>
              <select style={inputStyle} value={month} onChange={e => setMonth(e.target.value)}>
                {THAI_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>ปี (พ.ศ.)</label>
              <input type="number" style={inputStyle} value={year} onChange={e => setYear(Number(e.target.value))}/>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex-1 mr-4">
              <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>หมายเหตุ</label>
              <input style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)"/>
            </div>
            <div style={{ flexShrink:0, marginTop:22 }}>
              <button onClick={copyLastMonth} disabled={copying || !department}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:600,
                  background: department ? "#F0FDF4" : "#F5F5F4", color: department ? "#059669" : "var(--subtle)",
                  border:`1px solid ${department ? "#BBF7D0" : "var(--border)"}`, cursor: department ? "pointer" : "not-allowed" }}>
                {copying ? <Loader2 size={13} className="animate-spin"/> : <Copy size={13}/>}
                คัดลอกจากเดือนที่แล้ว
              </button>
            </div>
          </div>
        </div>

        {/* Two-column layout: catalog + selected */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Catalog */}
          <div className="card p-4">
            <h2 style={{ fontSize:12, fontWeight:700, color:"var(--muted)", marginBottom:12, letterSpacing:"0.05em" }}>เลือกสินค้า</h2>
            <div className="flex gap-2 mb-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..."
                style={{ flex:1, padding:"6px 10px", borderRadius:8, border:"1px solid var(--border)", fontSize:13, outline:"none" }}/>
              <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
                style={{ padding:"6px 8px", borderRadius:8, border:"1px solid var(--border)", fontSize:12, color:"var(--muted)" }}>
                {stores.map(s => <option key={s} value={s}>{s === "all" ? "ทุกร้าน" : s}</option>)}
              </select>
            </div>
            <div style={{ maxHeight:360, overflowY:"auto" }} className="space-y-1.5 pr-1">
              {filtered.slice(0, 60).map(item => (
                <button key={`${item.code}-${item.store}`} onClick={() => addItem(item)}
                  style={{ width:"100%", textAlign:"left", padding:"8px 10px", borderRadius:10,
                    border:"1px solid var(--border)", background:"white", cursor:"pointer", transition:"all 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                  <p style={{ fontSize:12, fontWeight:600, color:"var(--text)" }}>{item.name}</p>
                  <p style={{ fontSize:11, color:"var(--subtle)", marginTop:2 }}>{item.store} · ฿{item.price}/{item.unit}</p>
                </button>
              ))}
              {filtered.length === 0 && <p style={{ fontSize:12, color:"var(--subtle)", textAlign:"center", padding:"20px 0" }}>ไม่พบสินค้า</p>}
            </div>
          </div>

          {/* Selected items */}
          <div className="card p-4">
            <h2 style={{ fontSize:12, fontWeight:700, color:"var(--muted)", marginBottom:12, letterSpacing:"0.05em" }}>รายการที่เลือก ({lines.length})</h2>
            {lines.length === 0 ? (
              <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", border:"2px dashed var(--border)", borderRadius:12 }}>
                <p style={{ fontSize:12, color:"var(--subtle)" }}>กดเลือกสินค้าจากซ้ายมือ</p>
              </div>
            ) : (
              <div style={{ maxHeight:360, overflowY:"auto" }} className="space-y-2 pr-1">
                {lines.map((line, idx) => (
                  <div key={idx} style={{ padding:"8px 10px", borderRadius:10, background:"var(--bg)", display:"flex", alignItems:"center", gap:8 }}>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize:12, fontWeight:600, color:"var(--text)" }}>{line.item.name}</p>
                      <p style={{ fontSize:11, color:"var(--subtle)" }}>{line.item.store} · ฿{(line.qty * line.item.price).toLocaleString()}</p>
                    </div>
                    <input type="number" min={0.01} step={0.01} value={line.qty}
                      onChange={e => setLines(prev => prev.map((l,i) => i===idx ? {...l, qty: Number(e.target.value)} : l))}
                      style={{ width:52, padding:"4px 6px", borderRadius:8, border:"1px solid var(--border)", fontSize:12, textAlign:"center" }}/>
                    <span style={{ fontSize:11, color:"var(--subtle)" }}>{line.item.unit}</span>
                    <button onClick={() => setLines(prev => prev.filter((_,i) => i!==idx))}
                      style={{ color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:2 }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {lines.length > 0 && (
              <div style={{ marginTop:12, padding:"10px 14px", borderRadius:12, background: ACCENT_LIGHT, display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, fontWeight:600, color: ACCENT }}>ยอดรวม</span>
                <span style={{ fontSize:"1.15rem", fontWeight:800, color: ACCENT }}>฿{total.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

