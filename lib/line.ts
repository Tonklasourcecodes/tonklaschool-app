const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

export async function sendFlexMessage(lineUserId: string, altText: string, contents: object) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "flex", altText, contents }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[LINE] sendFlexMessage failed ${res.status}:`, text);
    throw new Error(`LINE push failed: ${res.status}`);
  }
}

export async function replyMessage(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

export function buildApprovalFlex(po: {
  id: string;
  date: string;
  supplierName: string;
  requesterName: string;
  total: string;
  type: "PO" | "JO";
  items?: { name: string; qty: string; unit: string; totalIncl: string }[];
  deposit?: string;
  shipping?: string;
  discount?: string;
  notes?: string;
}) {
  const label = po.type === "PO" ? "ใบสั่งซื้อ" : "ใบจ้าง";
  const fmtNum = (v: string) => {
    const n = parseFloat((v || "0").replace(/,/g, ""));
    return isNaN(n) || n === 0 ? "" : n.toLocaleString("th-TH", { minimumFractionDigits: 2 });
  };

  const bodyContents: object[] = [
    { type: "box", layout: "horizontal", contents: [
      { type: "text", text: "ร้านค้า", color: "#6B7280", size: "sm", flex: 2 },
      { type: "text", text: po.supplierName, color: "#111827", size: "sm", flex: 3, wrap: true },
    ]},
    { type: "box", layout: "horizontal", contents: [
      { type: "text", text: "ผู้สั่ง", color: "#6B7280", size: "sm", flex: 2 },
      { type: "text", text: po.requesterName, color: "#111827", size: "sm", flex: 3 },
    ]},
  ];

  if (po.items && po.items.length > 0) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "text", text: "รายการที่สั่ง", color: "#374151", size: "sm",
      weight: "bold", margin: "md",
    });
    for (const item of po.items.slice(0, 10)) {
      bodyContents.push({
        type: "box", layout: "horizontal", margin: "sm", contents: [
          { type: "text", text: item.name, color: "#111827", size: "xs", flex: 4, wrap: true },
          { type: "text", text: `${item.qty} ${item.unit}`, color: "#6B7280", size: "xs", flex: 2, align: "end" },
          { type: "text", text: `${fmtNum(item.totalIncl)}`, color: "#111827", size: "xs", flex: 2, align: "end" },
        ],
      });
    }
    if (po.items.length > 10) {
      bodyContents.push({
        type: "text", text: `...อีก ${po.items.length - 10} รายการ`,
        color: "#9CA3AF", size: "xs", margin: "sm",
      });
    }
  }

  bodyContents.push({ type: "separator", margin: "md" });

  const deposit = fmtNum(po.deposit ?? "");
  const shipping = fmtNum(po.shipping ?? "");
  const discount = fmtNum(po.discount ?? "");
  if (deposit) {
    bodyContents.push({ type: "box", layout: "horizontal", margin: "sm", contents: [
      { type: "text", text: "มัดจำ", color: "#6B7280", size: "xs", flex: 2 },
      { type: "text", text: `${deposit} ฿`, color: "#111827", size: "xs", flex: 3, align: "end" },
    ]});
  }
  if (shipping) {
    bodyContents.push({ type: "box", layout: "horizontal", margin: "sm", contents: [
      { type: "text", text: "ค่าส่ง", color: "#6B7280", size: "xs", flex: 2 },
      { type: "text", text: `${shipping} ฿`, color: "#111827", size: "xs", flex: 3, align: "end" },
    ]});
  }
  if (discount) {
    bodyContents.push({ type: "box", layout: "horizontal", margin: "sm", contents: [
      { type: "text", text: "ส่วนลด", color: "#6B7280", size: "xs", flex: 2 },
      { type: "text", text: `-${discount} ฿`, color: "#DC2626", size: "xs", flex: 3, align: "end" },
    ]});
  }

  bodyContents.push({
    type: "box", layout: "horizontal", margin: "md", contents: [
      { type: "text", text: "ยอดรวม", color: "#166534", size: "sm", weight: "bold", flex: 2 },
      { type: "text", text: `${po.total} บาท`, color: "#166534", size: "sm", weight: "bold", flex: 3, align: "end" },
    ],
  });

  if (po.notes?.trim()) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "text", text: `📝 ${po.notes}`, color: "#6B7280", size: "xs",
      margin: "sm", wrap: true,
    });
  }

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#166534",
      paddingAll: "16px",
      contents: [
        { type: "text", text: `📋 ${label} ${po.id}`, color: "#FFFFFF", size: "md", weight: "bold" },
        { type: "text", text: `วันที่ ${po.date}`, color: "#86EFAC", size: "sm", margin: "sm" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: bodyContents,
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button", style: "primary", color: "#16A34A", height: "sm",
          action: { type: "postback", label: "✅ อนุมัติ", data: `action=approve&type=${po.type}&id=${po.id}` },
        },
        {
          type: "button", style: "secondary", height: "sm",
          action: { type: "postback", label: "❌ ไม่อนุมัติ", data: `action=reject&type=${po.type}&id=${po.id}` },
        },
      ],
    },
  };
}
