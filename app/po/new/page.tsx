"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ChevronDown, Loader2 } from "lucide-react";
import type { Item, Supplier, NewPOLineItemInput } from "@/lib/types-po";

import { Combobox } from "@/components/Combobox";
import DatePicker from "@/components/DatePicker";
import { useToast } from "@/components/Toaster";

const ACCENT = "#059669";
const ACCENT_SHADOW = "rgba(5,150,105,0.25)";

const UNITS = [
  "ชิ้น", "อัน", "ตัว", "แพ็ค", "ถุง", "ขวด", "กล่อง", "ชุด",
  "ม้วน", "เมตร", "ลิตร", "กิโลกรัม", "ด้าม", "ใบ", "แผ่น",
  "คู่", "โหล", "หลอด", "เล่ม", "ถัง", "ก้อน", "ห่อ", "ลัง",
  "แกลลอน", "มัด", "แผง", "ถาด",
];

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1.5px solid rgba(0,0,0,0.08)",
  fontSize: 14,
  background: "white",
  outline: "none",
  color: "#1C1815",
};

const numStyle = {
  ...inputStyle,
  textAlign: "right" as const,
};

function focusStyle(focused: boolean) {
  return focused
    ? { borderColor: ACCENT, boxShadow: "0 0 0 3px rgba(5,150,105,0.1)" }
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
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          appearance: "none",
          paddingRight: 32,
          ...focusStyle(focused),
        }}
      >
        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        {value && !UNITS.includes(value) && <option value={value}>{value}</option>}
      </select>
      <ChevronDown
        size={13}
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#C4B9AD", pointerEvents: "none" }}
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
    <main style={{ background: "#F0EDE9", minHeight: "100vh" }}>
      {/* Page Header */}
      <div style={{ padding: "44px 44px 32px" }}>
        <div style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#1C1815", lineHeight: 1 }}>
          สร้างใบสั่งซื้อ
        </div>
        <div style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#C4B9AD", lineHeight: 1 }}>
          PO ใหม่
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} style={{ padding: "0 44px 48px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header Card */}
        <Card>
          <SectionHeader>ข้อมูลใบสั่งซื้อ</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>

            <div>
              <Label required>วันที่สั่งซื้อ</Label>
              <DatePicker
                required
                value={header.orderDate}
                onChange={(v) => setHeader({ ...header, orderDate: v })}
              />
            </div>

            <div>
              <Label required>ชื่อร้านค้า / ผู้จัดหา</Label>
              <Combobox
                options={suppliers.map((s) => s.name)}
                value={header.supplierName}
                onChange={(v) => setHeader({ ...header, supplierName: v })}
                placeholder="เลือกหรือพิมพ์ชื่อร้านค้า"
                required
              />
              {header.supplierName && supplierItems.length === 0 && (
                <p style={{ marginTop: 6, fontSize: 12, color: "#D97706" }}>
                  ไม่พบสินค้าของร้านนี้ใน catalog — กรอกชื่อสินค้าเองได้เลย
                </p>
              )}
            </div>

            <div>
              <Label required>ชื่อผู้สั่งซื้อ</Label>
              <Combobox
                options={people}
                value={header.requester}
                onChange={(v) => setHeader({ ...header, requester: v })}
                placeholder="เลือกหรือพิมพ์ชื่อ"
                required
              />
            </div>

            <div>
              <Label>ผู้ตรวจสอบ</Label>
              <Combobox
                options={people}
                value={header.reviewer}
                onChange={(v) => setHeader({ ...header, reviewer: v })}
                placeholder="เลือกหรือพิมพ์ชื่อ"
              />
            </div>

            <div>
              <Label required>ผู้อนุมัติ</Label>
              <Combobox
                options={people}
                value={header.approver}
                onChange={(v) => setHeader({ ...header, approver: v })}
                placeholder="เลือกหรือพิมพ์ชื่อ"
                required
              />
            </div>

            <div>
              <Label>PO เดิม (ถ้ามี)</Label>
              <FocusInput
                placeholder="เช่น PO-68/0010"
                value={header.prevPO}
                onChange={(e) => setHeader({ ...header, prevPO: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <Label>หมายเหตุ</Label>
              <FocusInput
                value={header.notes}
                onChange={(e) => setHeader({ ...header, notes: e.target.value })}
              />
            </div>

          </div>
        </Card>

        {/* Line Items Card */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SectionHeader>รายการสินค้า</SectionHeader>
              {lines.filter((l) => l.itemName.trim()).length > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
                  background: "rgba(5,150,105,0.1)", color: ACCENT, marginBottom: 16,
                }}>
                  {lines.filter((l) => l.itemName.trim()).length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "rgba(5,150,105,0.08)", color: ACCENT, border: "none",
              }}
            >
              <Plus size={13} />
              เพิ่มรายการ
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 780, fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  {[
                    { label: "ชื่อสินค้า *", w: "30%", align: "left" },
                    { label: "จำนวน", w: "10%", align: "center" },
                    { label: "หน่วย", w: "12%", align: "left" },
                    { label: "ราคา/หน่วย", w: "13%", align: "right" },
                    { label: "ยอดรวม (incl)", w: "15%", align: "right" },
                    { label: "หมายเหตุ", w: "15%", align: "left" },
                    { label: "", w: "5%", align: "center" },
                  ].map((col, i) => (
                    <th key={i} style={{
                      width: col.w, textAlign: col.align as React.CSSProperties["textAlign"],
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
                {lines.map((line, idx) => {
                  const c = calcLine(line);
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                      <td style={{ padding: "8px 6px 8px 0" }}>
                        <Combobox
                          options={itemOptions.map((i) => i.name)}
                          value={line.itemName}
                          onChange={(v) => autoFillItem(idx, v)}
                          placeholder="ชื่อสินค้า"
                          emptyMessage={header.supplierName && supplierItems.length === 0
                            ? "ไม่มีรายการสินค้าจากร้านค้านี้ในระบบ — กรอกชื่อสินค้าเองได้เลย"
                            : undefined}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <FocusInput
                          type="number"
                          min="0"
                          step="any"
                          style={{ textAlign: "center" }}
                          value={line.qty}
                          onChange={(e) => setLine(idx, { qty: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <UnitSelect value={line.unit} onChange={(v) => setLine(idx, { unit: v })} />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <FocusInput
                          type="number"
                          min="0"
                          step="any"
                          style={{ textAlign: "right" }}
                          value={line.priceExclVat}
                          onChange={(e) => setLine(idx, { priceExclVat: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right" }}>
                        {c.totalIncl > 0 ? (
                          <span style={{ fontWeight: 700, color: "#1C1815", fontVariantNumeric: "tabular-nums" }}>
                            {fmt(c.totalIncl)}
                          </span>
                        ) : (
                          <span style={{ color: "#C4B9AD" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <FocusInput
                          value={line.itemNote}
                          onChange={(e) => setLine(idx, { itemNote: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "center" }}>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
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

        {/* Summary Card */}
        <Card>
          <SectionHeader>สรุปยอด</SectionHeader>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, flex: 1 }}>
              <div>
                <Label>ค่ามัดจำ (บาท)</Label>
                <FocusInput
                  type="number" min="0" step="any"
                  style={{ textAlign: "right" }}
                  placeholder="0.00"
                  value={header.deposit}
                  onChange={(e) => setHeader({ ...header, deposit: e.target.value })}
                />
              </div>
              <div>
                <Label>ค่าขนส่ง (บาท)</Label>
                <FocusInput
                  type="number" min="0" step="any"
                  style={{ textAlign: "right" }}
                  placeholder="0.00"
                  value={header.shipping}
                  onChange={(e) => setHeader({ ...header, shipping: e.target.value })}
                />
              </div>
              <div>
                <Label>ส่วนลด (บาท)</Label>
                <FocusInput
                  type="number" min="0" step="any"
                  style={{ textAlign: "right" }}
                  placeholder="0.00"
                  value={header.discount}
                  onChange={(e) => setHeader({ ...header, discount: e.target.value })}
                />
              </div>
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
                {shipping > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#5C5450" }}>
                    <span>ค่าขนส่ง</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>+{fmt(shipping)} ฿</span>
                  </div>
                )}
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#5C5450" }}>
                    <span>ส่วนลด</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: "#EF4444" }}>−{fmt(discount)} ฿</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "#1C1815", paddingTop: 12, borderTop: "2px solid rgba(0,0,0,0.06)", marginTop: 4 }}>
                  <span>รวมเป็นเงิน</span>
                  <span style={{ color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{fmt(grandTotal)} ฿</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 4 }}>
          <Link
            href="/po"
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
              <>บันทึก PO <kbd style={{ fontSize: 10, fontFamily: "monospace", background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: 6 }}>⌘↵</kbd></>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
