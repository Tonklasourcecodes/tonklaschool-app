"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sprout, UserCheck, Search } from "lucide-react";

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

  const filtered = people.filter((p) => p.toLowerCase().includes(search.toLowerCase()));

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
        setSaving(false);
        return;
      }
      await update({ approverName: selected });
      window.location.href = "/";
    } catch (err) {
      setError(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : "กรุณาลองใหม่"}`);
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F0EDE9", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: "linear-gradient(135deg,#34d399,#059669)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21,
            boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
          }}>🌱</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#1C1815", letterSpacing: "-0.02em" }}>ต้นกล้า</div>
            <div style={{ fontSize: 10, color: "#059669", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>TONKLA SCHOOL</div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: 24, padding: 28, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <UserCheck size={15} style={{ color: "#059669" }} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: "#1C1815", letterSpacing: "-0.02em" }}>ระบุชื่อของคุณ</h1>
          </div>
          <p style={{ fontSize: 13, color: "#9C9289", marginBottom: 16, lineHeight: 1.5 }}>
            เลือกชื่อของคุณจากรายชื่อบุคลากร เพื่อให้ระบบจับคู่รายการที่รออนุมัติและการแจ้งเตือนให้ถูกคน
          </p>
          <p style={{ fontSize: 12, marginBottom: 20, padding: "10px 14px", borderRadius: 12, background: "#ECFDF5", color: "#065f46" }}>
            เข้าสู่ระบบด้วย <strong>{session?.user?.email}</strong>
          </p>

          {/* Search */}
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5C5450", marginBottom: 6 }}>ค้นหาชื่อ</label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#B4A99E" }} />
            <input
              type="text"
              placeholder="พิมพ์ชื่อ หรือชื่อเล่น..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "11px 14px 11px 38px", borderRadius: 12,
                border: "1.5px solid rgba(0,0,0,0.08)", fontSize: 14, outline: "none",
                background: "white", color: "#1C1815", boxSizing: "border-box",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#059669"; e.target.style.boxShadow = "0 0 0 3px rgba(5,150,105,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.08)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* List */}
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5C5450", marginBottom: 6 }}>
            เลือกชื่อของคุณ {selected && <span style={{ color: "#059669" }}>✓</span>}
          </label>
          <div style={{ maxHeight: 220, overflowY: "auto", borderRadius: 14, border: "1.5px solid rgba(0,0,0,0.08)", marginBottom: 16 }}>
            {filtered.length === 0 ? (
              <p style={{ fontSize: 12, color: "#B4A99E", padding: "14px" }}>ไม่พบชื่อที่ค้นหา</p>
            ) : (
              filtered.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelected(p)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 14px", fontSize: 13, cursor: "pointer",
                    border: "none", borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                    background: selected === p ? "#ECFDF5" : "transparent",
                    color: selected === p ? "#059669" : "#1C1815",
                    fontWeight: selected === p ? 700 : 500,
                  }}
                >
                  {p}
                </button>
              ))
            )}
          </div>

          {selected && (
            <div style={{ fontSize: 13, padding: "10px 14px", borderRadius: 12, background: "#ECFDF5", color: "#065f46", marginBottom: 16 }}>
              เลือกแล้ว: <strong>{selected}</strong>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 13, color: "#DC2626", marginBottom: 12 }}>{error}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !selected}
            style={{
              width: "100%", padding: "13px", borderRadius: 14, border: "none",
              fontSize: 14, fontWeight: 800, color: "white", cursor: (saving || !selected) ? "not-allowed" : "pointer",
              background: "#059669", opacity: (saving || !selected) ? 0.45 : 1,
              boxShadow: (saving || !selected) ? "none" : "0 4px 16px rgba(5,150,105,0.3)",
            }}
          >
            {saving ? "กำลังบันทึก..." : "ยืนยันชื่อและเข้าสู่ระบบ"}
          </button>
        </div>
      </div>
    </div>
  );
}
