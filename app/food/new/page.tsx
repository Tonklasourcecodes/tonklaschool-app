"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { FoodIngredient, FoodCategory } from "@/lib/types";

const ACCENT = "#059669";
const ACCENT_SHADOW = "rgba(5,150,105,0.25)";

interface LineItem { ingredient: FoodIngredient; qty: number; unit: string; unitPrice: number }

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1.5px solid rgba(0,0,0,0.08)",
  fontSize: 14,
  background: "white",
  outline: "none",
  color: "#1C1815",
};

function focusStyle(focused: boolean): React.CSSProperties {
  return focused
    ? { borderColor: ACCENT, boxShadow: "0 0 0 3px rgba(5,150,105,0.1)" }
    : {};
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: "#5C5450", marginBottom: 6, display: "block" }}>
      {children}
    </span>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C4B9AD", marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 24,
      border: "1px solid rgba(0,0,0,0.06)",
      padding: 32,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function FocusInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...style, ...focusStyle(focused) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

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
    <main style={{ background: "#F0EDE9", minHeight: "100vh" }}>
      {/* Page Header */}
      <div style={{ padding: "44px 44px 32px" }}>
        <div style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#1C1815", lineHeight: 1 }}>
          สั่งวัตถุดิบ
        </div>
        <div style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#C4B9AD", lineHeight: 1 }}>
          ใหม่
        </div>
      </div>

      <div style={{ padding: "0 44px 48px", display: "flex", flexDirection: "column", gap: 20 }}>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "#FEF2F2", color: "#DC2626", fontSize: 13, border: "1px solid #FECACA" }}>
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <SectionHeader>ข้อมูลใบสั่ง</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <Label>วันที่สั่ง</Label>
              <FocusInput
                type="date"
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
              />
            </div>
            <div>
              <Label>หมายเหตุ</Label>
              <FocusInput
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="หมายเหตุ (ถ้ามี)"
              />
            </div>
          </div>
        </Card>

        {/* Ingredient Picker */}
        <Card>
          <SectionHeader>เลือกวัตถุดิบ</SectionHeader>

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <button
              onClick={() => setSelectedCat("all")}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: selectedCat === "all" ? "#1C1815" : "white",
                color: selectedCat === "all" ? "white" : "#5C5450",
                border: `1.5px solid ${selectedCat === "all" ? "#1C1815" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              ทั้งหมด
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: selectedCat === c.id ? "#1C1815" : "white",
                  color: selectedCat === c.id ? "white" : "#5C5450",
                  border: `1.5px solid ${selectedCat === c.id ? "#1C1815" : "rgba(0,0,0,0.08)"}`,
                }}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Ingredient Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {filteredIngredients.map(ing => {
              const added = items.some(it => it.ingredient.id === ing.id);
              return (
                <button
                  key={ing.id}
                  onClick={() => addIngredient(ing)}
                  disabled={added}
                  style={{
                    padding: "12px 14px", borderRadius: 14,
                    border: `1.5px solid ${added ? "#A7F3D0" : "rgba(0,0,0,0.08)"}`,
                    background: added ? "rgba(5,150,105,0.06)" : "white",
                    cursor: added ? "default" : "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 700, color: added ? ACCENT : "#1C1815" }}>{ing.name}</p>
                  <p style={{ fontSize: 11, color: "#5C5450", marginTop: 2 }}>
                    {ing.default_unit} · {ing.estimated_price ? `฿${ing.estimated_price}` : "ไม่ระบุราคา"}
                  </p>
                  {added && <p style={{ fontSize: 10, color: ACCENT, marginTop: 2, fontWeight: 800 }}>✓ เพิ่มแล้ว</p>}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Selected Items */}
        {items.length > 0 && (
          <Card>
            <SectionHeader>รายการที่เลือก ({items.length})</SectionHeader>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((it, idx) => (
                <div
                  key={it.ingredient.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 14, background: "#F0EDE9",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1815" }}>{it.ingredient.name}</p>
                    <p style={{ fontSize: 11, color: "#5C5450" }}>รวม ฿{(it.qty * it.unitPrice).toLocaleString()}</p>
                  </div>
                  <input
                    type="number" min={0.1} step={0.1} value={it.qty}
                    onChange={e => updateItem(idx, "qty", Number(e.target.value))}
                    style={{ width: 64, padding: "6px 8px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.08)", fontSize: 13, textAlign: "center", outline: "none" }}
                  />
                  <input
                    type="text" value={it.unit}
                    onChange={e => updateItem(idx, "unit", e.target.value)}
                    style={{ width: 60, padding: "6px 8px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.08)", fontSize: 12, outline: "none" }}
                  />
                  <input
                    type="number" min={0} value={it.unitPrice}
                    onChange={e => updateItem(idx, "unitPrice", Number(e.target.value))}
                    style={{ width: 76, padding: "6px 8px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.08)", fontSize: 12, outline: "none" }}
                    placeholder="ราคา"
                  />
                  <button
                    onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                    style={{ color: "#C4B9AD", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8 }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.background = "#FEF2F2"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#C4B9AD"; e.currentTarget.style.background = "none"; }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 16, padding: "12px 18px", borderRadius: 14,
              background: "rgba(5,150,105,0.08)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>ยอดรวมประมาณ</span>
              <span style={{ fontSize: "1.2rem", fontWeight: 900, color: ACCENT }}>฿{totalAmount.toLocaleString()}</span>
            </div>
          </Card>
        )}

        {items.length === 0 && (
          <div style={{
            padding: "48px 32px", borderRadius: 24, border: "2px dashed rgba(0,0,0,0.1)",
            textAlign: "center", background: "white",
          }}>
            <Plus size={28} style={{ color: "#C4B9AD", margin: "0 auto 10px", display: "block" }} />
            <p style={{ color: "#C4B9AD", fontSize: 13 }}>เลือกวัตถุดิบจากด้านบน</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={() => handleSubmit("draft")}
            disabled={saving}
            style={{
              padding: "14px 28px", borderRadius: 16, fontWeight: 700, fontSize: 14,
              background: "white", color: "#5C5450", border: "1.5px solid rgba(0,0,0,0.08)",
              cursor: "pointer",
            }}
          >
            บันทึกร่าง
          </button>
          <button
            onClick={() => handleSubmit("pending")}
            disabled={saving}
            style={{
              padding: "14px 32px", borderRadius: 16, fontWeight: 800, fontSize: 15,
              background: saving ? "#C4B9AD" : ACCENT, color: "white",
              border: "none", cursor: saving ? "not-allowed" : "pointer",
              boxShadow: `0 4px 20px ${ACCENT_SHADOW}`,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {saving && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
            ส่งขออนุมัติ
          </button>
        </div>
      </div>
    </main>
  );
}
