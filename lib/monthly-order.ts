import "server-only";
import { createServerSupabase } from "./supabase";
import { syncMonthlyOrderToSheet } from "./sheets-sync";
export type { MonthlyOrder, MonthlyOrderItem } from "./monthly-order-types";
export { THAI_MONTHS, currentThaiYear, currentThaiMonth } from "./monthly-order-types";
import type { MonthlyOrder, MonthlyOrderItem } from "./monthly-order-types";

export interface NewMonthlyOrderInput {
  order_month: string;
  order_year: number;
  department: string;
  notes?: string;
  status?: "draft" | "pending";
  items: {
    item_code?: string;
    item_name: string;
    store: string;
    item_type: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }[];
}

export async function listMonthlyOrders(filters?: {
  department?: string;
  status?: MonthlyOrder["status"];
  order_month?: string;
  order_year?: number;
}): Promise<MonthlyOrder[]> {
  const sb = createServerSupabase();
  let q = sb.from("monthly_orders").select("*").order("created_at", { ascending: false });
  if (filters?.department) q = q.eq("department", filters.department);
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.order_month) q = q.eq("order_month", filters.order_month);
  if (filters?.order_year) q = q.eq("order_year", filters.order_year);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as MonthlyOrder[];
}

export async function getMonthlyOrder(id: string): Promise<MonthlyOrder | null> {
  const sb = createServerSupabase();
  const [{ data: order }, { data: items }] = await Promise.all([
    sb.from("monthly_orders").select("*").eq("id", id).single(),
    sb.from("monthly_order_items").select("*").eq("order_id", id).order("created_at"),
  ]);
  if (!order) return null;
  return { ...(order as MonthlyOrder), items: (items ?? []) as MonthlyOrderItem[] };
}

export async function getLastMonthOrder(
  department: string,
  currentMonth: string,
  currentYear: number
): Promise<MonthlyOrder | null> {
  const sb = createServerSupabase();
  // Get the most recent approved/received order for this department (excluding current month)
  const { data } = await sb
    .from("monthly_orders")
    .select("id")
    .eq("department", department)
    .in("status", ["approved", "pending", "draft"])
    .or(`order_year.lt.${currentYear},and(order_year.eq.${currentYear},order_month.neq.${currentMonth})`)
    .order("order_year", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return getMonthlyOrder(data.id);
}

export async function createMonthlyOrder(
  input: NewMonthlyOrderInput,
  requester: { email: string; name: string }
): Promise<MonthlyOrder> {
  const sb = createServerSupabase();
  const total = input.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const { data: order, error: oErr } = await sb
    .from("monthly_orders")
    .insert({
      order_month: input.order_month,
      order_year: input.order_year,
      department: input.department,
      status: input.status ?? "draft",
      requester_email: requester.email,
      requester_name: requester.name,
      total_amount: total,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (oErr || !order) throw new Error(oErr?.message ?? "สร้างรายการไม่สำเร็จ");

  await sb.from("monthly_order_items").insert(
    input.items.map((i) => ({
      order_id: order.id,
      item_code: i.item_code ?? null,
      item_name: i.item_name,
      store: i.store,
      item_type: i.item_type,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.unit_price,
      total_price: i.quantity * i.unit_price,
    }))
  );

  const full = (await getMonthlyOrder(order.id))!;
  if (full.status === "pending") void syncMonthlyOrderToSheet(full);
  return full;
}

export async function updateMonthlyOrderStatus(
  id: string,
  status: MonthlyOrder["status"],
  approver?: { email: string; name: string }
): Promise<MonthlyOrder> {
  const sb = createServerSupabase();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (approver) {
    patch.approver_email = approver.email;
    patch.approver_name = approver.name;
    patch.approved_at = new Date().toISOString();
  }
  const { error } = await sb.from("monthly_orders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  const full = (await getMonthlyOrder(id))!;
  if (["approved", "rejected"].includes(status)) void syncMonthlyOrderToSheet(full);
  return full;
}

export async function listDepartments(): Promise<string[]> {
  const sb = createServerSupabase();
  const { data } = await sb.from("departments").select("name").eq("is_active", true).order("name");
  return (data ?? []).map((d: { name: string }) => d.name);
}

