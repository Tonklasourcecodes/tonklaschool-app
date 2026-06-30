"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, Loader2 } from "lucide-react";
import type { FoodIngredient, FoodCategory } from "@/lib/types";

interface LineItem { ingredient: FoodIngredient; qty: number; unit: string; unitPrice: number }

export default function NewFoodOrderPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/food/ingredients").then(r => r.json()),
      fetch("/api/food/categories").then(r => r.json()),
    ]).then(([ig, cat]) => {
      setIngredients(ig.ingredients ?? []);
      setCategories(cat.categories ?? []);
    });
  }, []);

  const filteredIngredients = selectedCat === "all"
    ? ingredients
    : ingredients.filter(i => i.category_id === selectedCat);

  function addIngredient(ing: FoodIngredient) {
    if (items.some(it => it.ingredient.id === ing.id)) return;
    setItems(prev => [...prev, { ingredient: ing, qty: 1, unit: ing.default_unit, unitPrice: ing.estimated_price ?? 0 }]);
  }

  function updateItem(idx: number, field: keyof LineItem, val: unknown) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }

  const totalAmount = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  async function handleSubmit(status: "draft" | "pending") {
    if (items.length === 0) { setError("กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_date: orderDate,
          status,
          notes,
          items: items.map(it => ({
            ingredient_id: it.ingredient.id,
            ingredient_name: it.ingredient.name,
            qty: it.qty,
            unit: it.unit,
            unit_price: it.unitPrice,
            total_price: it.qty * it.unitPrice,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); return; }
      router.push(`/food/${data.order.id}`);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)" }}>
      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid var(--border)", padding:"16px 24px", position:"sticky", top:0, zIndex:10 }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/food" style={{ color:"var(--subtle)", display:"flex", alignItems:"center" }}>
              <ChevronLeft size={18} />
            </Link>
            <h1 style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--text)" }}>สร้างใบสั่งวัตถุดิบ</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSubmit("draft")} disabled={saving}
              style={{ padding:"7px 16px", borderRadius:10, fontSize:12, fontWeight:600, background:"white", border:"1px solid var(--border)", color:"var(--muted)", cursor:"pointer" }}>
              บันทึกร่าง
            </button>
            <button onClick={() => handleSubmit("pending")} disabled={saving}
              style={{ padding:"7px 16px", borderRadius:10, fontSize:12, fontWeight:700, background:"linear-gradient(135deg,#059669,#10b981)", color:"white", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              {saving && <Loader2 size={13} className="animate-spin" />}
              ส่งขออนุมัติ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {error && <div style={{ padding:"10px 16px", borderRadius:12, background:"#FEF2F2", color:"#DC2626", fontSize:13, border:"1px solid #FECACA" }}>{error}</div>}

        {/* Basic info */}
        <div className="card p-5">
          <h2 style={{ fontWeight:700, fontSize:13, color:"var(--muted)", letterSpacing:"0.05em", marginBottom:14 }}>ข้อมูลใบสั่ง</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>วันที่สั่ง</label>
              <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                style={{ width:"100%", padding:"8px 12px", borderRadius:10, border:"1px solid var(--border)", fontSize:14, outline:"none" }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>หมายเหตุ</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)"
                style={{ width:"100%", padding:"8px 12px", borderRadius:10, border:"1px solid var(--border)", fontSize:14, outline:"none" }} />
            </div>
          </div>
        </div>

        {/* Ingredient picker */}
        <div className="card p-5">
          <h2 style={{ fontWeight:700, fontSize:13, color:"var(--muted)", letterSpacing:"0.05em", marginBottom:14 }}>เลือกวัตถุดิบ</h2>
          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            <button onClick={() => setSelectedCat("all")}
              style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background:selectedCat==="all"?"var(--text)":"white", color:selectedCat==="all"?"white":"var(--muted)", border:`1px solid ${selectedCat==="all"?"var(--text)":"var(--border)"}` }}>
              ทั้งหมด
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setSelectedCat(c.id)}
                style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background:selectedCat===c.id?"var(--text)":"white", color:selectedCat===c.id?"white":"var(--muted)", border:`1px solid ${selectedCat===c.id?"var(--text)":"var(--border)"}` }}>
                {c.name}
              </button>
            ))}
          </div>
          {/* Ingredient grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {filteredIngredients.map(ing => {
              const added = items.some(it => it.ingredient.id === ing.id);
              return (
                <button key={ing.id} onClick={() => addIngredient(ing)} disabled={added}
                  style={{
                    padding:"10px 12px", borderRadius:12, border:`1px solid ${added?"#BBF7D0":"var(--border)"}`,
                    background: added ? "var(--food-light)" : "white", cursor: added ? "default" : "pointer",
                    textAlign:"left", transition:"all 0.15s",
                  }}>
                  <p style={{ fontSize:13, fontWeight:600, color:added?"var(--food-accent)":"var(--text)" }}>{ing.name}</p>
                  <p style={{ fontSize:11, color:"var(--subtle)", marginTop:2 }}>
                    {ing.default_unit} · {ing.estimated_price ? `฿${ing.estimated_price}` : "ไม่ระบุราคา"}
                  </p>
                  {added && <p style={{ fontSize:10, color:"var(--food-accent)", marginTop:2, fontWeight:700 }}>✓ เพิ่มแล้ว</p>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <div className="card p-5">
            <h2 style={{ fontWeight:700, fontSize:13, color:"var(--muted)", letterSpacing:"0.05em", marginBottom:14 }}>รายการที่เลือก ({items.length})</h2>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={it.ingredient.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background:"var(--bg)" }}>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{it.ingredient.name}</p>
                    <p style={{ fontSize:11, color:"var(--subtle)" }}>รวม ฿{(it.qty * it.unitPrice).toLocaleString()}</p>
                  </div>
                  <input type="number" min={0.1} step={0.1} value={it.qty}
                    onChange={e => updateItem(idx, "qty", Number(e.target.value))}
                    style={{ width:60, padding:"5px 8px", borderRadius:8, border:"1px solid var(--border)", fontSize:13, textAlign:"center" }} />
                  <input type="text" value={it.unit} onChange={e => updateItem(idx, "unit", e.target.value)}
                    style={{ width:56, padding:"5px 8px", borderRadius:8, border:"1px solid var(--border)", fontSize:12 }} />
                  <input type="number" min={0} value={it.unitPrice} onChange={e => updateItem(idx, "unitPrice", Number(e.target.value))}
                    style={{ width:72, padding:"5px 8px", borderRadius:8, border:"1px solid var(--border)", fontSize:12 }} placeholder="ราคา" />
                  <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                    style={{ color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:4 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop:14, padding:"10px 14px", borderRadius:12, background:"var(--food-light)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:600, color:"var(--food-accent)" }}>ยอดรวมประมาณ</span>
              <span style={{ fontSize:"1.2rem", fontWeight:800, color:"var(--food-accent)" }}>฿{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="card p-10 text-center" style={{ border:"2px dashed var(--border)" }}>
            <Plus size={28} style={{ color:"var(--subtle)", margin:"0 auto 8px" }} />
            <p style={{ color:"var(--subtle)", fontSize:13 }}>เลือกวัตถุดิบจากด้านบน</p>
          </div>
        )}
      </div>
    </div>
  );
}
