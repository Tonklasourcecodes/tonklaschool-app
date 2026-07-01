"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PO, POOrder } from "@/lib/types-po";

function bahtText(amount: number): string {
  if (amount === 0) return "ศูนย์บาทถ้วน";
  const ones = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const tens = ["", "สิบ", "ยี่สิบ", "สามสิบ", "สี่สิบ", "ห้าสิบ", "หกสิบ", "เจ็ดสิบ", "แปดสิบ", "เก้าสิบ"];
  const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  function chunk(n: number): string {
    if (n === 0) return "";
    let result = "";
    const digits = String(n).split("").map(Number);
    const len = digits.length;
    for (let i = 0; i < len; i++) {
      const d = digits[i];
      const pos = len - 1 - i;
      if (d === 0) continue;
      if (pos === 1 && d === 1) result += "สิบ";
      else if (pos === 1 && d === 2) result += "ยี่สิบ";
      else if (pos === 1) result += ones[d] + "สิบ";
      else if (pos === 0) result += ones[d];
      else result += ones[d] + positions[pos];
    }
    return result;
  }

  const bahtAmt = Math.floor(amount);
  const satang = Math.round((amount - bahtAmt) * 100);
  const millions = Math.floor(bahtAmt / 1000000);
  const remainder = bahtAmt % 1000000;

  let text = "";
  if (millions > 0) text += chunk(millions) + "ล้าน";
  text += chunk(remainder);
  text += "บาท";
  if (satang > 0) text += chunk(satang) + "สตางค์";
  else text += "ถ้วน";
  return text;
}

function fmt(val: string) {
  const n = parseFloat((val ?? "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(val: string) {
  if (!val) return "—";
  // Try to parse dd/mm/yyyy or yyyy-mm-dd
  const parts = val.includes("/") ? val.split("/") : val.split("-");
  if (parts.length !== 3) return val;
  const thMonths = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  let day: number, month: number, year: number;
  if (val.includes("/")) {
    [day, month, year] = parts.map(Number);
  } else {
    [year, month, day] = parts.map(Number);
  }
  const thYear = year < 2500 ? year + 543 : year;
  return `${day} ${thMonths[month] ?? ""} ${thYear}`;
}

export default function POPrintPage() {
  const { id } = useParams<{ id: string }>();
  const poNumber = id.replace(/~/g, "/");

  const [po, setPo] = useState<PO | null>(null);
  const [orders, setOrders] = useState<POOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/po/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setPo(d.po);
        setOrders(d.orders ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && po) setTimeout(() => window.print(), 500);
  }, [loading, po]);

  if (loading || !po) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400 text-sm">
        กำลังโหลด...
      </div>
    );
  }

  const grandTotal = parseFloat(po.grandTotal.replace(/,/g, "")) || 0;
  const deposit = parseFloat(po.deposit.replace(/,/g, "")) || 0;
  const remaining = grandTotal - deposit;

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans Thai', 'TH Sarabun New', sans-serif; font-size: 14px; color: #1a1a1a; background: #e5e7eb; }
        @media print {
          @page { size: A4; margin: 12mm 15mm 15mm 20mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .page { box-shadow: none; margin: 0; padding: 0; }
        }
        .page { max-width: 794px; margin: 0 auto; background: white; padding: 32px 40px 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #374151; padding: 4px 8px; }
        th { background: #f3f4f6; font-weight: 600; text-align: center; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#1e293b', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>ตัวอย่างก่อนพิมพ์ — {poNumber}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.history.back()}
            style={{ padding: '6px 16px', fontSize: 13, color: '#cbd5e1', background: 'transparent', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }}>
            ← กลับ
          </button>
          <button onClick={() => window.print()}
            style={{ padding: '6px 16px', fontSize: 13, color: 'white', background: '#059669', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      <div className="no-print" style={{ height: 16 }} />

      {/* A4 Document */}
      <div className="page">

        {/* School Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', fontStyle: 'italic' }}>Tonkla School</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Ministry of Happiness</div>
        </div>
        <hr style={{ borderTop: '1.5px solid #374151', marginBottom: 6 }} />

        <div style={{ textAlign: 'center', marginBottom: 2 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>ใบอนุมัติสั่งซื้อ</div>
          {po.supplierName && (
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 1 }}>{po.supplierName}</div>
          )}
          <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
            โรงเรียนต้นกล้า 292-292/1 หมู่ 6 ถ.เชียงใหม่-แม่โจ้ ต.หนองจ้อม อ.สันทราย จ.เชียงใหม่ 50210
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0 2px', fontSize: 14 }}>
          <div><span style={{ fontWeight: 600 }}>เลขที่สั่งซื้อ : </span>{poNumber}</div>
          <div><span style={{ fontWeight: 600 }}>วันที่สั่งซื้อ : </span>{fmtDate(po.orderDate)}</div>
        </div>
        <div style={{ fontSize: 14, marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>ชื่อผู้สั่งซื้อ : </span>{po.requester || "—"}
        </div>

        {/* Items table */}
        <div style={{ marginBottom: 3, fontSize: 14, fontWeight: 700, textAlign: 'center' }}>รายการสั่งซื้อ</div>
        <table style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>ลำดับ</th>
              <th>ชื่อสินค้า</th>
              <th style={{ width: 52 }}>จำนวน</th>
              <th style={{ width: 52 }}>หน่วย</th>
              <th style={{ width: 90 }}>ราคา/หน่วย</th>
              <th style={{ width: 100 }}>คิดเป็นเงิน</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>{i + 1}.</td>
                <td>{o.itemName}{o.itemNote ? ` (${o.itemNote})` : ""}</td>
                <td style={{ textAlign: 'center' }}>{o.qty}</td>
                <td style={{ textAlign: 'center' }}>{o.unit?.startsWith("#") ? "—" : (o.unit || "—")}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(o.priceExcl)}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(o.totalExcl)}</td>
              </tr>
            ))}
            {/* Empty filler rows */}
            {Array.from({ length: Math.max(0, 10 - orders.length) }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ height: 22 }}>
                <td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            ))}
            {/* Footer row: notes left, breakdown right */}
            <tr>
              <td colSpan={3} rowSpan={5} style={{ verticalAlign: 'top', fontSize: 12 }}>
                {po.notes ? <><strong>หมายเหตุการสั่งซื้อ : </strong>{po.notes}</> : ""}
              </td>
              <td colSpan={2} style={{ textAlign: 'right', fontSize: 13 }}>ค่าสินค้าและบริการ</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {orders.reduce((s, o) => s + (parseFloat(o.totalExcl.replace(/,/g,""))||0), 0)
                  .toLocaleString("th-TH",{minimumFractionDigits:2})}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', fontSize: 13 }}>ส่วนลด</td>
              <td style={{ textAlign: 'right' }}>{parseFloat(po.discount.replace(/,/g,""))>0 ? fmt(po.discount) : "-"}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', fontSize: 13 }}>ภาษีมูลค่าเพิ่ม 7%</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {(orders.reduce((s,o)=>s+(parseFloat(o.totalExcl.replace(/,/g,""))||0),0)*0.07)
                  .toLocaleString("th-TH",{minimumFractionDigits:2})}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', fontSize: 13 }}>หัก ณ ที่จ่าย 3%</td>
              <td style={{ textAlign: 'right' }}>-</td>
            </tr>
            {/* Grand total */}
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={2} style={{ textAlign: 'center', fontSize: 13 }}>ยอดที่ต้องชำระ</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(po.grandTotal)}</td>
            </tr>
            {/* Baht text row */}
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={4} style={{ textAlign: 'center' }}>{bahtText(grandTotal)}</td>
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(po.grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center', fontSize: 13 }}>
          {[
            { role: "ผู้สั่งซื้อ", name: po.requester },
            { role: "ผู้ตรวจสอบ", name: po.reviewer },
            { role: "ผู้อนุมัติ", name: po.approver },
          ].map(({ role, name }) => (
            <div key={role}>
              <div style={{ fontWeight: 600, marginBottom: 36 }}>ลายมือชื่อ{role}</div>
              <div style={{ borderBottom: '1px solid #374151', marginBottom: 4 }} />
              {name && <div style={{ fontSize: 12 }}>( {name} )</div>}
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>วันที่ .............</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: '#6b7280', textAlign: 'right' }}>
          ออกใบสั่งซื้อ ณ วันที่{" "}
          {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}{" "}
          เวลา {new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
        </div>
      </div>
      <div className="no-print" style={{ height: 40 }} />
    </>
  );
}
