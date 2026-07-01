"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PO, POOrder } from "@/lib/types-po";

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

function fmt(val: string) {
  const n = parseFloat((val ?? "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
  text += chunk(remainder);
  text += "บาท";
  if (satang > 0) text += chunk(satang) + "สตางค์";
  else text += "ถ้วน";
  return text;
}

export default function POPrintReceivePage() {
  const { id } = useParams<{ id: string }>();
  const poNumber = id.replace(/~/g, "/");

  const [po, setPo] = useState<PO | null>(null);
  const [orders, setOrders] = useState<POOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/po/${id}`)
      .then((r) => r.json())
      .then((d) => { setPo(d.po); setOrders(d.orders ?? []); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && po) setTimeout(() => window.print(), 500);
  }, [loading, po]);

  if (loading || !po) {
    return <div className="flex items-center justify-center min-h-screen text-slate-400 text-sm">กำลังโหลด...</div>;
  }

  const grandTotal = parseFloat(po.grandTotal.replace(/,/g, "")) || 0;
  const deposit = parseFloat(po.deposit?.replace(/,/g, "") || "0") || 0;
  const remaining = grandTotal - deposit;

  const today = fmtDate(
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
  );

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
        th, td { border: 1px solid #374151; padding: 5px 8px; }
        th { background: #f3f4f6; font-weight: 600; text-align: center; }
        .sig-table { border-collapse: collapse; width: 100%; }
        .sig-table td { border: 1px solid #374151; padding: 8px 10px; vertical-align: top; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#1e293b', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>ตรวจรับของ — {poNumber}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.history.back()}
            style={{ padding: '6px 16px', fontSize: 13, color: '#cbd5e1', background: 'transparent', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }}>
            ← กลับ
          </button>
          <button onClick={() => window.print()}
            style={{ padding: '6px 16px', fontSize: 13, color: 'white', background: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      <div className="no-print" style={{ height: 16 }} />

      <div className="page">

        {/* School Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f' }}>Tonkla School</div>
          <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'right' }}>Ministry of Happiness</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>รายงานการตรวจรับของ</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            โรงเรียนต้นกล้า 292-292/1 หมู่ 6 ถ.เชียงใหม่-แม่โจ้ ต.หนองจ้อม อ.สันทราย จ.เชียงใหม่ 50210
          </div>
        </div>
        <hr style={{ borderTop: '2px solid #1e3a5f', marginBottom: 14 }} />

        {/* Meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
          <div><span style={{ color: '#6b7280' }}>เรื่อง </span>รายงานการตรวจรับของ</div>
          <div><span style={{ color: '#6b7280' }}>วันที่ </span>{today}</div>
        </div>
        <div style={{ marginBottom: 10, fontSize: 14 }}>
          <span style={{ color: '#6b7280' }}>เรียน </span>
          {po.approver || "................................"}
        </div>

        {/* Body paragraph */}
        <div style={{ border: '1px solid #9ca3af', borderRadius: 4, padding: '10px 14px', marginBottom: 14, fontSize: 13.5, lineHeight: 2 }}>
          &emsp;&emsp;คณะกรรมการตรวจรับของ ได้ดำเนินการตรวจสอบคุณภาพของของ{" "}
          <strong>{po.supplierName || "................................"}</strong>{" "}
          ตามใบสั่งซื้อเลขที่ <strong>{poNumber}</strong>{" "}
          ลงวันที่ {fmtDate(po.orderDate)}{" "}
          {orders.length > 0
            ? `ประกอบด้วย ${orders.map((o) => `${o.itemName} จำนวน ${o.qty} ${o.unit}`).join(", ")}`
            : ""}
          {po.notes ? ` (${po.notes})` : ""} มีความเป็นมาตรฐานแล้ว พบว่า
        </div>

        {/* Checkboxes */}
        <div style={{ display: 'flex', gap: 40, marginBottom: 14, paddingLeft: 24, fontSize: 14 }}>
          <div>☐ &nbsp;ไม่สมควรอนุมัติ</div>
          <div>☐ &nbsp;สมควรอนุมัติพิจารณาเงินจ่าย</div>
        </div>

        {/* รายการชำระ */}
        <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>รายการชำระ</div>
        <table style={{ marginBottom: 14, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>ลำดับ</th>
              <th>ชื่อรายการ</th>
              <th style={{ width: 130 }}>จำนวนเงิน</th>
              <th style={{ width: 60 }}>%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' }}>1</td>
              <td>ค่ามัดจำล่วงหน้า</td>
              <td style={{ textAlign: 'right' }}>{deposit > 0 ? fmt(String(deposit)) : ""}</td>
              <td style={{ textAlign: 'center' }}>{deposit > 0 ? Math.round((deposit / grandTotal) * 100) + "%" : ""}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'center' }}>2</td>
              <td>เงินค้างจ่าย</td>
              <td style={{ textAlign: 'right' }}>{fmt(String(remaining))}</td>
              <td style={{ textAlign: 'center' }}>{deposit > 0 ? Math.round((remaining / grandTotal) * 100) + "%" : "100%"}</td>
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={2} style={{ textAlign: 'center' }}>
                {bahtText(grandTotal)}
              </td>
              <td style={{ textAlign: 'right' }}>{fmt(String(grandTotal))}</td>
              <td style={{ textAlign: 'center' }}>100%</td>
            </tr>
          </tbody>
        </table>

        {/* รายการตรวจสอบ */}
        <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>รายการตรวจสอบ</div>
        <table style={{ marginBottom: 14, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>ลำดับ</th>
              <th>ชื่อรายการ</th>
              <th style={{ width: 80 }}>สถานะ</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' }}>1</td>
              <td>คุณภาพของ</td>
              <td style={{ textAlign: 'center' }}>ผ่าน</td>
              <td></td>
            </tr>
            <tr>
              <td style={{ textAlign: 'center' }}>2</td>
              <td>ครบจำนวน</td>
              <td style={{ textAlign: 'center' }}>ผ่าน</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Disclaimer */}
        <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 20 }}>
          &emsp;&emsp;ข้าพเจ้ากรรมการตรวจรับมอบงาน/พัสดุ ขอรับผิดชอบใช้เงินเดือน จำนวน 1 เดือน
          ของข้าพเจ้าฯ เพื่อเป็นค้ำประกันความเสียหาย ในการตรวจรับงานดังกล่าว
        </div>

        {/* Signature grid */}
        <table className="sig-table" style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', minHeight: 90 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 40 }}>ลงชื่อกรรมการตรวจรับงานคนที่ 1</div>
                <div style={{ borderTop: '1px solid #374151', marginBottom: 4, width: '70%' }}></div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>( {po.reviewer || "................................"} )</div>
              </td>
              <td style={{ width: '50%' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>ลงชื่อผู้อนุมัติชำระ</div>
                <div style={{ marginBottom: 8 }}>☐ &nbsp;อนุมัติ</div>
                <div>☐ &nbsp;ไม่อนุม่</div>
              </td>
            </tr>
            <tr>
              <td>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 40 }}>ลงชื่อกรรมการตรวจรับงานคนที่ 2</div>
                <div style={{ borderTop: '1px solid #374151', marginBottom: 4, width: '70%' }}></div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>( ................................ )</div>
              </td>
              <td>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 36 }}>
                  {po.approver || "................................"}
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 40 }}>ลงชื่อกรรมการตรวจรับงานคนที่ 3</div>
                <div style={{ borderTop: '1px solid #374151', marginBottom: 4, width: '70%' }}></div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>( ................................ )</div>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 16, fontSize: 11, color: '#6b7280', textAlign: 'right' }}>
          ออกรายงาน ณ วันที่ {today}
        </div>
      </div>

      <div className="no-print" style={{ height: 32 }} />
    </>
  );
}
