"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Plus, X, Package, Pencil, TrendingUp, TrendingDown, Minus, SlidersHorizontal } from "lucide-react";
import type { Item, Supplier } from "@/lib/types-po";

const emptyForm = {
  name: "", supplierName: "", unit: "", price: "",
  isServiceFee: "FALSE", vat: "", supplierSku: "", note: "",
};

const inputCls =
  "w-full rounded-[11px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-all";

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
    <div className="min-h-full" style={{ background: "var(--bg)" }}>
      {/* Page header */}
      <div
        className="px-8 pt-8 pb-6"
        style={{
          background: "linear-gradient(180deg, rgba(5,150,105,0.06) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(5,150,105,0.07)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem", color: "#111110", letterSpacing: "-0.02em" }}>
              รายการสินค้า <span style={{ color: "#059669" }}>(Items)</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: "#A8A29E" }}>
              {loading ? "กำลังโหลด..." : `${allItems.length} รายการทั้งหมด`}
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
            style={{
              background: showForm
                ? "white"
                : "linear-gradient(135deg, #34d399, #059669)",
              color: showForm ? "#64748B" : "white",
              border: showForm ? "1px solid rgba(0,0,0,0.08)" : "none",
              boxShadow: showForm ? "none" : "0 2px 10px rgba(5,150,105,0.3)",
            }}
          >
            {showForm ? <X size={15} /> : <Plus size={15} strokeWidth={2.5} />}
            {showForm ? "ยกเลิก" : "เพิ่มสินค้า"}
          </button>
        </div>

        {/* Supplier filter chips */}
        {suppliersList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilterSupplier("")}
              className="shrink-0 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all"
              style={{
                background: !filterSupplier ? "#059669" : "rgba(255,255,255,0.7)",
                color: !filterSupplier ? "white" : "#78716C",
                border: !filterSupplier ? "none" : "1px solid rgba(0,0,0,0.07)",
              }}
            >
              ทั้งหมด
            </button>
            {suppliersList.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSupplier(s === filterSupplier ? "" : s)}
                className="shrink-0 text-xs px-3.5 py-1.5 rounded-full font-medium transition-all"
                style={{
                  background: filterSupplier === s ? "#ECFDF5" : "rgba(255,255,255,0.7)",
                  color: filterSupplier === s ? "#166534" : "#78716C",
                  border: filterSupplier === s ? "1px solid #BBF7D0" : "1px solid rgba(0,0,0,0.07)",
                  fontWeight: filterSupplier === s ? 600 : 400,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-8 py-5">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#B4A99E" }} />
          <input
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#1C1917", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            placeholder="ค้นหาชื่อสินค้า ร้านค้า หรือรหัส..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = "#059669"; e.target.style.boxShadow = "0 0 0 3px rgba(5,150,105,0.10)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.08)"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
          />
        </div>

        {error && (
          <div className="mb-4 text-sm px-4 py-3 rounded-xl" style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FEE2E2" }}>{error}</div>
        )}
        {saveOk && (
          <div className="mb-4 text-sm px-4 py-3 rounded-xl font-medium" style={{ background: "#ECFDF5", color: "#166534", border: "1px solid #BBF7D0" }}>✓ {saveOk}</div>
        )}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit}
            className="bg-white rounded-[18px] p-5 mb-5 grid sm:grid-cols-2 gap-4"
            style={{ boxShadow: "0 2px 12px rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.12)" }}
          >
            <label className="block sm:col-span-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ชื่อสินค้า *</span>
              <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ชื่อร้านค้า *</span>
              <input required list="supplier-options" className={inputCls} value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
              <datalist id="supplier-options">{suppliers.map((s) => <option key={s.code} value={s.name} />)}</datalist>
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">หน่วย</span>
              <input className={inputCls} placeholder="เช่น แพ็ค, ชิ้น" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ราคา/หน่วย (บาท)</span>
              <input className={inputCls} type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">รหัสร้านค้า (SKU)</span>
              <input className={inputCls} value={form.supplierSku} onChange={(e) => setForm({ ...form, supplierSku: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">หมายเหตุ</span>
              <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={saving}
                className="rounded-xl text-white px-6 py-2.5 text-sm font-bold disabled:opacity-50 transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #34d399, #059669)", boxShadow: "0 2px 10px rgba(5,150,105,0.3)" }}>
                {saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        <div
          className="bg-white rounded-[18px] overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.055)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          {loading ? (
            <div className="p-4 space-y-2.5">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-xl skeleton" />)}</div>
          ) : displayItems.length === 0 ? (
            <div className="p-14 text-center">
              <Package size={32} className="mx-auto mb-3" style={{ color: "#D4C8BC" }} />
              <p className="text-sm font-semibold" style={{ color: "#A8A29E" }}>ไม่พบสินค้า</p>
              <p className="text-xs mt-1" style={{ color: "#C4B9AD" }}>ลองเปลี่ยนตัวกรอง หรือเพิ่มสินค้าใหม่</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.01)" }}>
                    {["รหัส", "ชื่อสินค้า", "ร้านค้า", "หน่วย", "ราคา/หน่วย", ""].map((h) => (
                      <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] ${h === "ราคา/หน่วย" ? "text-right" : "text-left"}`} style={{ color: "#B4A99E" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((i) => (
                    <tr
                      key={i.code}
                      className="group transition-colors"
                      style={{ borderBottom: "1px solid rgba(0,0,0,0.035)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F7FFF9"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg" style={{ background: "#ECFDF5", color: "#15803D" }}>
                          {i.code}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[13px] font-semibold" style={{ color: "#1C1917" }}>{i.name}</td>
                      <td className="px-5 py-4 text-[13px]" style={{ color: "#78716C" }}>{i.supplierName}</td>
                      <td className="px-5 py-4">
                        {i.unit ? (
                          <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: "#F8FAFC", color: "#475569" }}>{i.unit}</span>
                        ) : <span style={{ color: "#C4B9AD" }}>—</span>}
                      </td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums text-[13px]" style={{ color: "#1C1917" }}>
                        {i.price ? `${parseFloat(i.price).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿` : "—"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => openEdit(i)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                          style={{ color: "#B4A99E" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#059669"; (e.currentTarget as HTMLElement).style.background = "#ECFDF5"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#B4A99E"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 flex justify-between items-center" style={{ borderTop: "1px solid rgba(0,0,0,0.04)", background: "rgba(0,0,0,0.01)" }}>
                <p className="text-xs" style={{ color: "#B4A99E" }}>
                  แสดง <span className="font-semibold" style={{ color: "#78716C" }}>{displayItems.length}</span> จาก {allItems.length} รายการ
                </p>
                {filterSupplier && (
                  <button onClick={() => setFilterSupplier("")} className="flex items-center gap-1 text-xs" style={{ color: "#059669" }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: "backdropIn 0.15s ease-out" }}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[3px]" onClick={() => setEditModal(null)} />
          <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6" style={{ animation: "modalIn 0.18s cubic-bezier(0.16,1,0.3,1)" }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-base font-bold" style={{ color: "#111110" }}>แก้ไขสินค้า</h3>
                <p className="text-xs font-mono mt-0.5" style={{ color: "#B4A99E" }}>{editModal.item.code}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-1.5 rounded-lg transition-colors hover:bg-slate-100" style={{ color: "#A8A29E" }}>
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ชื่อสินค้า</span>
                <input className={inputCls} value={editModal.form.name} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, name: e.target.value } } : null)} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">หน่วย</span>
                <input className={inputCls} placeholder="เช่น ชิ้น, แพ็ค" value={editModal.form.unit} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, unit: e.target.value } } : null)} />
              </label>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">ราคา/หน่วย (บาท)</span>
                  {priceChanged && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: priceDelta > 0 ? "#FEF3C7" : "#ECFDF5", color: priceDelta > 0 ? "#92400E" : "#166534" }}>
                      {priceDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {priceDelta > 0 ? "+" : ""}{priceDelta.toFixed(1)}%
                    </span>
                  )}
                </div>
                <input type="number" step="0.01" className={inputCls} value={editModal.form.price} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, price: e.target.value } } : null)} />
                {priceChanged && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: "#A8A29E" }}>
                    <Minus size={10} />
                    <span>ราคาเดิม: <span className="font-medium" style={{ color: "#78716C" }}>{oldPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</span></span>
                  </div>
                )}
              </div>

              <label className="block">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">รหัสร้านค้า (SKU)</span>
                <input className={inputCls} value={editModal.form.supplierSku} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, supplierSku: e.target.value } } : null)} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">หมายเหตุ</span>
                <input className={inputCls} value={editModal.form.note} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, note: e.target.value } } : null)} />
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditModal(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors" style={{ color: "#64748B" }}>
                ยกเลิก
              </button>
              <button onClick={saveEdit} disabled={editModal.saving}
                className="flex-1 rounded-xl text-white py-2.5 text-sm font-bold disabled:opacity-50 transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #34d399, #059669)", boxShadow: "0 2px 10px rgba(5,150,105,0.25)" }}>
                {editModal.saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
