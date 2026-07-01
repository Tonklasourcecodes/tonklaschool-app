"use client";

import { useEffect, useState } from "react";
import { Search, Plus, X, Truck, Phone, MapPin, Pencil } from "lucide-react";
import type { Supplier } from "@/lib/types-po";

const emptyForm = {
  prefix: "", name: "", productOrService: "สินค้า", category: "", details: "",
  contact1Name: "", phone1: "", contact2Name: "", phone2: "",
  lineId: "", buildingName: "", houseNo: "", moo: "", soi: "",
  road: "", tambon: "", amphoe: "", province: "", zipcode: "",
};

const inputCls =
  "w-full rounded-[11px] border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-all";

type EditForm = { name: string; category: string; contact1Name: string; phone1: string; lineId: string; province: string };
type EditModal = { supplier: Supplier; form: EditForm; saving: boolean };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [saveOk, setSaveOk] = useState("");

  async function load(q?: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/suppliers?q=${encodeURIComponent(q ?? "")}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "โหลดข้อมูลไม่สำเร็จ");
      setSuppliers(data.suppliers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setForm(emptyForm); setShowForm(false); await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setSaving(false); }
  }

  function openEdit(s: Supplier) {
    setEditModal({ supplier: s, form: { name: s.name, category: s.category, contact1Name: s.contact1Name, phone1: s.phone1, lineId: s.lineId, province: s.province }, saving: false });
  }

  async function saveEdit() {
    if (!editModal || editModal.saving) return;
    setEditModal((m) => m ? { ...m, saving: true } : null);
    try {
      const res = await fetch(`/api/suppliers/${encodeURIComponent(editModal.supplier.code)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editModal.form),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "บันทึกไม่สำเร็จ");
      setSuppliers((prev) => prev.map((s) => s.code === editModal.supplier.code ? { ...s, ...editModal.form } : s));
      setSaveOk("บันทึกเรียบร้อยแล้ว");
      setTimeout(() => setSaveOk(""), 2500);
      setEditModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      setEditModal((m) => m ? { ...m, saving: false } : null);
    }
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem", color: "#111110", letterSpacing: "-0.02em" }}>
              ผู้จัดหา <span style={{ color: "#059669" }}>(Suppliers)</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: "#A8A29E" }}>
              {loading ? "กำลังโหลด..." : `${suppliers.length} ร้านค้า / บุคคล`}
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
            style={{
              background: showForm ? "white" : "linear-gradient(135deg, #34d399, #059669)",
              color: showForm ? "#64748B" : "white",
              border: showForm ? "1px solid rgba(0,0,0,0.08)" : "none",
              boxShadow: showForm ? "none" : "0 2px 10px rgba(5,150,105,0.3)",
            }}
          >
            {showForm ? <X size={15} /> : <Plus size={15} strokeWidth={2.5} />}
            {showForm ? "ยกเลิก" : "เพิ่มผู้จัดหา"}
          </button>
        </div>
      </div>

      <div className="px-8 py-5">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#B4A99E" }} />
          <input
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", color: "#1C1917", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            placeholder="ค้นหาชื่อร้าน ประเภทงาน หรือรหัส..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
            onFocus={(e) => { e.target.style.borderColor = "#059669"; e.target.style.boxShadow = "0 0 0 3px rgba(5,150,105,0.10)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.08)"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
          />
        </div>

        {error && <div className="mb-4 text-sm px-4 py-3 rounded-xl" style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FEE2E2" }}>{error}</div>}
        {saveOk && <div className="mb-4 text-sm px-4 py-3 rounded-xl font-medium" style={{ background: "#ECFDF5", color: "#166534", border: "1px solid #BBF7D0" }}>✓ {saveOk}</div>}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit}
            className="bg-white rounded-[18px] p-5 mb-5 grid sm:grid-cols-2 gap-4"
            style={{ boxShadow: "0 2px 12px rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.12)" }}
          >
            <label className="block sm:col-span-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ชื่อร้านค้า / บุคคล / บริษัท *</span>
              <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">คำนำ</span>
              <select className={inputCls} value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })}>
                <option value="">— ไม่ระบุ —</option>
                <option value="บจก.">บจก.</option>
                <option value="หจก.">หจก.</option>
                <option value="ร้าน">ร้าน</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ประเภท</span>
              <select className={inputCls} value={form.productOrService} onChange={(e) => setForm({ ...form, productOrService: e.target.value })}>
                <option value="สินค้า">สินค้า</option>
                <option value="บริการ">บริการ</option>
                <option value="สินค้าและบริการ">สินค้าและบริการ</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ประเภทงาน</span>
              <input className={inputCls} placeholder="เช่น ก่อสร้าง, วัสดุ" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">รายละเอียด</span>
              <input className={inputCls} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ผู้ติดต่อ</span>
              <input className={inputCls} value={form.contact1Name} onChange={(e) => setForm({ ...form, contact1Name: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">เบอร์โทร</span>
              <input className={inputCls} value={form.phone1} onChange={(e) => setForm({ ...form, phone1: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">LINE ID</span>
              <input className={inputCls} value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">จังหวัด</span>
              <input className={inputCls} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={saving}
                className="rounded-xl text-white px-6 py-2.5 text-sm font-bold disabled:opacity-50 transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #34d399, #059669)", boxShadow: "0 2px 10px rgba(5,150,105,0.3)" }}>
                {saving ? "กำลังบันทึก..." : "บันทึกผู้จัดหา"}
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
            <div className="p-4 space-y-2.5">{[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-xl skeleton" />)}</div>
          ) : suppliers.length === 0 ? (
            <div className="p-14 text-center">
              <Truck size={32} className="mx-auto mb-3" style={{ color: "#D4C8BC" }} />
              <p className="text-sm font-semibold" style={{ color: "#A8A29E" }}>ไม่พบผู้จัดหา</p>
              <p className="text-xs mt-1" style={{ color: "#C4B9AD" }}>ลองค้นหาคำอื่น หรือเพิ่มผู้จัดหาใหม่</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.01)" }}>
                    {["รหัส", "ชื่อร้านค้า", "ประเภทงาน", "ติดต่อ", "จังหวัด", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#B4A99E" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.code} className="group transition-colors" style={{ borderBottom: "1px solid rgba(0,0,0,0.035)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F7FFF9"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg" style={{ background: "#ECFDF5", color: "#15803D" }}>{s.code}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[13px] font-semibold" style={{ color: "#1C1917" }}>{s.prefix}{s.name}</div>
                        {s.details && <div className="text-[11px] mt-0.5" style={{ color: "#B4A99E" }}>{s.details}</div>}
                      </td>
                      <td className="px-5 py-4">
                        {s.category ? (
                          <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: "#F8FAFC", color: "#475569" }}>{s.category}</span>
                        ) : <span style={{ color: "#D4C8BC" }}>—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          {s.phone1 && (
                            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#78716C" }}>
                              <Phone size={11} style={{ color: "#B4A99E" }} />{s.phone1}
                            </div>
                          )}
                          {s.lineId && (
                            <div className="text-[11px]" style={{ color: "#B4A99E" }}>LINE: {s.lineId}</div>
                          )}
                          {!s.phone1 && !s.lineId && <span style={{ color: "#D4C8BC" }}>—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {s.province ? (
                          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#78716C" }}>
                            <MapPin size={11} style={{ color: "#B4A99E" }} />{s.province}
                          </div>
                        ) : <span style={{ color: "#D4C8BC" }}>—</span>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => openEdit(s)}
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
              <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.04)", background: "rgba(0,0,0,0.01)" }}>
                <p className="text-xs" style={{ color: "#B4A99E" }}>
                  แสดง <span className="font-semibold" style={{ color: "#78716C" }}>{suppliers.length}</span> รายการ
                </p>
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
                <h3 className="text-base font-bold" style={{ color: "#111110" }}>แก้ไขผู้จัดหา</h3>
                <p className="text-xs font-mono mt-0.5" style={{ color: "#B4A99E" }}>{editModal.supplier.code}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-1.5 rounded-lg transition-colors hover:bg-slate-100" style={{ color: "#A8A29E" }}>
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ชื่อร้านค้า</span>
                <input className={inputCls} value={editModal.form.name} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, name: e.target.value } } : null)} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ประเภทงาน</span>
                <input className={inputCls} value={editModal.form.category} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, category: e.target.value } } : null)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ผู้ติดต่อ</span>
                  <input className={inputCls} value={editModal.form.contact1Name} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, contact1Name: e.target.value } } : null)} />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">เบอร์โทร</span>
                  <input className={inputCls} value={editModal.form.phone1} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, phone1: e.target.value } } : null)} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">LINE ID</span>
                  <input className={inputCls} value={editModal.form.lineId} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, lineId: e.target.value } } : null)} />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">จังหวัด</span>
                  <input className={inputCls} value={editModal.form.province} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, province: e.target.value } } : null)} />
                </label>
              </div>
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
