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
};

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
    <div style={{ minHeight: "100%", background: "#F0EDE9" }}>
      {/* Header */}
      <div style={{ padding: "44px 44px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#059669", marginBottom: 8 }}>
          จัดซื้อ
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "clamp(2.8rem,5vw,4rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95, color: "#111110", margin: 0 }}>
              ผู้จำหน่าย
            </h1>
            {!loading && (
              <p style={{ fontSize: 13, color: "#A8A29E", marginTop: 10 }}>
                <span style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 900, color: "#111110", lineHeight: 1 }}>{suppliers.length}</span>
                {" "}ร้านค้า
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
            {showForm ? "ยกเลิก" : "เพิ่มผู้จำหน่าย"}
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div style={{ padding: "0 44px 24px", marginTop: 28 }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#B4A99E", pointerEvents: "none" }} />
          <input
            style={{ ...inputStyle, paddingLeft: 40, borderRadius: 14, fontSize: 13, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            placeholder="ค้นหาชื่อร้าน ประเภทงาน หรือรหัส..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
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
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ชื่อร้านค้า / บุคคล / บริษัท *</span>
              <input required style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>คำนำ</span>
              <select style={inputStyle} value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })}>
                <option value="">— ไม่ระบุ —</option>
                <option value="บจก.">บจก.</option>
                <option value="หจก.">หจก.</option>
                <option value="ร้าน">ร้าน</option>
              </select>
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ประเภท</span>
              <select style={inputStyle} value={form.productOrService} onChange={(e) => setForm({ ...form, productOrService: e.target.value })}>
                <option value="สินค้า">สินค้า</option>
                <option value="บริการ">บริการ</option>
                <option value="สินค้าและบริการ">สินค้าและบริการ</option>
              </select>
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ประเภทงาน</span>
              <input style={inputStyle} placeholder="เช่น ก่อสร้าง, วัสดุ" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>รายละเอียด</span>
              <input style={inputStyle} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ผู้ติดต่อ</span>
              <input style={inputStyle} value={form.contact1Name} onChange={(e) => setForm({ ...form, contact1Name: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>เบอร์โทร</span>
              <input style={inputStyle} value={form.phone1} onChange={(e) => setForm({ ...form, phone1: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>LINE ID</span>
              <input style={inputStyle} value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>จังหวัด</span>
              <input style={inputStyle} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
            </label>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={saving}
                style={{
                  background: "linear-gradient(135deg, #34d399, #059669)", color: "white",
                  border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                  boxShadow: "0 2px 10px rgba(5,150,105,0.3)",
                }}>
                {saving ? "กำลังบันทึก..." : "บันทึกผู้จำหน่าย"}
              </button>
            </div>
          </form>
        )}

        {/* Supplier list */}
        <div style={{ background: "white", borderRadius: 24, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 20 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ height: 60, borderRadius: 12, background: "rgba(0,0,0,0.05)", marginBottom: 10, animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <div style={{ padding: "56px 20px", textAlign: "center" }}>
              <Truck size={32} style={{ color: "#D4C8BC", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#A8A29E" }}>ไม่พบผู้จำหน่าย</p>
              <p style={{ fontSize: 12, color: "#C4B9AD", marginTop: 4 }}>ลองค้นหาคำอื่น หรือเพิ่มผู้จำหน่ายใหม่</p>
            </div>
          ) : (
            <>
              {suppliers.map((s, idx) => (
                <div key={s.code}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 20px",
                    borderBottom: idx < suppliers.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F7FFF9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* Left: name + category */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, background: "#ECFDF5", color: "#15803D" }}>
                        {s.code}
                      </span>
                      {s.category && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "#F8FAFC", color: "#475569", fontWeight: 500 }}>
                          {s.category}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#1C1917", margin: 0 }}>{s.prefix}{s.name}</p>
                    {s.details && <p style={{ fontSize: 11, color: "#B4A99E", marginTop: 2 }}>{s.details}</p>}
                  </div>

                  {/* Right: province + phone */}
                  <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0, marginLeft: 16 }}>
                    {s.province && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#78716C" }}>
                        <MapPin size={11} style={{ color: "#B4A99E" }} />
                        {s.province}
                      </div>
                    )}
                    {s.phone1 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#78716C" }}>
                        <Phone size={11} style={{ color: "#B4A99E" }} />
                        {s.phone1}
                      </div>
                    )}
                    <button
                      onClick={() => openEdit(s)}
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
              <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(0,0,0,0.04)", background: "rgba(0,0,0,0.01)" }}>
                <p style={{ fontSize: 12, color: "#B4A99E", margin: 0 }}>
                  แสดง <span style={{ fontWeight: 700, color: "#78716C" }}>{suppliers.length}</span> รายการ
                </p>
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
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111110", margin: 0 }}>แก้ไขผู้จำหน่าย</h3>
                <p style={{ fontSize: 11, fontFamily: "monospace", color: "#B4A99E", marginTop: 4 }}>{editModal.supplier.code}</p>
              </div>
              <button onClick={() => setEditModal(null)} style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", color: "#A8A29E", cursor: "pointer" }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ชื่อร้านค้า</span>
                <input style={inputStyle} value={editModal.form.name} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, name: e.target.value } } : null)} />
              </label>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ประเภทงาน</span>
                <input style={inputStyle} value={editModal.form.category} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, category: e.target.value } } : null)} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>ผู้ติดต่อ</span>
                  <input style={inputStyle} value={editModal.form.contact1Name} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, contact1Name: e.target.value } } : null)} />
                </label>
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>เบอร์โทร</span>
                  <input style={inputStyle} value={editModal.form.phone1} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, phone1: e.target.value } } : null)} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>LINE ID</span>
                  <input style={inputStyle} value={editModal.form.lineId} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, lineId: e.target.value } } : null)} />
                </label>
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>จังหวัด</span>
                  <input style={inputStyle} value={editModal.form.province} onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, province: e.target.value } } : null)} />
                </label>
              </div>
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
