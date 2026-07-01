"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { JO, JOOrder } from "@/lib/types-po";

function bahtText(amount: number): string {
  if (amount === 0) return "ศูนย์บาทถ้วน";
  const ones = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
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
  text += chunk(remainder) + "บาท";
  if (satang > 0) text += chunk(satang) + "สตางค์";
  else text += "ถ้วน";
  return text;
}

function fmt(val: string | number) {
  const n = typeof val === "number" ? val : parseFloat((val ?? "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(val: string) {
  if (!val) return "—";
  const parts = val.includes("/") ? val.split("/") : val.split("-");
  if (parts.length !== 3) return val;
  const thMonths = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  let day: number, month: number, year: number;
  if (val.includes("/")) { [day, month, year] = parts.map(Number); }
  else { [year, month, day] = parts.map(Number); }
  const thYear = year < 2500 ? year + 543 : year;
  return `${day} ${thMonths[month] ?? ""} ${thYear}`;
}

function nowThai() {
  return new Date().toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  }) + " เวลา " + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
}

export default function JOPrintPage() {
  const { id } = useParams<{ id: string }>();
  const joNumber = id.replace(/~/g, "/");

  const [jo, setJo] = useState<JO | null>(null);
  const [orders, setOrders] = useState<JOOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/jo/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setJo(d.jo);
        setOrders(d.orders ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && jo) setTimeout(() => window.print(), 500);
  }, [loading, jo]);

  if (loading || !jo) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400 text-sm">
        กำลังโหลด...
      </div>
    );
  }

  // Compute totals from orders if available, else fall back to jo.grandTotal
  const orderTotalExcl = orders.reduce((s, o) => {
    const excl = parseFloat((o.totalExcl || "").replace(/,/g, ""));
    const fallback = parseFloat((o.priceExcl || "").replace(/,/g, "")) * (parseFloat(o.qty || "1") || 1);
    return s + (isNaN(excl) ? (isNaN(fallback) ? 0 : fallback) : excl);
  }, 0);

  const hasOrders = orders.length > 0 && orderTotalExcl > 0;
  const totalExcl = hasOrders ? orderTotalExcl : parseFloat((jo.grandTotal || "0").replace(/,/g, "")) / 1.07;
  const vat7 = totalExcl * 0.07;
  const totalIncl = totalExcl + vat7;
  const wht3 = totalExcl * 0.03;
  const netPay = totalIncl - wht3;

  const deposit = parseFloat((jo.deposit || "0").replace(/,/g, "")) || 0;

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans Thai', 'TH Sarabun New', sans-serif; font-size: 13px; color: #1a1a1a; background: #e5e7eb; }
        @media print {
          @page { size: A4; margin: 10mm 12mm 12mm 15mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .page { box-shadow: none; margin: 0; padding: 0; }
        }
        .page { max-width: 794px; margin: 0 auto; background: white; padding: 28px 36px 36px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #374151; padding: 3px 7px; }
        th { background: #f3f4f6; font-weight: 600; text-align: center; font-size: 12px; }
        td { font-size: 12.5px; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#1e293b', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>ตัวอย่างก่อนพิมพ์ — {joNumber}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.history.back()}
            style={{ padding: '6px 16px', fontSize: 13, color: '#cbd5e1', background: 'transparent', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }}>
            ← กลับ
          </button>
          <button onClick={() => window.print()}
            style={{ padding: '6px 16px', fontSize: 13, color: 'white', background: '#7c3aed', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      <div className="no-print" style={{ height: 16 }} />

      {/* A4 Document */}
      <div className="page">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f' }}>Tonkla School</div>
          <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>Ministry of Happiness</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>ใบอนุมัติสั่งจ้าง</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 1 }}>{jo.supplierName}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            โรงเรียนต้นกล้า 292-292/1 หมู่ 6 ถ.เชียงใหม่-แม่โจ้ ต.หนองจ้อม อ.สันทราย จ.เชียงใหม่ 50210
          </div>
        </div>
        <hr style={{ borderTop: '2px solid #1e3a5f', marginBottom: 10 }} />

        {/* Meta row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 8, fontSize: 12.5 }}>
          <div><span style={{ color: '#6b7280' }}>เลขที่สั่งจ้าง : </span><strong>{joNumber}</strong></div>
          <div><span style={{ color: '#6b7280' }}>ชื่อผู้สั่งจ้าง : </span>{jo.requester || '—'}</div>
          <div><span style={{ color: '#6b7280' }}>สถานที่ : </span>{jo.location || ''}</div>
          <div><span style={{ color: '#6b7280' }}>วันที่จ้าง : </span>{fmtDate(jo.startDate)}</div>
          <div><span style={{ color: '#6b7280' }}>วันที่สิ้นสุด : </span>{jo.endDate ? fmtDate(jo.endDate) : ''}</div>
          <div><span style={{ color: '#6b7280' }}>เป็นจำนวน : </span></div>
        </div>

        {/* Items table */}
        <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 600, textAlign: 'center' }}>รายการจ้าง</div>
        <table style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>ลำดับที่</th>
              <th>ชื่องาน</th>
              <th style={{ width: 55 }}>จำนวน</th>
              <th style={{ width: 55 }}>หน่วย</th>
              <th style={{ width: 90 }}>ราคา/หน่วย</th>
              <th style={{ width: 95 }}>คิดเป็นเงิน</th>
            </tr>
          </thead>
          <tbody>
            {hasOrders ? (
              orders.map((o, i) => {
                const qty = parseFloat(o.qty || "1") || 1;
                const priceExcl = parseFloat((o.priceExcl || "").replace(/,/g, "")) || 0;
                const rowTotal = parseFloat((o.totalExcl || "").replace(/,/g, "")) || (qty * priceExcl);
                return (
                  <tr key={i}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>{o.itemName}</td>
                    <td style={{ textAlign: 'center' }}>{o.qty || 1}</td>
                    <td style={{ textAlign: 'center' }}>{o.unit}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {priceExcl > 0 ? fmt(priceExcl) : ''}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {rowTotal > 0 ? fmt(rowTotal) : ''}
                    </td>
                  </tr>
                );
              })
            ) : (
              // No order items — show empty rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ height: 28 }}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td></td><td></td><td></td><td></td><td></td>
                </tr>
              ))
            )}
            {/* Pad to at least 5 rows */}
            {hasOrders && orders.length < 5 && Array.from({ length: 5 - orders.length }).map((_, i) => (
              <tr key={`pad-${i}`} style={{ height: 24 }}>
                <td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals + notes row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginTop: 8, alignItems: 'start' }}>
          {/* Notes */}
          <div style={{ fontSize: 12.5 }}>
            {jo.notes && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#6b7280' }}>หมายเหตุการจ้าง : </span>{jo.notes}
              </div>
            )}
            {deposit > 0 && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: '#6b7280' }}>ค่ามัดจำล่วงหน้า : </span>
                <strong>{fmt(deposit)} บาท</strong>
              </div>
            )}
            {/* Amount in words */}
            <div style={{ border: '1px solid #d1d5db', padding: '5px 8px', borderRadius: 3, marginTop: 8, fontSize: 12 }}>
              <strong>{bahtText(Math.round(netPay * 100) / 100)}</strong>
            </div>
          </div>

          {/* Financial summary */}
          <table style={{ width: 220, fontSize: 12.5, border: 'none' }}>
            <tbody>
              <tr>
                <td style={{ border: 'none', paddingRight: 8, color: '#374151' }}>ค่าจ้าง</td>
                <td style={{ border: 'none', textAlign: 'right', fontVariantNumeric: 'tabular-nums', minWidth: 90 }}>{fmt(totalExcl)}</td>
              </tr>
              <tr>
                <td style={{ border: 'none', paddingRight: 8, color: '#374151' }}>ภาษีมูลค่าเพิ่ม 7%</td>
                <td style={{ border: 'none', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(vat7)}</td>
              </tr>
              <tr>
                <td style={{ border: 'none', paddingRight: 8, color: '#374151' }}>หัก ณ ที่จ่าย 3%</td>
                <td style={{ border: 'none', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>({fmt(wht3)})</td>
              </tr>
              <tr style={{ borderTop: '1.5px solid #374151' }}>
                <td style={{ border: 'none', paddingRight: 8, fontWeight: 700 }}>ยอดที่ต้องชำระ</td>
                <td style={{ border: 'none', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmt(netPay)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 12.5 }}>
          {[
            { label: "ลายมือชื่อผู้สั่งจ้าง", name: jo.requester },
            { label: "ลายมือชื่อผู้ตรวจสอบ", name: jo.reviewer },
            { label: "ลายมือชื่อผู้อนุมัติ", name: jo.approver },
          ].map(({ label, name }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 2 }}>{label}</div>
              <div style={{ borderBottom: '1px solid #374151', height: 28, marginBottom: 3 }} />
              <div style={{ color: '#4b5563' }}>( {name || "......................................."} )</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
          ออกใบสั่งจ้าง ณ วันที่ {nowThai()}
        </div>
      </div>
      <div className="no-print" style={{ height: 40 }} />
    </>
  );
}
