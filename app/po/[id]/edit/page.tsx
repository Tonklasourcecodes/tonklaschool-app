"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Save, Loader2 } from "lucide-react";

import type { PO } from "@/lib/types-po";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all";

export default function POEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const poNumber = id.replace(/~/g, "/");

  const [po, setPo] = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    supplierName: "",
    requester: "",
    approver: "",
    deposit: "",
    shipping: "",
    discount: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/people").then((r) => r.json()).then((d) => setPeople(d.people ?? []));
    fetch(`/api/po/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPo(d.po);
        setForm({
          supplierName: d.po.supplierName ?? "",
          requester: d.po.requester ?? "",
          approver: d.po.approver ?? "",
          deposit: d.po.deposit ?? "",
          shipping: d.po.shipping ?? "",
          discount: d.po.discount ?? "",
          notes: d.po.notes ?? "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/po/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccess(true);
      setTimeout(() => router.push(`/po/${id}`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-sm text-slate-400">กำลังโหลด...</div>
      </main>
    );
  }

  if (error && !po) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/po" className="text-sm text-emerald-600 hover:underline mt-2 inline-block">
          ← กลับรายการ
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link
          href={`/po/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft size={16} />
          กลับ {poNumber}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <FileText size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">แก้ไข {poNumber}</h1>
            <p className="text-sm text-slate-500">แก้ไขข้อมูล PO (รายการสินค้าแก้ไขในชีตโดยตรง)</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            ข้อมูลการสั่งซื้อ
          </h2>
          <Field label="ร้านค้า / ผู้จัดหา">
            <input className={inputCls} value={form.supplierName} onChange={set("supplierName")} />
          </Field>
          <Field label="ผู้สั่งซื้อ">
            <input className={inputCls} value={form.requester} onChange={set("requester")} />
          </Field>
          <Field label="ผู้อนุมัติ">
            <select className={inputCls} value={form.approver} onChange={set("approver")}>
              <option value="">— ไม่ระบุ —</option>
              {people.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="หมายเหตุ">
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.notes}
              onChange={set("notes")}
            />
          </Field>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            ค่าใช้จ่ายเพิ่มเติม
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Field label="ค่ามัดจำ (฿)">
              <input
                type="number"
                className={inputCls}
                value={form.deposit}
                onChange={set("deposit")}
                placeholder="0"
              />
            </Field>
            <Field label="ค่าขนส่ง (฿)">
              <input
                type="number"
                className={inputCls}
                value={form.shipping}
                onChange={set("shipping")}
                placeholder="0"
              />
            </Field>
            <Field label="ส่วนลด (฿)">
              <input
                type="number"
                className={inputCls}
                value={form.discount}
                onChange={set("discount")}
                placeholder="0"
              />
            </Field>
          </div>
          <p className="text-xs text-slate-400">
            ยอดสุทธิ = ยอดสินค้า + ค่าขนส่ง − ส่วนลด (คำนวณอัตโนมัติ)
          </p>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
            บันทึกสำเร็จแล้ว กำลังกลับหน้าหลัก...
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link
            href={`/po/${id}`}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={saving || success}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-all"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </form>
    </main>
  );
}
