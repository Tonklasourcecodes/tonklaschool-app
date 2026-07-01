export type Lang = "th" | "en";

export const translations = {
  th: {
    // Nav
    nav_section_main:   "หลัก",
    nav_section_data:   "ข้อมูล",
    nav_section_action: "การดำเนินการ",
    nav_overview:   "ภาพรวม",
    nav_po:         "ใบสั่งซื้อ (PO)",
    nav_jo:         "ใบจ้าง (JO)",
    nav_suppliers:  "ผู้จัดหา",
    nav_items:      "รายการสินค้า",
    nav_approvals:  "รออนุมัติ",
    nav_settings:   "จัดการสิทธิ์",
    nav_logout:     "ออกจากระบบ",
    role_admin:     "ผู้ดูแลระบบ",
    role_approver:  "ผู้อนุมัติ",
    role_staff:     "พนักงาน",
    // Dashboard hero
    dash_school:    "โรงเรียนต้นกล้า",
    dash_system:    "ระบบจัดซื้อจัดจ้าง",
    dash_greeting:  "สวัสดีครับ",
    dash_create_po: "สร้าง PO",
    dash_create_jo: "สร้าง JO",
    // KPI strip
    kpi_total:      "ยอดรวม PO",
    kpi_approved:   "อนุมัติแล้ว",
    kpi_pending:    "รออนุมัติ",
    kpi_items:      "รายการ",
    // Stat cards
    stat_all_po:      "PO ทั้งหมด",
    stat_pending_po:  "PO รออนุมัติ",
    stat_all_jo:      "JO ทั้งหมด",
    stat_pending_jo:  "JO รออนุมัติ",
    stat_sub_po:      "ใบสั่งซื้อในระบบ",
    stat_sub_jo:      "ใบจ้างในระบบ",
    stat_sub_wait:    "รอดำเนินการ",
    stat_sub_done:    "ครบทุกใบแล้ว",
    // Dashboard sections
    dash_quick_actions:  "ดำเนินการ",
    dash_recent_po:      "PO ล่าสุด",
    dash_see_all:        "ดูทั้งหมด",
    dash_pending_list:   "รายการที่รออนุมัติ",
    // Approve buttons
    btn_approve: "อนุมัติ",
    btn_reject:  "ไม่อนุมัติ",
    // Quick action labels
    qa_new_po:    "สร้าง PO ใหม่",
    qa_po_sub:    "ใบสั่งซื้อ",
    qa_new_jo:    "สร้าง JO ใหม่",
    qa_jo_sub:    "ใบจ้างงาน",
    qa_suppliers: "ผู้จัดหา",
    qa_sup_sub:   "จัดการข้อมูล",
    qa_items:     "รายการสินค้า",
    qa_items_sub: "ฐานข้อมูล",
    // Table headers
    tbl_number:   "เลขที่",
    tbl_supplier: "ร้านค้า",
    tbl_total:    "ยอดรวม",
    tbl_status:   "สถานะ",
    // Common
    loading: "กำลังโหลด...",
    no_data: "ไม่พบข้อมูล",
    no_po:   "ยังไม่มี PO",
  },
  en: {
    // Nav
    nav_section_main:   "Main",
    nav_section_data:   "Data",
    nav_section_action: "Actions",
    nav_overview:   "Overview",
    nav_po:         "Purchase Orders",
    nav_jo:         "Job Orders",
    nav_suppliers:  "Suppliers",
    nav_items:      "Item Catalog",
    nav_approvals:  "Approvals",
    nav_settings:   "User Management",
    nav_logout:     "Sign out",
    role_admin:     "Administrator",
    role_approver:  "Approver",
    role_staff:     "Staff",
    // Dashboard hero
    dash_school:    "Tonkla School",
    dash_system:    "Procurement System",
    dash_greeting:  "Hello",
    dash_create_po: "New PO",
    dash_create_jo: "New JO",
    // KPI strip
    kpi_total:      "Total PO Value",
    kpi_approved:   "Approved",
    kpi_pending:    "Pending",
    kpi_items:      "items",
    // Stat cards
    stat_all_po:      "Total POs",
    stat_pending_po:  "Pending POs",
    stat_all_jo:      "Total JOs",
    stat_pending_jo:  "Pending JOs",
    stat_sub_po:      "purchase orders in system",
    stat_sub_jo:      "job orders in system",
    stat_sub_wait:    "awaiting action",
    stat_sub_done:    "all cleared",
    // Dashboard sections
    dash_quick_actions:  "Quick Actions",
    dash_recent_po:      "Recent POs",
    dash_see_all:        "See all",
    dash_pending_list:   "Pending Approvals",
    // Approve buttons
    btn_approve: "Approve",
    btn_reject:  "Reject",
    // Quick action labels
    qa_new_po:    "New Purchase Order",
    qa_po_sub:    "Purchase Order",
    qa_new_jo:    "New Job Order",
    qa_jo_sub:    "Job Order",
    qa_suppliers: "Suppliers",
    qa_sup_sub:   "Manage data",
    qa_items:     "Item Catalog",
    qa_items_sub: "Database",
    // Table headers
    tbl_number:   "Number",
    tbl_supplier: "Supplier",
    tbl_total:    "Total",
    tbl_status:   "Status",
    // Common
    loading: "Loading...",
    no_data: "No data found",
    no_po:   "No POs yet",
  },
} as const;

export type TranslationKey = keyof typeof translations.th;
