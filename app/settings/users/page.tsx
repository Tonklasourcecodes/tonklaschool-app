"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Shield, Users } from "lucide-react";
import type { RoleEntry } from "@/lib/roles";


export default function UsersSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "approver">("approver");
  const [lineUserId, setLineUserId] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if ((session?.user as { role?: string })?.role !== "admin") {
      router.replace("/");
      return;
    }
    fetch("/api/roles")
      .then((r) => r.json())
      .then((d) => setRoles(d.roles ?? []))
      .finally(() => setLoading(false));
    fetch("/api/people").then((r) => r.json()).then((d) => setPeople(d.people ?? []));
  }, [session, status, router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, name, lineUserId }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "เกิดข้อผิดพลาด");
      setRoles((prev) => [...prev, { email: email.toLowerCase().trim(), role, name, lineUserId }]);
      setEmail("");
      setName("");
      setRole("approver");
      setLineUserId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(targetEmail: string) {
    try {
      await fetch("/api/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      setRoles((prev) => prev.filter((r) => r.email !== targetEmail));
    } catch {
      // ignore
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-2xl skeleton" />)}
      </div>
    );
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ECFDF5" }}>
          <Shield size={18} style={{ color: "#16A34A" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#111110" }}>จัดการสิทธิ์ผู้ใช้</h1>
          <p className="text-sm" style={{ color: "#A8A29E" }}>เพิ่ม/ลบ admin และผู้อนุมัติ</p>
        </div>
      </div>

      {/* Add form */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "#57534E" }}>
          <UserPlus size={14} />
          เพิ่มผู้ใช้
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">อีเมล Google *</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">ชื่อ *</label>
              <input
                required
                list="people-opts"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="พิมพ์ค้นหาหรือเลือกจากรายการ"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <datalist id="people-opts">
                {people.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">บทบาท *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "approver")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="approver">ผู้อนุมัติ (approver) — อนุมัติ PO/JO ได้</option>
              <option value="admin">ผู้ดูแลระบบ (admin) — อนุมัติ + จัดการสิทธิ์</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">LINE User ID (สำหรับแจ้งเตือนอนุมัติ)</label>
            <input
              value={lineUserId}
              onChange={(e) => setLineUserId(e.target.value)}
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 font-mono"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {adding ? "กำลังเพิ่ม..." : "เพิ่มผู้ใช้"}
          </button>
        </form>
      </section>

      {/* Current roles */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Users size={14} style={{ color: "#A8A29E" }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#A8A29E" }}>
            บัญชีที่มีสิทธิ์พิเศษ ({roles.length})
          </span>
        </div>
        {roles.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "#B4A99E" }}>ยังไม่มีข้อมูล</p>
        ) : (
          roles.map((r) => (
            <div
              key={r.email}
              className="flex items-center gap-4 px-5 py-3.5"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "#1C1917" }}>{r.name}</p>
                <p className="text-xs" style={{ color: "#A8A29E" }}>{r.email}</p>
                {r.lineUserId && (
                  <p className="text-xs font-mono mt-0.5" style={{ color: "#10B981" }}>
                    LINE ✓
                  </p>
                )}
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                style={{
                  background: r.role === "admin" ? "#ECFDF5" : "#EFF6FF",
                  color: r.role === "admin" ? "#15803D" : "#1D4ED8",
                }}
              >
                {r.role === "admin" ? "Admin" : "Approver"}
              </span>
              <button
                onClick={() => handleRemove(r.email)}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-50 shrink-0"
                style={{ color: "#D4C8BC" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#D4C8BC"; }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </section>

      <p className="mt-5 text-xs" style={{ color: "#B4A99E" }}>
        พนักงาน @tonkla.ac.th เข้าระบบได้อัตโนมัติในฐานะ worker ไม่ต้องเพิ่มที่นี่
      </p>
    </main>
  );
}
