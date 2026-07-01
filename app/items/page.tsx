"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Plus, X, Package, Pencil, TrendingUp, TrendingDown, Minus, SlidersHorizontal } from "lucide-react";
import type { Item, Supplier } from "@/lib/types-po";

const emptyForm = {
  name: "", supplierName: "", unit: "", price: "",
  isServiceFee: "FALSE", vat: "", supplierSku: "", note: "",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 11,
  border: "1px solid rgba(0,0,0,0.10)",
  padding: "10px 12px",
  fontSize: 13,
  outline: "none",
  background: "white",
  color: "#1C1917",
  transition: "all 0.15s",
  boxSizing: "border-box",
};

type EditForm = { name: string; unit: string; price: string; supplierSku: string; note: string };
type EditModal = { item: Item; form: EditForm; saving: boolean };

export default function ItemsPage() {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [saveOk, setSaveOk] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "โหลดข้อมูลไม่สำเร็จ");
      setAllItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }

  async function loadSuppliers() {
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      if (res.ok) setSuppliers(data.suppliers);
    } catch { /* ignore */ }
  }

  useEffect(() => { load(); loadSuppliers(); }, []);

  const suppliersList = useMemo(
    () => [...new Set(allItems.map((i) => i.supplierName).filter(Boolean))].sort(),
    [allItems]
  );

  const displayItems = useMemo(() => {
    let items = allItems;
    if (filterSupplier) items = items.filter((i) => i.supplierName === filterSupplier);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((i) => [i.name, i.supplierName, i.code].join(" ").toLowerCase().includes(q));
    }
    return items;
  }, [allItems, filterSupplier, search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const res = await fetch("/api/items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setForm(emptyForm); setShowForm(false); await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setSaving(false); }
  }

  function openEdit(item: Item) {
    setEditModal({ item, form: { name: item.name, unit: item.unit, price: item.price, supplierSku: item.supplierSku, note: item.note }, saving: false });
  }

  async function saveEdit() {
    if (!editModal || editModal.saving) return;
    setEditModal((m) => m ? { ...m, saving: true } : null);
    try {
      const res = await fetch(`/api/items/${encodeURIComponent(editModal.item.code)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editModal.form),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "บันทึกไม่สำเร็จ");
      setAllItems((prev) => prev.map((i) =>
        i.code === editModal.item.code
          ? { ...i, ...editModal.form, priceExclVat: editModal.form.price, priceInclVat: editModal.form.price }
          : i
      ));
      setSaveOk("บันทึกเรียบร้อยแล้ว");
      setTimeout(() => setSaveOk(""), 2000);
      setEditModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      setEditModal((m) => m ? { ...m, saving: false } : null);
    }
  }

  const oldPrice = editModal ? parseFloat(editModal.item.price || "0") : 0;
  const newPrice = editModal ? parseFloat(editModal.form.price || "0") : 0;
  const priceDelta = oldPrice > 0 && newPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;
  const priceChanged = Math.abs(priceDelta) > 0.01 && newPrice !== oldPrice;

  return (
    <div style={{ minHeight: "100%", background: "#F0EDE9" }}>
      {/* Header */}
      <div style={{ padding: "44px 44px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#059669", marginBottom: 8 }}>
          สินค้า
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "clamp(2.8rem,5vw,4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#111110", margin: 0 }}>
              รายการสินค้า
            </h1>
            {!loading && (
              <p style={{ fontSize: 13, color: "#A8A29E", marginTop: 10 }}>
                <span style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 900, color: "#111110", lineHeight: 1 }}>{allItems.length}</span>
                {" "}รายการทั้งหมด
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer", transition: "all 0.15s",
              background: showForm ? "white" : "#059669",
              color: showForm ? "#64748B" : "white",
              boxShadow: showForm ? "0 2px 8px rgba(0,0,0,0.06)" : "0 4px 14px rgba(5,150,105,0.3)",
              marginBottom: 4,
            }}
          >
            {showForm ? <X size={15} /> : <Plus size={15} strokeWidth={2.5} />}
            {showForm ? "ยกเลิก" : "เพิ่มสินค้า"}
          </button>
        </div>

        {/* Supplier filter pills */}
        {suppliersList.length > 0 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 20, paddingBottom: 4 }}>
            <button
              onClick={() => setFilterSupplier("")}
              style={{
                flexShrink: 0, padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                border: "none", cursor: "pointer", transition: "all 0.12s",
                background: !filterSupplier ? "#111110" : "white",
                color: !filterSupplier ? "white" : "#78716C",
                boxShadow: !filterSupplier ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              ทั้งหมด
            </button>
            {suppliersList.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSupplier(s === filterSupplier ? "" : s)}
                style={{
                  flexShrink: 0, padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                  border: "none", cursor: "pointer", transition: "all 0.12s",
                  background: filterSupplier === s ? "#111110" : "white",
                  color: filterSupplier === s ? "white" : "#78716C",
                  boxShadow: filterSupplier === s ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters / Search */}
      <div style={{ padding: "0 44px 24px", marginTop: 28 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#B4A99E", pointerEvents: "none" }} />
          <input
            style={{ ...inputStyle, paddingLeft: 40, borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            placeholder="ค้นหาชื่อสินค้า ร้านค้า หรือรหัส..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = "#059669"; e.target.style.boxShadow = "0 0 0 3px rgba(5,150,105,0.10)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.08)"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 44px 48px" }}>
        {error && (
          <div style={{ marginBottom: 16, fontSize: 13, padding: "12px 16px", borderRadius: 12, background: "#FEF2F2", color: "#991B1B", border: "1px solid #FEE2E2" }}>
            {error}
          </div>
        )}
        {saveOk && (
          <div style={{ marginBottom: 16, fontSize: 13, padding: "12px 16px", borderRadius: 12, fontWeight: 600, background: "#ECFDF5", color: "#166534", border: "1px solid #BBF7D0" }}>
            ✓ {saveOk}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit}
            style={{
              background: "white", borderRadius: 24, padding: 24, marginBottom: 20,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
              border: "1px solid rgba(5,150,105,0.12)", boxShadow: "0 2px 12px rgba(5,150,105,0.08)",
            }}
          >
            <label style={{ display: "block", gridColumn: "1 / -1" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ชื่อสินค้า *</span>
              <input required style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ชื่อร้านค้า *</span>
              <input required list="supplier-options" style={inputStyle} value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
              <datalist id="supplier-options">{suppliers.map((s) => <option key={s.code} value={s.name} />)}</datalist>
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>หน่วย</span>
              <input style={inputStyle} placeholder="เช่น แพ็ค, ชิ้น" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ราคา/หน่วย (บาท)</span>
              <input style={inputStyle} type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>รหัสร้านค้า (SKU)</span>
              <input style={inputStyle} value={form.supplierSku} onChange={(e) => setForm({ ...form, supplierSku: e.target.value })} />
            </label>
            <label style={{ display: "block", gridColumn: "1 / -1" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>หมายเหตุ</span>
              <input style={inputStyle} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={saving}
                style={{
                  background: "linear-gradient(135deg, #34d399, #059669)", color: "white",
                  border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                  boxShadow: "0 2px 10px rgba(5,150,105,0.3)",
                }}>
                {saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
              </button>
            </div>
          </form>
        )}

        {/* Items list */}
        <div style={{ background: "white", borderRadius: 24, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 20 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 12, background: "rgba(0,0,0,0.05)", marginBottom: 10, animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : displayItems.length === 0 ? (
            <div style={{ padding: "56px 20px", textAlign: "center" }}>
              <Package size={32} style={{ color: "#D4C8BC", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#A8A29E" }}>ไม่พบสินค้า</p>
              <p style={{ fontSize: 12, color: "#C4B9AD", marginTop: 4 }}>ลองเปลี่ยนตัวกรอง หรือเพิ่มสินค้าใหม่</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 160px 80px 120px 48px", padding: "10px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.01)" }}>
                {["รหัส", "ชื่อสินค้า", "ร้านค้า", "หน่วย", "ราคา/หน่วย", ""].map((h, idx) => (
                  <p key={h + idx} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B4A99E", margin: 0, textAlign: h === "ราคา/หน่วย" ? "right" : "left" }}>
                    {h}
                  </p>
                ))}
              </div>
              {displayItems.map((i, idx) => (
                <div
                  key={i.code}
                  style={{
                    display: "grid", gridTemplateColumns: "120px 1fr 160px 80px 120px 48px",
                    padding: "14px 20px", alignItems: "center",
                    borderBottom: idx < displayItems.length - 1 ? "1px solid rgba(0,0,0,0.035)" : "none",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F7FFF9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, background: "#ECFDF5", color: "#15803D" }}>
                      {i.code}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", margin: 0 }}>{i.name}</p>
                  <p style={{ fontSize: 13, color: "#78716C", margin: 0 }}>{i.supplierName}</p>
                  <div>
                    {i.unit
                      ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "#F8FAFC", color: "#475569", fontWeight: 500 }}>{i.unit}</span>
                      : <span style={{ color: "#C4B9AD" }}>—</span>
                    }
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", margin: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {i.price ? `${parseFloat(i.price).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿` : "—"}
                  </p>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      onClick={() => openEdit(i)}
                      style={{
                        padding: 6, borderRadius: 8, border: "none", background: "transparent",
                        color: "#C4B9AD", cursor: "pointer", transition: "all 0.12s", display: "flex",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#059669"; (e.currentTarget as HTMLElement).style.background = "#ECFDF5"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#C4B9AD"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(0,0,0,0.04)", background: "rgba(0,0,0,0.01)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 12, color: "#B4A99E", margin: 0 }}>
                  แสดง <span style={{ fontWeight: 700, color: "#78716C" }}>{displayItems.length}</span> จาก {allItems.length} รายการ
                </p>
                {filterSupplier && (
                  <button onClick={() => setFilterSupplier("")}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#059669", background: "none", border: "none", cursor: "pointer" }}>
                    <SlidersHorizontal size={11} /> ล้างตัวกรอง
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(3px)" }} onClick={() => setEditModal(null)} />
          <div style={{ position: "relative", background: "white", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", width: "100%", maxWidth: 440, padding: 28, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111110", margin: 0 }}>แก้ไขสินค้า</h3>
                <p style={{ fontSize: 11, fontFamily: "monospace", color: "#B4A99E", marginTop: 4 }}>{editModal.item.code}</p>
              </div>
              <button onClick={() => setEditModal(null)} style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", color: "#A8A29E", cursor: "pointer" }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ชื่อสินค้า</span>
                <input style={inputStyle} value={editModal.form.name} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, name: e.target.value } } : null)} />
              </label>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>หน่วย</span>
                <input style={inputStyle} placeholder="เช่น ชิ้น, แพ็ค" value={editModal.form.unit} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, unit: e.target.value } } : null)} />
              </label>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em" }}>ราคา/หน่วย (บาท)</span>
                  {priceChanged && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
                      padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                      background: priceDelta > 0 ? "#FEF3C7" : "#ECFDF5",
                      color: priceDelta > 0 ? "#92400E" : "#166534",
                    }}>
                      {priceDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {priceDelta > 0 ? "+" : ""}{priceDelta.toFixed(1)}%
                    </span>
                  )}
                </div>
                <input type="number" step="0.01" style={inputStyle} value={editModal.form.price} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, price: e.target.value } } : null)} />
                {priceChanged && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#A8A29E" }}>
                    <Minus size={10} />
                    <span>ราคาเดิม: <span style={{ fontWeight: 600, color: "#78716C" }}>{oldPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</span></span>
                  </div>
                )}
              </div>

              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>รหัสร้านค้า (SKU)</span>
                <input style={inputStyle} value={editModal.form.supplierSku} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, supplierSku: e.target.value } } : null)} />
              </label>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>หมายเหตุ</span>
                <input style={inputStyle} value={editModal.form.note} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, note: e.target.value } } : null)} />
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => setEditModal(null)}
                style={{
                  flex: 1, borderRadius: 12, border: "1px solid rgba(0,0,0,0.10)", padding: "11px 0",
                  fontSize: 13, fontWeight: 600, color: "#64748B", background: "white", cursor: "pointer",
                }}>
                ยกเลิก
              </button>
              <button onClick={saveEdit} disabled={editModal.saving}
                style={{
                  flex: 1, borderRadius: 12, border: "none", padding: "11px 0",
                  fontSize: 13, fontWeight: 700, color: "white",
                  background: "linear-gradient(135deg, #34d399, #059669)",
                  boxShadow: "0 2px 10px rgba(5,150,105,0.25)",
                  cursor: editModal.saving ? "not-allowed" : "pointer", opacity: editModal.saving ? 0.6 : 1,
                }}>
                {editModal.saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
