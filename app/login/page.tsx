"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg,#051A0C 0%,#0A3320 55%,#061C0E 100%)" }}>
      {/* Dot texture */}
      <div style={{ position:"fixed", inset:0, opacity:0.05, backgroundImage:"radial-gradient(circle,#34d399 1px,transparent 1px)", backgroundSize:"22px 22px", pointerEvents:"none" }} />
      <div className="relative">
        <div className="card p-10 flex flex-col items-center gap-6 w-80 text-center">
          {/* School logo placeholder */}
          <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#059669,#047857)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:28 }}>🌱</span>
          </div>
          <div>
            <h1 style={{ fontWeight:800, fontSize:"1.4rem", color:"#1C1917", letterSpacing:"-0.02em", marginBottom:6 }}>
              โรงเรียนต้นกล้า
            </h1>
            <p style={{ fontSize:13, color:"#A8A29E" }}>ระบบจัดการภายใน</p>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background:"white", border:"1px solid rgba(0,0,0,0.1)", color:"#1C1917", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>

          <p style={{ fontSize:11, color:"#C4B9AD" }}>
            เฉพาะบุคลากรโรงเรียนต้นกล้าเท่านั้น
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
