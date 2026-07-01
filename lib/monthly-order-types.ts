// Pure types and client-safe utilities — no server imports

export interface MonthlyOrder {
  id: string;
  order_month: string;
  order_year: number;
  department: string;
  status: "draft" | "pending" | "approved" | "rejected";
  requester_email: string;
  requester_name: string;
  approver_email: string | null;
  approver_name: string | null;
  approved_at: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: MonthlyOrderItem[];
}

export interface MonthlyOrderItem {
  id: string;
  order_id: string;
  item_code: string | null;
  item_name: string;
  store: string;
  item_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

export const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

export function currentThaiYear(): number {
  return new Date().getFullYear() + 543;
}

export function currentThaiMonth(): string {
  return THAI_MONTHS[new Date().getMonth()];
}
