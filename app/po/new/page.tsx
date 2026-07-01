"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ChevronDown, Loader2 } from "lucide-react";
import type { Item, Supplier, NewPOLineItemInput } from "@/lib/types-po";

import { Combobox } from "@/components/Combobox";
import DatePicker from "@/components/DatePicker";
import { useToast } from "@/components/Toaster";

const UNITS = [
  "ชิ้น", "อัน", "ตัว", "แพ็ค", "ถุง", "ขวด", "กล่อง", "ชุด",
  "ม้วน", "เมตร", "ลิตร", "กิโลกรัม", "ด้าม", "ใบ", "แผ่น",
  "คู่", "โหล", "หลอด", "เล่ม", "ถัง", "ก้อน", "ห่อ", "ลัง",
  "แกลลอน", "มัด", "แผง", "ถาด",
];

const numCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-right bg-white transition-all";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-all";

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
    <label className={`block ${span2 ? "sm:col-span-2" : ""}`}>
      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

const emptyLine = (): NewPOLineItemInput => ({
  itemCode: "",
  itemName: "",
  supplierSku: "",
  qty: "",
  unit: "ชิ้น",
  priceExclVat: "",
  vatPct: "7",
  itemNote: "",
});

const emptyHeader = {
  orderDate: new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }),
  prevPO: "",
  supplierName: "",
  requester: "",
  reviewer: "",
  approver: "",
  deposit: "",
  shipping: "",
  discount: "",
  notes: "",
};

function calcLine(item: NewPOLineItemInput) {
  const priceExcl = parseFloat(item.priceExclVat) || 0;
  const vatPct = parseFloat(item.vatPct) || 0;
  const qty = parseFloat(item.qty) || 0;
  const vatPerUnit = (priceExcl * vatPct) / 100;
  return {
    totalIncl: qty * (priceExcl + vatPerUnit),
    totalVat: qty * vatPerUnit,
    totalExcl: qty * priceExcl,
  };
}

function thaiDateToISO(thaiDate: string): string {
  const parts = thaiDate.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const ceYear = parseInt(y) > 2500 ? parseInt(y) - 543 : parseInt(y);
    return `${ceYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return thaiDate;
}

function UnitSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 pl-3 pr-7 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-all"
      >
        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        {value && !UNITS.includes(value) && <option value={value}>{value}</option>}
      </select>
      <ChevronDown
        size={13}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  );
}

export default function NewPOPage() {
  const router = useRouter();
  const [header, setHeader] = useState(emptyHeader);
  const [lines, setLines] = useState<NewPOLineItemInput[]>([emptyLine()]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [itemMap, setItemMap] = useState<Map<string, Item>>(new Map());
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

  const isFormEmpty =
    !header.supplierName && !header.requester && lines.every((l) => !l.itemName && !l.qty);

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
    fetch("/api/people")
      .then((r) => r.json())
      .then((d) => setPeople(d.people ?? []));
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.suppliers ?? []));
    fetch("/api/items")
      .then((r) => r.json())
      .then((d) => {
        const items: Item[] = d.items ?? [];
        const map = new Map<string, Item>();
        items.forEach((i) => map.set(i.name.trim(), i));
        setAllItems(items);
        setItemMap(map);
      });
  }, []);

  const supplierItems = header.supplierName
    ? allItems.filter((i) => i.supplierName === header.supplierName)
    : allItems;
  const itemOptions = supplierItems;

  const setLine = useCallback(
    (idx: number, patch: Partial<NewPOLineItemInput>) => {
      setLines((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))
      );
    },
    []
  );

  const autoFillItem = useCallback(
    (idx: number, name: string) => {
      const item = itemMap.get(name.trim());
      if (item) {
        const stripNonNumeric = (s: string) =>
          s.replace(/,/g, "").replace(/[^\d.]/g, "").trim();
        const raw =
          stripNonNumeric(item.priceExclVat) ||
          stripNonNumeric(item.price) ||
          (item.priceInclVat.trim()
            ? String((parseFloat(item.priceInclVat.replace(/[^\d.]/g, "")) / 1.07).toFixed(2))
            : "");
        const parsedPrice = parseFloat(raw);
        const resolvedPrice = !isNaN(parsedPrice) && parsedPrice > 0
          ? parsedPrice.toFixed(2)
          : "";
        setLines((prev) =>
          prev.map((l, i) =>
            i === idx
              ? {
                  ...l,
                  itemName: name.trim(),
                  itemCode: item.code,
                  supplierSku: item.supplierSku,
                  unit: item.unit || "ชิ้น",
                  priceExclVat: resolvedPrice,
                  vatPct: "7",
                }
              : l
          )
        );
      } else {
        setLine(idx, { itemName: name });
      }
    },
    [itemMap, setLine]
  );


  const totals = lines.reduce(
    (acc, l) => {
      const c = calcLine(l);
      return { excl: acc.excl + c.totalExcl, vat: acc.vat + c.totalVat, incl: acc.incl + c.totalIncl };
    },
    { excl: 0, vat: 0, incl: 0 }
  );
  const shipping = parseFloat(header.shipping) || 0;
  const discount = parseFloat(header.discount) || 0;
  const grandTotal = totals.incl + shipping - discount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validLines = lines.filter((l) => l.itemName.trim() && parseFloat(l.qty) > 0);
    if (validLines.length === 0) {
      toast.error("ไม่มีรายการสินค้า", "ต้องระบุรายการสินค้าที่มีชื่อและจำนวนอย่างน้อย 1 รายการ");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...header, orderDate: thaiDateToISO(header.orderDate), lineItems: validLines };
      const res = await fetch("/api/po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      toast.success(`บันทึกสำเร็จ! เลขที่ ${data.po.poNumber}`);
      setTimeout(() => router.push(`/po/${data.po.poNumber.replace(/\//g, "~")}/print`), 800);
    } catch (err) {
      toast.error("บันทึกไม่สำเร็จ", err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-7">
        <Link
          href="/po"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-3 transition-colors"
        >
          <ArrowLeft size={15} />
          กลับรายการ PO
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">สร้างใบสั่งซื้อใหม่</h1>
      </div>


      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

        {/* Header card */}
        <section
          className="bg-white rounded-2xl p-6 grid sm:grid-cols-2 gap-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}
        >
          <div className="sm:col-span-2 flex items-center gap-2 pb-1">
            <h2 className="text-sm font-bold text-slate-700">ข้อมูลใบสั่งซื้อ</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <Field label="วันที่สั่งซื้อ" required>
            <DatePicker
              required
              value={header.orderDate}
              onChange={(v) => setHeader({ ...header, orderDate: v })}
            />
          </Field>

          <Field label="ชื่อร้านค้า / ผู้จัดหา" required>
            <Combobox
              options={suppliers.map((s) => s.name)}
              value={header.supplierName}
              onChange={(v) => setHeader({ ...header, supplierName: v })}
              placeholder="เลือกหรือพิมพ์ชื่อร้านค้า"
              required
            />
            {header.supplierName && supplierItems.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">ไม่พบสินค้าของร้านนี้ใน catalog — กรอกชื่อสินค้าเองได้เลย</p>
            )}
          </Field>

          <Field label="ชื่อผู้สั่งซื้อ" required>
            <Combobox
              options={people}
              value={header.requester}
              onChange={(v) => setHeader({ ...header, requester: v })}
              placeholder="เลือกหรือพิมพ์ชื่อ"
              required
            />
          </Field>

          <Field label="ผู้ตรวจสอบ">
            <Combobox
              options={people}
              value={header.reviewer}
              onChange={(v) => setHeader({ ...header, reviewer: v })}
              placeholder="เลือกหรือพิมพ์ชื่อ"
            />
          </Field>

          <Field label="ผู้อนุมัติ" required>
            <Combobox
              options={people}
              value={header.approver}
              onChange={(v) => setHeader({ ...header, approver: v })}
              placeholder="เลือกหรือพิมพ์ชื่อ"
              required
            />
          </Field>

          <Field label="PO เดิม (ถ้ามี)">
            <input
              className={inputCls}
              placeholder="เช่น PO-68/0010"
              value={header.prevPO}
              onChange={(e) => setHeader({ ...header, prevPO: e.target.value })}
            />
          </Field>

          <Field label="หมายเหตุ" span2>
            <input
              className={inputCls}
              value={header.notes}
              onChange={(e) => setHeader({ ...header, notes: e.target.value })}
            />
          </Field>
        </section>

        {/* Line items card */}
        <section
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-sm font-bold text-slate-700">รายการสินค้า</h2>
            {lines.filter((l) => l.itemName.trim()).length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {lines.filter((l) => l.itemName.trim()).length}
              </span>
            )}
            <div className="h-px flex-1 bg-slate-100" />
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              เพิ่มรายการ
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm" style={{ minWidth: "780px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <th className="font-semibold text-left pb-3 pr-3 text-xs text-slate-400 uppercase tracking-wide" style={{ width: "30%" }}>ชื่อสินค้า *</th>
                  <th className="font-semibold text-center pb-3 px-2 text-xs text-slate-400 uppercase tracking-wide" style={{ width: "12%" }}>จำนวน</th>
                  <th className="font-semibold text-left pb-3 px-2 text-xs text-slate-400 uppercase tracking-wide" style={{ width: "13%" }}>หน่วย</th>
                  <th className="font-semibold text-right pb-3 px-2 text-xs text-slate-400 uppercase tracking-wide" style={{ width: "14%" }}>ราคา/หน่วย</th>
                  <th className="font-semibold text-right pb-3 px-2 text-xs text-slate-400 uppercase tracking-wide" style={{ width: "16%" }}>ยอดรวม (incl)</th>
                  <th className="font-semibold text-left pb-3 px-2 text-xs text-slate-400 uppercase tracking-wide" style={{ width: "12%" }}>หมายเหตุ</th>
                  <th style={{ width: "3%" }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const c = calcLine(line);
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #F8FAFC" }}>
                      <td className="py-2 pr-3">
                        <Combobox
                          options={itemOptions.map((i) => i.name)}
                          value={line.itemName}
                          onChange={(v) => autoFillItem(idx, v)}
                          placeholder="ชื่อสินค้า"
                          emptyMessage={header.supplierName && supplierItems.length === 0 ? "ไม่มีรายการสินค้าจากร้านค้านี้ในระบบ — กรอกชื่อสินค้าเองได้เลย" : undefined}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={numCls + " text-center"}
                          value={line.qty}
                          onChange={(e) => setLine(idx, { qty: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <UnitSelect
                          value={line.unit}
                          onChange={(v) => setLine(idx, { unit: v })}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={numCls}
                          value={line.priceExclVat}
                          onChange={(e) => setLine(idx, { priceExclVat: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        {c.totalIncl > 0 ? (
                          <span className="font-semibold text-slate-800 tabular-nums">
                            {fmt(c.totalIncl)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          className={inputCls}
                          value={line.itemNote}
                          onChange={(e) => setLine(idx, { itemNote: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pl-2 text-center">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
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

        {/* Summary card */}
        <section
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-sm font-bold text-slate-700">สรุปยอด</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="flex gap-8 flex-col sm:flex-row">
            <div className="grid sm:grid-cols-3 gap-4 flex-1">
              <Field label="ค่ามัดจำ (บาท)">
                <input type="number" min="0" step="any" className={numCls} placeholder="0.00"
                  value={header.deposit} onChange={(e) => setHeader({ ...header, deposit: e.target.value })} />
              </Field>
              <Field label="ค่าขนส่ง (บาท)">
                <input type="number" min="0" step="any" className={numCls} placeholder="0.00"
                  value={header.shipping} onChange={(e) => setHeader({ ...header, shipping: e.target.value })} />
              </Field>
              <Field label="ส่วนลด (บาท)">
                <input type="number" min="0" step="any" className={numCls} placeholder="0.00"
                  value={header.discount} onChange={(e) => setHeader({ ...header, discount: e.target.value })} />
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
              {shipping > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>ค่าขนส่ง</span>
                  <span className="tabular-nums">+{fmt(shipping)} ฿</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>ส่วนลด</span>
                  <span className="tabular-nums text-red-500">−{fmt(discount)} ฿</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-base pt-3"
                style={{ borderTop: "2px solid #F1F5F9" }}
              >
                <span className="text-slate-700">รวมเป็นเงิน</span>
                <span className="tabular-nums text-emerald-700">{fmt(grandTotal)} ฿</span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-1">
          <Link
            href="/po"
            className="rounded-xl border border-slate-200 bg-white text-slate-600 px-6 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2.5 rounded-xl bg-emerald-600 text-white px-7 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-sm hover:-translate-y-0.5"
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</>
            ) : (
              <>บันทึก PO <kbd className="text-[10px] font-mono bg-emerald-500 px-1.5 py-0.5 rounded opacity-70">⌘↵</kbd></>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
