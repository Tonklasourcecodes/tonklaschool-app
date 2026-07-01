"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import DatePicker from "@/components/DatePicker";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toaster";
import type { NewJOInput, NewJOOrderItem } from "@/lib/types-po";

function thaiDateToISO(thaiDate: string): string {
  const parts = thaiDate.trim().split("/");
  if (parts.length !== 3) return thaiDate;
  const [d, m, y] = parts;
  const ceYear = parseInt(y, 10) - 543;
  return `${ceYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-300";
const numCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 tabular-nums text-right";

function Field({
  label,
  required,
  children,
  span2,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
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

  const cardStyle = { boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" };

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-7">
        <Link href="/jo" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-3 transition-colors">
          <ArrowLeft size={15} /> กลับรายการ JO
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">สร้างใบจ้างงานใหม่</h1>
        <p className="text-sm text-slate-400 mt-1">เลขที่ JO จะถูกสร้างอัตโนมัติ</p>
      </div>


      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

        {/* ── ข้อมูลการจ้างงาน ─── */}
        <section className="bg-white rounded-2xl p-6 grid sm:grid-cols-2 gap-5" style={cardStyle}>
          <div className="sm:col-span-2 flex items-center gap-2 pb-1">
            <h2 className="text-sm font-bold text-slate-700">ข้อมูลการจ้างงาน</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <Field label="ชื่อร้านค้า / บุคคล / บริษัท" required span2>
            <input
              required
              className={inputCls}
              value={form.supplierName}
              onChange={(e) => set("supplierName", e.target.value)}
              placeholder="ชื่อผู้รับจ้าง"
            />
          </Field>

          <Field label="ชื่อผู้จ้าง" required>
            <Combobox options={people} value={form.requester} onChange={(v) => set("requester", v)} placeholder="เลือกหรือพิมพ์ชื่อ" required />
          </Field>

          <Field label="ผู้ตรวจสอบ">
            <Combobox options={people} value={form.reviewer} onChange={(v) => set("reviewer", v)} placeholder="เลือกหรือพิมพ์ชื่อ" />
          </Field>

          <Field label="ผู้อนุมัติ" required>
            <Combobox options={people} value={form.approver} onChange={(v) => set("approver", v)} placeholder="เลือกหรือพิมพ์ชื่อ" required />
          </Field>

          <Field label="แผนก">
            <input className={inputCls} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="แผนก/ฝ่าย" />
          </Field>
        </section>

        {/* ── รายละเอียดงาน ─── */}
        <section className="bg-white rounded-2xl p-6 grid sm:grid-cols-2 gap-5" style={cardStyle}>
          <div className="sm:col-span-2 flex items-center gap-2 pb-1">
            <h2 className="text-sm font-bold text-slate-700">รายละเอียดงาน</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <Field label="วันที่เริ่มงาน">
            <DatePicker value={form.startDate} onChange={(v) => set("startDate", v)} />
          </Field>

          <Field label="วันที่สิ้นสุด">
            <DatePicker value={form.endDate} onChange={(v) => set("endDate", v)} />
          </Field>

          <Field label="สถานที่ทำงาน" span2>
            <input className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="ตึก/ห้อง/พื้นที่" />
          </Field>

          <Field label="หมายเหตุ" span2>
            <input className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." />
          </Field>
        </section>

        {/* ── รายการจ้าง ─── */}
        <section className="bg-white rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-sm font-bold text-slate-700">รายการจ้าง</h2>
            {items.filter((it) => it.itemName.trim()).length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {items.filter((it) => it.itemName.trim()).length}
              </span>
            )}
            <div className="h-px flex-1 bg-slate-100" />
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} /> เพิ่มรายการ
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm" style={{ minWidth: "780px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                  {[
                    { h: "ชื่องาน / รายการ", req: true },
                    { h: "จำนวน", req: false },
                    { h: "หน่วย", req: false },
                    { h: "ราคา/หน่วย (excl. VAT)", req: false },
                    { h: "ยอดรวม (incl)", req: false },
                    { h: "หมายเหตุ", req: false },
                    { h: "", req: false },
                  ].map(({ h, req }, i) => (
                    <th
                      key={i}
                      className="font-semibold text-left pb-3 px-2 text-xs text-slate-400 uppercase tracking-wide first:pl-0 last:pr-0"
                      style={{ width: ["34%","9%","11%","14%","14%","12%","3%"][i] }}
                    >
                      {h}{req && <span className="text-red-400 ml-0.5">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const c = calcItem(item);
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #F8FAFC" }}>
                      <td className="py-2 pr-2">
                        <textarea
                          required
                          rows={2}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none placeholder:text-slate-300"
                          value={item.itemName}
                          onChange={(e) => setItem(idx, "itemName", e.target.value)}
                          placeholder="รายละเอียดงานที่จ้าง..."
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number" min="0" step="any"
                          className={numCls + " text-center"}
                          value={item.qty}
                          onChange={(e) => setItem(idx, "qty", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Combobox
                          options={COMMON_UNITS}
                          value={item.unit}
                          onChange={(v) => setItem(idx, "unit", v)}
                          placeholder="หน่วย"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number" min="0" step="0.01"
                          className={numCls}
                          value={item.priceExcl}
                          onChange={(e) => setItem(idx, "priceExcl", e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        {c.incl > 0
                          ? <span className="font-semibold text-slate-800 tabular-nums">{fmt(c.incl)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          className={inputCls}
                          value={item.itemNote ?? ""}
                          onChange={(e) => setItem(idx, "itemNote", e.target.value)}
                          placeholder="ถ้ามี"
                        />
                      </td>
                      <td className="py-2 pl-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
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
        </section>

        {/* ── สรุปยอด ─── */}
        <section className="bg-white rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-sm font-bold text-slate-700">สรุปยอด</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="flex gap-8 flex-col sm:flex-row">
            <div className="flex-1">
              <Field label="ค่ามัดจำ (บาท)">
                <input
                  type="number" min="0" step="any"
                  className={numCls}
                  placeholder="0.00"
                  value={form.deposit}
                  onChange={(e) => set("deposit", e.target.value)}
                  style={{ maxWidth: 200 }}
                />
              </Field>
            </div>

            <div className="min-w-[240px] space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>ยอดก่อน VAT</span>
                <span className="tabular-nums font-medium">{fmt(totals.excl)} ฿</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>VAT 7%</span>
                <span className="tabular-nums font-medium">{fmt(totals.vat)} ฿</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 text-base">
                <span>รวมทั้งสิ้น</span>
                <span className="tabular-nums text-emerald-700">{fmt(totals.incl)} ฿</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Actions ─── */}
        <div className="flex justify-end gap-3 pb-6">
          <Link
            href="/jo"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60 hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 14px rgba(16,185,129,0.35)" }}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</>
            ) : (
              <>บันทึก JO <kbd className="text-[10px] font-mono bg-emerald-400/30 px-1.5 py-0.5 rounded">⌘↵</kbd></>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
