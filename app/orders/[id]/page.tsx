"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, ShoppingCart, CheckCircle2, XCircle, Clock, Loader2, Package } from "lucide-react";
import type { MonthlyOrder, MonthlyOrderItem } from "@/lib/monthly-order-types";

const STATUS_META = {
  draft:    { label:"ร่าง",         color:"#92400E", bg:"#FEF3C7", Icon: Clock },
  pending:  { label:"รออนุมัติ",    color:"#D97706", bg:"#FFF7ED", Icon: Clock },
  approved: { label:"อนุมัติแล้ว",  color:"#059669", bg:"#ECFDF5", Icon: CheckCircle2 },
  rejected: { label:"ไม่อนุมัติ",   color:"#DC2626", bg:"#FEF2F2", Icon: XCircle },
};

const ACCENT = "#0369A1";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [order, setOrder] = useState<MonthlyOrder & { items?: MonthlyOrderItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetch(`/api/monthly-orders/${id}`)
      .then(r => r.json())
      .then(d => setOrder(d.order ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove(status: "approved" | "rejected") {
    if (!order) return;
    setActing(true);
    const res = await fetch(`/api/monthly-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) setOrder(data.order);
    setActing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background:"var(--bg)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color:"var(--subtle)" }}/>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background:"var(--bg)" }}>
        <div className="card p-12 text-center">
          <p style={{ color:"var(--subtle)" }}>ไม่พบรายการ</p>
          <Link href="/orders" style={{ color: ACCENT, fontSize:13, marginTop:12, display:"block" }}>← กลับ</Link>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[order.status];
  const { Icon: StatusIcon } = meta;
  const items = order.items ?? [];

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)" }}>
      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid var(--border)", padding:"16px 24px" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/orders" style={{ color:"var(--subtle)", display:"flex" }}><ChevronLeft size={18}/></Link>
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} style={{ color: ACCENT }}/>
                <h1 style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--text)" }}>
                  {order.department} · {order.order_month} {order.order_year}
                </h1>
              </div>
              <span style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, color:meta.color, background:meta.bg }}>
                <StatusIcon size={11}/> {meta.label}
              </span>
            </div>
            {/* Admin approve / reject */}
            {role === "admin" && order.status === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => handleApprove("rejected")} disabled={acting}
                  style={{ padding:"6px 14px", borderRadius:10, fontSize:12, fontWeight:600,
                    background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA", cursor:"pointer" }}>
                  ไม่อนุมัติ
                </button>
                <button onClick={() => handleApprove("approved")} disabled={acting}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:10, fontSize:12, fontWeight:700,
                    background:"linear-gradient(135deg,#059669,#10B981)", color:"white", border:"none", cursor:"pointer" }}>
                  {acting && <Loader2 size={12} className="animate-spin"/>} อนุมัติ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {/* Info card */}
        <div className="card p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label:"ผู้ขอ", value: order.requester_name },
            { label:"อีเมล", value: order.requester_email },
            { label:"ยอดรวม", value: `฿${order.total_amount.toLocaleString()}` },
            { label:"สร้างเมื่อ", value: new Date(order.created_at).toLocaleDateString("th-TH") },
            ...(order.approver_name ? [{ label:"ผู้อนุมัติ", value: order.approver_name }] : []),
            ...(order.approved_at ? [{ label:"อนุมัติเมื่อ", value: new Date(order.approved_at).toLocaleDateString("th-TH") }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize:10, fontWeight:600, color:"var(--subtle)", letterSpacing:"0.05em", marginBottom:3 }}>{label.toUpperCase()}</p>
              <p style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{value}</p>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="card p-4" style={{ background:"#FFFBEB", border:"1px solid #FDE68A" }}>
            <p style={{ fontSize:12, fontWeight:600, color:"#92400E", marginBottom:3 }}>หมายเหตุ</p>
            <p style={{ fontSize:13, color:"#78350F" }}>{order.notes}</p>
          </div>
        )}

        {/* Items table */}
        <div className="card overflow-hidden">
          <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
            <Package size={15} style={{ color: ACCENT }}/>
            <h2 style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>รายการสินค้า ({items.length} รายการ)</h2>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"var(--bg)" }}>
                  {["ชื่อสินค้า","ร้านค้า","จำนวน","หน่วย","ราคา/หน่วย","รวม"].map(h => (
                    <th key={h} style={{ padding:"8px 14px", textAlign:"left", fontWeight:600, color:"var(--subtle)", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} style={{ borderTop:`1px solid var(--border)`, background: i%2===0 ? "white" : "var(--bg)" }}>
                    <td style={{ padding:"9px 14px", fontWeight:600, color:"var(--text)" }}>{item.item_name}</td>
                    <td style={{ padding:"9px 14px", color:"var(--muted)" }}>{item.store}</td>
                    <td style={{ padding:"9px 14px", color:"var(--muted)" }}>{item.quantity}</td>
                    <td style={{ padding:"9px 14px", color:"var(--muted)" }}>{item.unit}</td>
                    <td style={{ padding:"9px 14px", color:"var(--muted)" }}>฿{item.unit_price.toLocaleString()}</td>
                    <td style={{ padding:"9px 14px", fontWeight:700, color:"var(--text)" }}>฿{item.total_price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid var(--border)`, background:"var(--bg)" }}>
                  <td colSpan={5} style={{ padding:"10px 14px", fontWeight:700, color:"var(--text)", textAlign:"right" }}>ยอดรวมทั้งสิ้น</td>
                  <td style={{ padding:"10px 14px", fontWeight:800, fontSize:15, color: ACCENT }}>฿{order.total_amount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Submit for approval button (if draft) */}
        {order.status === "draft" && order.requester_email === session?.user?.email && (
          <button onClick={async () => {
            setActing(true);
            const res = await fetch(`/api/monthly-orders/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "pending" }),
            });
            if (res.ok) { const d = await res.json(); setOrder(d.order); }
            setActing(false);
          }} disabled={acting}
            style={{ width:"100%", padding:"12px", borderRadius:12, fontSize:13, fontWeight:700,
              background:`linear-gradient(135deg,${ACCENT},#0284C7)`, color:"white", border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            {acting && <Loader2 size={14} className="animate-spin"/>}
            ส่งขออนุมัติ
          </button>
        )}
      </div>
    </div>
  );
}
