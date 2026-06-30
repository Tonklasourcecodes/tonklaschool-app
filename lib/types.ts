// ── App Users ──────────────────────────────────────────────
export type UserRole = "admin" | "kitchen_staff" | "maintenance_staff" | "reporter";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

// ── Food / วัตถุดิบ ────────────────────────────────────────
export type FoodOrderStatus = "draft" | "pending" | "approved" | "rejected" | "received";

export interface FoodCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface FoodVendor {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface FoodIngredient {
  id: string;
  category_id: string | null;
  name: string;
  default_unit: string;
  estimated_price: number;
  vendor_id: string | null;
  is_active: boolean;
  category?: FoodCategory;
  vendor?: FoodVendor;
}

export interface FoodOrderItem {
  id: string;
  order_id: string;
  ingredient_id: string | null;
  ingredient_name: string;
  qty: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface FoodOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: FoodOrderStatus;
  requester_email: string;
  requester_name: string;
  approver_email: string | null;
  approver_name: string | null;
  approved_at: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: FoodOrderItem[];
}

export interface NewFoodOrderInput {
  order_date: string;
  status?: FoodOrderStatus;
  notes?: string;
  items: {
    ingredient_id?: string;
    ingredient_name: string;
    qty: number;
    unit: string;
    unit_price: number;
  }[];
}

// ── Maintenance / แจ้งซ่อม ─────────────────────────────────
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "open" | "assigned" | "in_progress" | "resolved" | "closed";

export interface MaintenanceCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface MaintenanceAttachment {
  id: string;
  request_id: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface MaintenanceHistoryEntry {
  id: string;
  request_id: string;
  old_status: string | null;
  new_status: string;
  changed_by_email: string;
  note: string | null;
  changed_at: string;
}

export interface MaintenanceRequest {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  location: string | null;
  category_id: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reporter_email: string;
  reporter_name: string;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  category?: MaintenanceCategory;
  attachments?: MaintenanceAttachment[];
  history?: MaintenanceHistoryEntry[];
}

export interface NewMaintenanceInput {
  title: string;
  description?: string;
  location?: string;
  category_id?: string;
  priority: MaintenancePriority;
  notes?: string;
}
