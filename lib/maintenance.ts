import { createServerSupabase } from "./supabase";
import { syncMaintenanceToSheet } from "./sheets-sync";
import type {
  MaintenanceRequest, MaintenanceCategory, MaintenanceStatus,
  MaintenancePriority, NewMaintenanceInput,
} from "./types";

function thaiYear(): number {
  return new Date().getFullYear() + 543;
}

async function nextRequestNumber(sb: ReturnType<typeof createServerSupabase>): Promise<string> {
  const { data } = await sb.rpc("nextval", { seq: "maintenance.request_seq" }).single();
  const seq = (data as number) ?? 1;
  return `MR-${thaiYear()}-${String(seq).padStart(4, "0")}`;
}

export async function listMaintenanceRequests(filters?: {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  reporterEmail?: string;
  assignedEmail?: string;
}): Promise<MaintenanceRequest[]> {
  const sb = createServerSupabase();
  let q = sb
    .schema("maintenance")
    .from("requests")
    .select("*, category:categories(id,name,description)")
    .order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.priority) q = q.eq("priority", filters.priority);
  if (filters?.reporterEmail) q = q.eq("reporter_email", filters.reporterEmail);
  if (filters?.assignedEmail) q = q.eq("assigned_to_email", filters.assignedEmail);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as MaintenanceRequest[];
}

export async function getMaintenanceRequest(id: string): Promise<MaintenanceRequest | null> {
  const sb = createServerSupabase();
  const [{ data: req }, { data: attachments }, { data: history }] = await Promise.all([
    sb.schema("maintenance").from("requests").select("*, category:categories(id,name,description)").eq("id", id).single(),
    sb.schema("maintenance").from("attachments").select("*").eq("request_id", id).order("uploaded_at"),
    sb.schema("maintenance").from("history").select("*").eq("request_id", id).order("changed_at"),
  ]);
  if (!req) return null;
  return {
    ...(req as MaintenanceRequest),
    attachments: (attachments ?? []) as MaintenanceRequest["attachments"],
    history: (history ?? []) as MaintenanceRequest["history"],
  };
}

export async function createMaintenanceRequest(
  input: NewMaintenanceInput,
  reporter: { email: string; name: string }
): Promise<MaintenanceRequest> {
  const sb = createServerSupabase();
  const requestNumber = await nextRequestNumber(sb);

  const { data: req, error } = await sb
    .schema("maintenance")
    .from("requests")
    .insert({
      request_number: requestNumber,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      category_id: input.category_id ?? null,
      priority: input.priority,
      status: "open",
      reporter_email: reporter.email,
      reporter_name: reporter.name,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error || !req) throw new Error(error?.message ?? "สร้างคำร้องไม่สำเร็จ");

  // Log initial history
  await sb.schema("maintenance").from("history").insert({
    request_id: req.id,
    old_status: null,
    new_status: "open",
    changed_by_email: reporter.email,
    note: "สร้างคำร้องแจ้งซ่อม",
  });

  const full = (await getMaintenanceRequest(req.id))!;
  void syncMaintenanceToSheet(full);
  return full;
}

export async function updateMaintenanceStatus(
  id: string,
  newStatus: MaintenanceStatus,
  changedBy: { email: string; name: string },
  options?: {
    assignedToEmail?: string;
    assignedToName?: string;
    estimatedCost?: number;
    actualCost?: number;
    note?: string;
  }
): Promise<MaintenanceRequest> {
  const sb = createServerSupabase();

  const { data: current } = await sb
    .schema("maintenance")
    .from("requests")
    .select("status")
    .eq("id", id)
    .single();

  const patch: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (options?.assignedToEmail) {
    patch.assigned_to_email = options.assignedToEmail;
    patch.assigned_to_name = options.assignedToName ?? null;
  }
  if (options?.estimatedCost !== undefined) patch.estimated_cost = options.estimatedCost;
  if (options?.actualCost !== undefined) patch.actual_cost = options.actualCost;
  if (newStatus === "resolved") patch.resolved_at = new Date().toISOString();

  await sb.schema("maintenance").from("requests").update(patch).eq("id", id);

  // Log history
  await sb.schema("maintenance").from("history").insert({
    request_id: id,
    old_status: (current as { status: string } | null)?.status ?? null,
    new_status: newStatus,
    changed_by_email: changedBy.email,
    note: options?.note ?? null,
  });

  const full = (await getMaintenanceRequest(id))!;
  void syncMaintenanceToSheet(full);
  return full;
}

export async function listMaintenanceCategories(): Promise<MaintenanceCategory[]> {
  const sb = createServerSupabase();
  const { data } = await sb.schema("maintenance").from("categories").select("*").order("name");
  return (data ?? []) as MaintenanceCategory[];
}
