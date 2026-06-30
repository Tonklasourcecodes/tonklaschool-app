"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import type { MaintenanceCategory, MaintenancePriority } from "@/lib/types";

const PRIORITIES: { value: MaintenancePriority; label: string; color: string }[] = [
  { value:"low",    label:"ต่ำ",    color:"#6B7280" },
  { value:"medium", label:"กลาง",  color:"#D97706" },
  { value:"high",   label:"สูง",   color:"#DC2626" },
  { value:"urgent", label:"ด่วน!", color:"#991B1B" },
];

export default function NewMaintenancePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    category_id: "",
    priority: "medium" as MaintenancePriority,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/maintenance/categories").then(r => r.json()).then(d => setCategories(d.categories ?? []));
  }, []);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError("กรุณาระบุหัวข้อ"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, category_id: form.category_id || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); return; }
      router.push(`/maintenance/${data.request.id}`);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width:"100%", padding:"9px 12px", borderRadius:10, border:"1px solid var(--border)",
    fontSize:14, outline:"none", background:"white",
  };

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)" }}>
      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid var(--border)", padding:"16px 24px", position:"sticky", top:0, zIndex:10 }}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/maintenance" style={{ color:"var(--subtle)", display:"flex", alignItems:"center" }}>
              <ChevronLeft size={18} />
            </Link>
            <h1 style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--text)" }}>แจ้งซ่อมใหม่</h1>
          </div>
          <button onClick={handleSubmit} disabled={saving}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 18px", borderRadius:10, fontSize:13, fontWeight:700, background:"linear-gradient(135deg,#7C3AED,#6D28D9)", color:"white", cursor:"pointer", border:"none" }}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            ส่งแจ้งซ่อม
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {error && <div style={{ padding:"10px 16px", borderRadius:12, background:"#FEF2F2", color:"#DC2626", fontSize:13, border:"1px solid #FECACA" }}>{error}</div>}

        <div className="card p-5 space-y-4">
          {/* Title */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>
              หัวข้อ <span style={{ color:"#EF4444" }}>*</span>
            </label>
            <input style={inputStyle} value={form.title} onChange={e => setField("title", e.target.value)}
              placeholder="เช่น ไฟดับในห้องครัว, ท่อน้ำรั่ว, เก้าอี้หัก" />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>รายละเอียด</label>
            <textarea style={{ ...inputStyle, resize:"vertical", minHeight:80 }} value={form.description}
              onChange={e => setField("description", e.target.value)} placeholder="อธิบายปัญหาให้ละเอียด" />
          </div>

          {/* Location + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>สถานที่</label>
              <input style={inputStyle} value={form.location} onChange={e => setField("location", e.target.value)}
                placeholder="เช่น ห้อง 101, สนาม" />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>ประเภท</label>
              <select style={{ ...inputStyle }} value={form.category_id} onChange={e => setField("category_id", e.target.value)}>
                <option value="">-- เลือกประเภท --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:8 }}>ระดับความสำคัญ</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map(p => (
                <button key={p.value} type="button" onClick={() => setField("priority", p.value)}
                  style={{
                    padding:"8px 0", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer",
                    border:`2px solid ${form.priority === p.value ? p.color : "var(--border)"}`,
                    background: form.priority === p.value ? p.color : "white",
                    color: form.priority === p.value ? "white" : p.color,
                    transition:"all 0.15s",
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--muted)", display:"block", marginBottom:6 }}>หมายเหตุเพิ่มเติม</label>
            <input style={inputStyle} value={form.notes} onChange={e => setField("notes", e.target.value)}
              placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)" />
          </div>
        </div>
      </div>
    </div>
  );
}
