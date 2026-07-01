"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { MaintenanceCategory, MaintenancePriority } from "@/lib/types";

const ACCENT = "#7C3AED";
const ACCENT_SHADOW = "rgba(124,58,237,0.25)";

const PRIORITIES: { value: MaintenancePriority; label: string; color: string }[] = [
  { value: "low",    label: "ต่ำ",    color: "#6B7280" },
  { value: "medium", label: "กลาง",  color: "#D97706" },
  { value: "high",   label: "สูง",   color: "#DC2626" },
  { value: "urgent", label: "ด่วน!", color: "#991B1B" },
];

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
    ? { borderColor: ACCENT, boxShadow: "0 0 0 3px rgba(124,58,237,0.1)" }
    : {};
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: "#5C5450", marginBottom: 6, display: "block" }}>
      {children}{required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}
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

function FocusTextarea({ style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, ...style, resize: "vertical", ...focusStyle(focused) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function FocusSelect({ style, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{ ...inputStyle, ...style, ...focusStyle(focused) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <main style={{ background: "#F0EDE9", minHeight: "100vh" }}>
      {/* Page Header */}
      <div style={{ padding: "44px 44px 32px" }}>
        <div style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#1C1815", lineHeight: 1 }}>
          แจ้งซ่อม
        </div>
        <div style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#C4B9AD", lineHeight: 1 }}>
          ใหม่
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "0 44px 48px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "#FEF2F2", color: "#DC2626", fontSize: 13, border: "1px solid #FECACA" }}>
            {error}
          </div>
        )}

        <div style={{
          background: "white",
          borderRadius: 24,
          border: "1px solid rgba(0,0,0,0.06)",
          padding: 32,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}>
          <SectionHeader>ข้อมูลการแจ้งซ่อม</SectionHeader>

          {/* Title */}
          <div>
            <Label required>หัวข้อ</Label>
            <FocusInput
              value={form.title}
              onChange={e => setField("title", e.target.value)}
              placeholder="เช่น ไฟดับในห้องครัว, ท่อน้ำรั่ว, เก้าอี้หัก"
            />
          </div>

          {/* Description */}
          <div>
            <Label>รายละเอียด</Label>
            <FocusTextarea
              rows={4}
              value={form.description}
              onChange={e => setField("description", e.target.value)}
              placeholder="อธิบายปัญหาให้ละเอียด"
              style={{ minHeight: 80 }}
            />
          </div>

          {/* Location + Category */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <Label>สถานที่</Label>
              <FocusInput
                value={form.location}
                onChange={e => setField("location", e.target.value)}
                placeholder="เช่น ห้อง 101, สนาม"
              />
            </div>
            <div>
              <Label>ประเภท</Label>
              <FocusSelect
                value={form.category_id}
                onChange={e => setField("category_id", e.target.value)}
              >
                <option value="">-- เลือกประเภท --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FocusSelect>
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label>ระดับความสำคัญ</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setField("priority", p.value)}
                  style={{
                    padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer",
                    border: `2px solid ${form.priority === p.value ? p.color : "rgba(0,0,0,0.08)"}`,
                    background: form.priority === p.value ? p.color : "white",
                    color: form.priority === p.value ? "white" : p.color,
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>หมายเหตุเพิ่มเติม</Label>
            <FocusInput
              value={form.notes}
              onChange={e => setField("notes", e.target.value)}
              placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            type="submit"
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
            ส่งแจ้งซ่อม
          </button>
        </div>
      </form>
    </main>
  );
}
