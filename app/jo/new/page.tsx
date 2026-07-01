"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Loader2 } from "lucide-react";
import DatePicker from "@/components/DatePicker";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toaster";
import type { NewJOInput, NewJOOrderItem } from "@/lib/types-po";

const ACCENT = "#7C3AED";
const ACCENT_SHADOW = "rgba(124,58,237,0.25)";

function thaiDateToISO(thaiDate: string): string {
  const parts = thaiDate.trim().split("/");
  if (parts.length !== 3) return thaiDate;
  const [d, m, y] = parts;
  const ceYear = parseInt(y, 10) - 543;
  return `${ceYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 24,
      border: "1px solid rgba(0,0,0,0.06)",
      padding: 32,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
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

const COMMON_UNITS = ["ชุด", "ท่อน", "เมตร", "ตร.ม.", "ชิ้น", "งาน", "วัน", "เดือน", "ครั้ง", "ชั่วโมง"];

const emptyItem = (): NewJOOrderItem => ({
  itemName: "",
  qty: "1",
  unit: "",
  priceExcl: "",
  vatPct: "7",
  itemNote: "",
});

type HeaderForm = Omit<NewJOInput, "lineItems">;

const emptyHeader: HeaderForm = {
  supplierName: "",
  startDate: "",
  endDate: "",
  location: "",
  deposit: "",
  requester: "",
  reviewer: "",
  department: "",
  approver: "",
  notes: "",
};

function calcItem(item: NewJOOrderItem) {
  const p = parseFloat(item.priceExcl) || 0;
  const q = parseFloat(item.qty) || 0;
  const excl = p * q;
  const vatAmt = excl * 0.07;
  return { excl, vatAmt, incl: excl + vatAmt };
}

export default function NewJOPage() {
  const router = useRouter();
  const [form, setForm] = useState<HeaderForm>(emptyHeader);
  const [items, setItems] = useState<NewJOOrderItem[]>([emptyItem()]);
  const [people, setPeople] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isFormEmpty = !form.supplierName && !form.requester && items.every((it) => !it.itemName);

  useEffect(() => {
    if (!isFormEmpty) setIsDirty(true);
  }, [isFormEmpty]);

  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) { e.preventDefault(); }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    fetch("/api/people").then((r) => r.json()).then((d) => setPeople(d.people ?? []));
  }, []);

  function set(field: keyof HeaderForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const setItem = useCallback((idx: number, field: keyof NewJOOrderItem, value: string) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }, []);

  const totals = items.reduce(
    (acc, item) => {
      const t = calcItem(item);
      return { excl: acc.excl + t.excl, vat: acc.vat + t.vatAmt, incl: acc.incl + t.incl };
    },
    { excl: 0, vat: 0, incl: 0 }
  );

  const fmt = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((it) => it.itemName.trim());
    if (validItems.length === 0) {
      toast.error("ไม่มีรายการจ้าง", "ต้องระบุรายการจ้างอย่างน้อย 1 รายการ");
      return;
    }
    setSaving(true);
    const payload: NewJOInput = {
      ...form,
      startDate: form.startDate ? thaiDateToISO(form.startDate) : "",
      endDate: form.endDate ? thaiDateToISO(form.endDate) : "",
      lineItems: validItems,
    };
    try {
      const res = await fetch("/api/jo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      toast.success(`บันทึกสำเร็จ! เลขที่ ${data.jo.joNumber}`);
      setTimeout(() => router.push("/jo"), 1000);
    } catch (err) {
      toast.error("บันทึกไม่สำเร็จ", err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ background: "#F0EDE9", minHeight: "100vh" }}>
      {/* Page Header */}
      <div style={{ padding: "44px 44px 32px" }}>
        <div style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#1C1815", lineHeight: 1 }}>
          สร้างใบสั่งจ้าง
        </div>
        <div style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#C4B9AD", lineHeight: 1 }}>
          JO ใหม่
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} style={{ padding: "0 44px 48px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ข้อมูลการจ้างงาน */}
        <Card>
          <SectionHeader>ข้อมูลการจ้างงาน</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>

            <div style={{ gridColumn: "1 / -1" }}>
              <Label required>ชื่อร้านค้า / บุคคล / บริษัท</Label>
              <FocusInput
                required
                value={form.supplierName}
                onChange={(e) => set("supplierName", e.target.value)}
                placeholder="ชื่อผู้รับจ้าง"
              />
            </div>

            <div>
              <Label required>ชื่อผู้จ้าง</Label>
              <Combobox options={people} value={form.requester} onChange={(v) => set("requester", v)} placeholder="เลือกหรือพิมพ์ชื่อ" required />
            </div>

            <div>
              <Label>ผู้ตรวจสอบ</Label>
              <Combobox options={people} value={form.reviewer} onChange={(v) => set("reviewer", v)} placeholder="เลือกหรือพิมพ์ชื่อ" />
            </div>

            <div>
              <Label required>ผู้อนุมัติ</Label>
              <Combobox options={people} value={form.approver} onChange={(v) => set("approver", v)} placeholder="เลือกหรือพิมพ์ชื่อ" required />
            </div>

            <div>
              <Label>แผนก</Label>
              <FocusInput
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                placeholder="แผนก/ฝ่าย"
              />
            </div>

          </div>
        </Card>

        {/* รายละเอียดงาน */}
        <Card>
          <SectionHeader>รายละเอียดงาน</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>

            <div>
              <Label>วันที่เริ่มงาน</Label>
              <DatePicker value={form.startDate} onChange={(v) => set("startDate", v)} />
            </div>

            <div>
              <Label>วันที่สิ้นสุด</Label>
              <DatePicker value={form.endDate} onChange={(v) => set("endDate", v)} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <Label>สถานที่ทำงาน</Label>
              <FocusInput
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="ตึก/ห้อง/พื้นที่"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <Label>หมายเหตุ</Label>
              <FocusInput
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม..."
              />
            </div>

          </div>
        </Card>

        {/* รายการจ้าง */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SectionHeader>รายการจ้าง</SectionHeader>
              {items.filter((it) => it.itemName.trim()).length > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
                  background: "rgba(124,58,237,0.1)", color: ACCENT, marginBottom: 16,
                }}>
                  {items.filter((it) => it.itemName.trim()).length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "rgba(124,58,237,0.08)", color: ACCENT, border: "none",
              }}
            >
              <Plus size={13} /> เพิ่มรายการ
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 780, fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  {[
                    { label: "ชื่องาน / รายการ *", w: "34%" },
                    { label: "จำนวน", w: "9%" },
                    { label: "หน่วย", w: "11%" },
                    { label: "ราคา/หน่วย (excl. VAT)", w: "14%" },
                    { label: "ยอดรวม (incl)", w: "14%" },
                    { label: "หมายเหตุ", w: "12%" },
                    { label: "", w: "6%" },
                  ].map((col, i) => (
                    <th key={i} style={{
                      width: col.w, textAlign: "left",
                      paddingBottom: 10, paddingLeft: 6, paddingRight: 6,
                      fontSize: 11, fontWeight: 800, textTransform: "uppercase",
                      letterSpacing: "0.08em", color: "#C4B9AD",
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const c = calcItem(item);
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                      <td style={{ padding: "8px 6px 8px 0" }}>
                        <FocusTextarea
                          required
                          rows={2}
                          value={item.itemName}
                          onChange={(e) => setItem(idx, "itemName", e.target.value)}
                          placeholder="รายละเอียดงานที่จ้าง..."
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <FocusInput
                          type="number" min="0" step="any"
                          style={{ textAlign: "center" }}
                          value={item.qty}
                          onChange={(e) => setItem(idx, "qty", e.target.value)}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <Combobox
                          options={COMMON_UNITS}
                          value={item.unit}
                          onChange={(v) => setItem(idx, "unit", v)}
                          placeholder="หน่วย"
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <FocusInput
                          type="number" min="0" step="0.01"
                          style={{ textAlign: "right" }}
                          value={item.priceExcl}
                          onChange={(e) => setItem(idx, "priceExcl", e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right" }}>
                        {c.incl > 0
                          ? <span style={{ fontWeight: 700, color: "#1C1815", fontVariantNumeric: "tabular-nums" }}>{fmt(c.incl)}</span>
                          : <span style={{ color: "#C4B9AD" }}>—</span>}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <FocusInput
                          value={item.itemNote ?? ""}
                          onChange={(e) => setItem(idx, "itemNote", e.target.value)}
                          placeholder="ถ้ามี"
                        />
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "center" }}>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#C4B9AD", padding: 6, borderRadius: 8 }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.background = "#FEF2F2"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "#C4B9AD"; e.currentTarget.style.background = "none"; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* สรุปยอด */}
        <Card>
          <SectionHeader>สรุปยอด</SectionHeader>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <Label>ค่ามัดจำ (บาท)</Label>
              <FocusInput
                type="number" min="0" step="any"
                style={{ textAlign: "right", maxWidth: 200 }}
                placeholder="0.00"
                value={form.deposit}
                onChange={(e) => set("deposit", e.target.value)}
              />
            </div>
            <div style={{ minWidth: 260 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#5C5450" }}>
                  <span>ยอดก่อน VAT</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(totals.excl)} ฿</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#5C5450" }}>
                  <span>VAT 7%</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(totals.vat)} ฿</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "#1C1815", paddingTop: 12, borderTop: "2px solid rgba(0,0,0,0.06)", marginTop: 4 }}>
                  <span>รวมทั้งสิ้น</span>
                  <span style={{ color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.incl)} ฿</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 4 }}>
          <Link
            href="/jo"
            style={{
              padding: "14px 28px", borderRadius: 16, fontWeight: 700, fontSize: 14,
              background: "white", color: "#5C5450", border: "1.5px solid rgba(0,0,0,0.08)",
              textDecoration: "none", display: "inline-block",
            }}
          >
            ยกเลิก
          </Link>
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
            {saving ? (
              <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> กำลังบันทึก...</>
            ) : (
              <>บันทึก JO <kbd style={{ fontSize: 10, fontFamily: "monospace", background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: 6 }}>⌘↵</kbd></>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
