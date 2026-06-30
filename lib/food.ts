import { createServerSupabase } from "./supabase";
import { syncFoodOrderToSheet } from "./sheets-sync";
import type { FoodOrder, FoodIngredient, FoodCategory, NewFoodOrderInput, FoodOrderStatus } from "./types";

function thaiYear(): number {
  return new Date().getFullYear() + 543;
}

async function nextOrderNumber(sb: ReturnType<typeof createServerSupabase>): Promise<string> {
  const { data } = await sb.rpc("nextval", { seq: "food.order_seq" }).single();
  const seq = (data as number) ?? 1;
  return `FOOD-${thaiYear()}-${String(seq).padStart(4, "0")}`;
}

export async function listFoodOrders(filters?: {
  status?: FoodOrderStatus;
  requesterEmail?: string;
}): Promise<FoodOrder[]> {
  const sb = createServerSupabase();
  let q = sb.schema("food").from("orders").select("*").order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.requesterEmail) q = q.eq("requester_email", filters.requesterEmail);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as FoodOrder[];
}

export async function getFoodOrder(id: string): Promise<FoodOrder | null> {
  const sb = createServerSupabase();
  const [{ data: order }, { data: items }] = await Promise.all([
    sb.schema("food").from("orders").select("*").eq("id", id).single(),
    sb.schema("food").from("order_items").select("*").eq("order_id", id),
  ]);
  if (!order) return null;
  return { ...(order as FoodOrder), items: (items ?? []) as FoodOrder["items"] };
}

export async function createFoodOrder(
  input: NewFoodOrderInput,
  requester: { email: string; name: string }
): Promise<FoodOrder> {
  const sb = createServerSupabase();
  const total = input.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const orderNumber = await nextOrderNumber(sb);

  const { data: order, error: oErr } = await sb
    .schema("food")
    .from("orders")
    .insert({
      order_number: orderNumber,
      order_date: input.order_date,
      status: input.status ?? "pending",
      requester_email: requester.email,
      requester_name: requester.name,
      total_amount: total,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (oErr || !order) throw new Error(oErr?.message ?? "สร้างใบสั่งไม่สำเร็จ");

  const { error: iErr } = await sb
    .schema("food")
    .from("order_items")
    .insert(
      input.items.map((i) => ({
        order_id: order.id,
        ingredient_id: i.ingredient_id ?? null,
        ingredient_name: i.ingredient_name,
        qty: i.qty,
        unit: i.unit,
        unit_price: i.unit_price,
        total_price: i.qty * i.unit_price,
      }))
    );
  if (iErr) throw new Error(iErr.message);

  const full = (await getFoodOrder(order.id))!;
  void syncFoodOrderToSheet(full);
  return full;
}

export async function updateFoodOrderStatus(
  id: string,
  status: FoodOrderStatus,
  approver?: { email: string; name: string }
): Promise<FoodOrder> {
  const sb = createServerSupabase();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (approver) {
    patch.approver_email = approver.email;
    patch.approver_name = approver.name;
    patch.approved_at = new Date().toISOString();
  }
  if (status === "received") {
    patch.approved_at = patch.approved_at ?? new Date().toISOString();
  }
  const { error } = await sb.schema("food").from("orders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  const full = (await getFoodOrder(id))!;
  void syncFoodOrderToSheet(full);
  return full;
}

export async function listIngredients(): Promise<FoodIngredient[]> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .schema("food")
    .from("ingredients")
    .select("*, category:categories(id,name,description,created_at), vendor:vendors(id,name,contact,phone,notes,is_active)")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as FoodIngredient[];
}

export async function listFoodCategories(): Promise<FoodCategory[]> {
  const sb = createServerSupabase();
  const { data } = await sb.schema("food").from("categories").select("*").order("name");
  return (data ?? []) as FoodCategory[];
}
