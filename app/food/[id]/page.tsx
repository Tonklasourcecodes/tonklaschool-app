"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, CheckCircle, XCircle, Package, Loader2 } from "lucide-react";
import type { FoodOrder, FoodOrderStatus } from "@/lib/types";

const STATUS_TH: Record<FoodOrderStatus, string> = {
  draft: "ร่าง", pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ", received: "รับของแล้ว",
};
const STATUS_COLOR: Record<FoodOrderStatus, { color: string; bg: string }> = {
  draft:    { color:"#92400E", bg:"#FEF3C7" },
  pending:  { color:"#D97706", bg:"#FFF7ED" },
  approved: { color:"#059669", bg:"#ECFDF5" },
  rejected: { color:"#DC2626", bg:"#FEF2F2" },
  received: { color:"#7C3AED", bg:"#F5F3FF" },
};

export default function FoodOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;
  const [order, setOrder] = useState<FoodOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/food/${id}`)
      .then(r => r.json())
      .then(d => setOrder(d.order ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: FoodOrderStatus) {
    setActing(status);
    try {
      const res = await fetch(`/api/food/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (res.ok) { setOrder(d.order); router.refresh(); }
    } finally { setActing(null); }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background:"var(--bg)" }}>
        <Loader2 size={28} className="animate-spin" style={{ color:"var(--subtle)" }} />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background:"var(--bg)" }}>
        <p style={{ color:"var(--muted)" }}>ไม่พบรายการ</p>
        <Link href="/food" style={{ marginTop:12, color:"var(--food-accent)", fontSize:14 }}>กลับหน้ารายการ</Link>
      </div>
    );
  }

  const { color, bg } = STATUS_COLOR[order.status];
  const canApprove = (role === "admin" || role === "kitchen_staff") && order.status === "pending";
  const canReceive = (role === "admin" || role === "kitchen_staff") && order.status === "approved";
  const canSubmit = order.status === "draft";

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)" }}>
      <div style={{ background:"white", borderBottom:"1px solid var(--border)", padding:"16px 24px" }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/food" style={{ color:"var(--subtle)", display:"flex", alignItems:"center" }}>
            <ChevronLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--text)" }}>{order.order_number}</h1>
          </div>
          <span style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600, color, background:bg }}>
            {STATUS_TH[order.status]}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {/* Info */}
        <div className="card p-5">
          <h2 style={{ fontSize:11, fontWeight:700, color:"var(--subtle)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>ข้อมูลใบสั่ง</h2>
          <div className="grid grid-cols-2 gap-y-3">
            {(
              [
                ["ผู้สั่ง", order.requester_name],
                ["วันที่", new Date(order.order_date).toLocaleDateString("th-TH", { weekday:"short", year:"numeric", month:"long", day:"numeric" })],
                order.approver_name ? ["ผู้อนุมัติ", order.approver_name] : null,
                order.notes ? ["หมายเหตุ", order.notes] : null,
              ] as ([string, string] | null)[]
            ).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize:11, color:"var(--subtle)", marginBottom:2 }}>{k}</p>
                <p style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="card p-5">
          <h2 style={{ fontSize:11, fontWeight:700, color:"var(--subtle)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>รายการวัตถุดิบ</h2>
          <div className="space-y-2">
            {(order.items ?? []).map(it => (
              <div key={it.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background:"var(--bg)" }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{it.ingredient_name}</p>
                  <p style={{ fontSize:11, color:"var(--subtle)" }}>{it.qty} {it.unit} × ฿{it.unit_price}</p>
                </div>
                <p style={{ fontSize:13, fontWeight:700, color:"var(--food-accent)" }}>฿{it.total_price.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, padding:"10px 14px", borderRadius:12, background:"var(--food-light)", display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:600, color:"var(--food-accent)" }}>ยอดรวม</span>
            <span style={{ fontSize:"1.2rem", fontWeight:800, color:"var(--food-accent)" }}>฿{order.total_amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        {(canApprove || canReceive || canSubmit) && (
          <div className="card p-5">
            <div className="flex gap-3 flex-wrap">
              {canSubmit && (
                <button onClick={() => updateStatus("pending")} disabled={!!acting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#059669,#10b981)", color:"white", border:"none", cursor:"pointer" }}>
                  {acting === "pending" && <Loader2 size={13} className="animate-spin" />}
                  ส่งขออนุมัติ
                </button>
              )}
              {canApprove && (
                <>
                  <button onClick={() => updateStatus("approved")} disabled={!!acting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                    style={{ background:"linear-gradient(135deg,#059669,#10b981)", color:"white", border:"none", cursor:"pointer" }}>
                    {acting === "approved" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={15} />}
                    อนุมัติ
                  </button>
                  <button onClick={() => updateStatus("rejected")} disabled={!!acting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                    style={{ background:"white", color:"#DC2626", border:"1px solid #FECACA", cursor:"pointer" }}>
                    {acting === "rejected" ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={15} />}
                    ไม่อนุมัติ
                  </button>
                </>
              )}
              {canReceive && (
                <button onClick={() => updateStatus("received")} disabled={!!acting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#7C3AED,#6D28D9)", color:"white", border:"none", cursor:"pointer" }}>
                  {acting === "received" ? <Loader2 size={13} className="animate-spin" /> : <Package size={15} />}
                  ยืนยันรับของ
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
