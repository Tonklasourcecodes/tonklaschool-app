"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { Sprout, UserCheck } from "lucide-react";

export default function SetupNamePage() {
  const { data: session, update } = useSession();
  const [people, setPeople] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/people").then((r) => r.json()).then((d) => setPeople(d.people ?? []));
  }, []);

  const filtered = people.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit() {
    if (!selected) { setError("กรุณาเลือกชื่อของคุณ"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/setup-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? `เกิดข้อผิดพลาด (${res.status})`);
        return;
      }
      // Update JWT immediately so approverName is available without requiring re-login
      await update({ approverName: selected });
      window.location.href = "/";
    } catch (err) {
      alert(`Error: ${String(err)}`);
      setError(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : "กรุณาลองใหม่"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #34d399 0%, #059669 100%)" }}
          >
            <Sprout size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: "var(--text)" }}>ต้นกล้า จัดซื้อ</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>ระบบจัดซื้อจัดจ้าง</div>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={18} style={{ color: "#059669" }} />
            <h1 className="font-bold text-base" style={{ color: "var(--text)" }}>ระบุชื่อของคุณ</h1>
          </div>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            เลือกชื่อของคุณจากรายการบุคลากร เพื่อรับการแจ้งเตือนและอนุมัติรายการ
          </p>
          <p className="text-xs mb-5 px-3 py-2 rounded-lg" style={{ background: "rgba(5,150,105,0.08)", color: "#065f46" }}>
            Login ด้วย: <strong>{session?.user?.email}</strong>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                ค้นหาชื่อ
              </label>
              <input
                type="text"
                placeholder="พิมพ์ชื่อ หรือชื่อเล่น..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                เลือกชื่อของคุณ {selected && <span style={{ color: "#059669" }}>✓</span>}
              </label>
              <div
                className="rounded-xl overflow-y-auto"
                style={{
                  maxHeight: 220,
                  border: "1px solid var(--border)",
                  background: "var(--input-bg)",
                }}
              >
                {filtered.length === 0 ? (
                  <p className="text-xs px-3 py-3" style={{ color: "var(--text-secondary)" }}>ไม่พบชื่อที่ค้นหา</p>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelected(p)}
                      className="w-full text-left px-3 py-2 text-sm transition-colors"
                      style={{
                        background: selected === p ? "rgba(5,150,105,0.12)" : "transparent",
                        color: selected === p ? "#059669" : "var(--text)",
                        fontWeight: selected === p ? 600 : 400,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {p}
                    </button>
                  ))
                )}
              </div>
            </div>

            {selected && (
              <div className="text-sm px-3 py-2 rounded-xl" style={{ background: "rgba(5,150,105,0.08)", color: "#065f46" }}>
                เลือกแล้ว: <strong>{selected}</strong>
              </div>
            )}

            {error && (
              <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !selected}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity"
              style={{
                background: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
                color: "white",
                opacity: (saving || !selected) ? 0.5 : 1,
              }}
            >
              {saving ? "กำลังบันทึก..." : "ยืนยันชื่อและเข้าสู่ระบบ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
