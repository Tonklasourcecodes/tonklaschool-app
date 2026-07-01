"use client";

import { useEffect, useState } from "react";

interface Props {
  show: boolean;
  type?: "approve" | "reject";
}

export default function ApproveSuccess({ show, type = "approve" }: Props) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    if (!show) { setVisible(false); return; }
    setVisible(true);
    setPhase("in");
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 1600);
    const t3 = setTimeout(() => setVisible(false), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [show]);

  if (!visible) return null;

  const isApprove = type === "approve";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      style={{
        background: "rgba(0,0,0,0.18)",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.4s ease" : "none",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 28,
          padding: "40px 56px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
          transform: phase === "in" ? "scale(0.7) translateY(16px)" : "scale(1) translateY(0)",
          opacity: phase === "in" ? 0 : 1,
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
        }}
      >
        {/* Circle icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: isApprove
              ? "linear-gradient(135deg, #34d399, #059669)"
              : "linear-gradient(135deg, #f87171, #dc2626)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isApprove
              ? "0 12px 32px rgba(5,150,105,0.35)"
              : "0 12px 32px rgba(220,38,38,0.3)",
            transform: phase === "hold" ? "scale(1)" : "scale(0.85)",
            transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            {isApprove ? (
              <path
                d="M10 20L17 27L30 13"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 30,
                  strokeDashoffset: phase === "hold" ? 0 : 30,
                  transition: "stroke-dashoffset 0.4s ease 0.1s",
                }}
              />
            ) : (
              <>
                <path d="M13 13L27 27" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M27 13L13 27" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
              </>
            )}
          </svg>
        </div>

        {/* Text */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.35rem",
              fontWeight: 800,
              color: isApprove ? "#15803D" : "#DC2626",
              letterSpacing: "-0.01em",
            }}
          >
            {isApprove ? "อนุมัติสำเร็จ" : "ไม่อนุมัติ"}
          </p>
          <p style={{ fontSize: 13, color: "#A8A29E", marginTop: 4 }}>
            {isApprove ? "บันทึกลงระบบเรียบร้อยแล้ว" : "บันทึกสถานะเรียบร้อยแล้ว"}
          </p>
        </div>
      </div>
    </div>
  );
}
