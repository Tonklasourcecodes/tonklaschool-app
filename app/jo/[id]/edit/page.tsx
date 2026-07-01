"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Hammer, Save, Loader2 } from "lucide-react";

import type { JO } from "@/lib/types-po";

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
  "w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all";

export default function JOEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const joNumber = id.replace(/~/g, "/");

  const [jo, setJo] = useState<JO | null>(null);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    supplierName: "",
    startDate: "",
    endDate: "",
    location: "",
    deposit: "",
    requester: "",
    department: "",
    approver: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/people").then((r) => r.json()).then((d) => setPeople(d.people ?? []));
    fetch(`/api/jo/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setJo(d.jo);
        setForm({
          supplierName: d.jo.supplierName ?? "",
          startDate: d.jo.startDate ?? "",
          endDate: d.jo.endDate ?? "",
          location: d.jo.location ?? "",
          deposit: d.jo.deposit ?? "",
          requester: d.jo.requester ?? "",
          department: d.jo.department ?? "",
          approver: d.jo.approver ?? "",
          notes: d.jo.notes ?? "",
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
      const res = await fetch(`/api/jo/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccess(true);
      setTimeout(() => router.push(`/jo/${id}`), 1200);
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

  if (error && !jo) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/jo" className="text-sm text-violet-600 hover:underline mt-2 inline-block">
          ← กลับรายการ
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link
          href={`/jo/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft size={16} />
          กลับ {joNumber}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Hammer size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">แก้ไข {joNumber}</h1>
            <p className="text-sm text-slate-500">แก้ไขข้อมูลใบจ้าง</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            ข้อมูลงานจ้าง
          </h2>
          <Field label="ผู้รับจ้าง / ชื่อบริษัท">
            <input className={inputCls} value={form.supplierName} onChange={set("supplierName")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="วันที่เริ่มงาน">
              <input type="date" className={inputCls} value={form.startDate} onChange={set("startDate")} />
            </Field>
            <Field label="วันที่สิ้นสุด">
              <input type="date" className={inputCls} value={form.endDate} onChange={set("endDate")} />
            </Field>
          </div>
          <Field label="สถานที่">
            <input className={inputCls} value={form.location} onChange={set("location")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ผู้จ้าง">
              <input className={inputCls} value={form.requester} onChange={set("requester")} />
            </Field>
            <Field label="แผนก">
              <input className={inputCls} value={form.department} onChange={set("department")} />
            </Field>
          </div>
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
            การเงิน
          </h2>
          <Field label="ค่ามัดจำ (฿)">
            <input
              type="number"
              className={inputCls}
              value={form.deposit}
              onChange={set("deposit")}
              placeholder="0"
            />
          </Field>
          <p className="text-xs text-slate-400">มูลค่างานคำนวณจากรายการจ้างอัตโนมัติ</p>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-700">
            บันทึกสำเร็จแล้ว กำลังกลับหน้าหลัก...
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link
            href={`/jo/${id}`}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={saving || success}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-all"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </form>
    </main>
  );
}
