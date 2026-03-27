/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERMISSION TYPES - SHARED ACROSS CONTEXTS
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type Permission = 
  // POS Module
  | "pos.access"
  | "pos.process_sales"
  | "pos.apply_discounts"
  | "pos.void_sales"
  
  // Inventory Module
  | "inventory.view"
  | "inventory.create"
  | "inventory.edit"
  | "inventory.delete"
  | "inventory.manage_categories"
  
  // Expenses Module
  | "expenses.view"
  | "expenses.create"
  | "expenses.edit"
  | "expenses.delete"
  | "expenses.approve"
  
  // Reports Module
  | "reports.view_sales"
  | "reports.view_inventory"
  | "reports.view_expenses"
  | "reports.view_staff"
  | "reports.export"
  
  // Staff Module
  | "staff.view"
  | "staff.create"
  | "staff.edit"
  | "staff.delete"
  | "staff.manage_attendance"
  | "staff.manage_schedule"
  
  // Suppliers Module
  | "suppliers.view"
  | "suppliers.create"
  | "suppliers.edit"
  | "suppliers.delete"
  | "suppliers.manage_orders"
  
  // Settings Module
  | "settings.view"
  | "settings.edit_business"
  | "settings.manage_branches"
  | "settings.manage_roles";

export const PERMISSION_GROUPS = {
  "POS": [
    { key: "pos.access" as Permission, label: "Access POS Terminal", description: "View and use the POS terminal" },
    { key: "pos.process_sales" as Permission, label: "Process Sales", description: "Complete sales transactions" },
    { key: "pos.apply_discounts" as Permission, label: "Apply Discounts", description: "Apply discounts to sales" },
    { key: "pos.void_sales" as Permission, label: "Void Sales", description: "Cancel or void sales transactions" },
  ],
  "Inventory": [
    { key: "inventory.view" as Permission, label: "View Inventory", description: "View product inventory" },
    { key: "inventory.create" as Permission, label: "Create Products", description: "Add new products to inventory" },
    { key: "inventory.edit" as Permission, label: "Edit Products", description: "Modify existing products" },
    { key: "inventory.delete" as Permission, label: "Delete Products", description: "Remove products from inventory" },
    { key: "inventory.manage_categories" as Permission, label: "Manage Categories", description: "Create and edit product categories" },
  ],
  "Expenses": [
    { key: "expenses.view" as Permission, label: "View Expenses", description: "View expense records" },
    { key: "expenses.create" as Permission, label: "Create Expenses", description: "Record new expenses" },
    { key: "expenses.edit" as Permission, label: "Edit Expenses", description: "Modify expense records" },
    { key: "expenses.delete" as Permission, label: "Delete Expenses", description: "Remove expense records" },
    { key: "expenses.approve" as Permission, label: "Approve Expenses", description: "Approve or reject expense submissions" },
  ],
  "Reports": [
    { key: "reports.view_sales" as Permission, label: "View Sales Reports", description: "Access sales analytics and reports" },
    { key: "reports.view_inventory" as Permission, label: "View Inventory Reports", description: "Access inventory reports" },
    { key: "reports.view_expenses" as Permission, label: "View Expense Reports", description: "Access expense reports" },
    { key: "reports.view_staff" as Permission, label: "View Staff Reports", description: "Access staff attendance and performance reports" },
    { key: "reports.export" as Permission, label: "Export Reports", description: "Download and export reports" },
  ],
  "Staff": [
    { key: "staff.view" as Permission, label: "View Staff", description: "View staff members list" },
    { key: "staff.create" as Permission, label: "Create Staff", description: "Add new staff members" },
    { key: "staff.edit" as Permission, label: "Edit Staff", description: "Modify staff member details" },
    { key: "staff.delete" as Permission, label: "Delete Staff", description: "Remove staff members" },
    { key: "staff.manage_attendance" as Permission, label: "Manage Attendance", description: "View and manage staff attendance" },
    { key: "staff.manage_schedule" as Permission, label: "Manage Schedule", description: "Create and edit work schedules" },
  ],
  "Suppliers": [
    { key: "suppliers.view" as Permission, label: "View Suppliers", description: "View supplier information" },
    { key: "suppliers.create" as Permission, label: "Create Suppliers", description: "Add new suppliers" },
    { key: "suppliers.edit" as Permission, label: "Edit Suppliers", description: "Modify supplier details" },
    { key: "suppliers.delete" as Permission, label: "Delete Suppliers", description: "Remove suppliers" },
    { key: "suppliers.manage_orders" as Permission, label: "Manage Orders", description: "Create and manage purchase orders" },
  ],
  "Settings": [
    { key: "settings.view" as Permission, label: "View Settings", description: "Access settings page" },
    { key: "settings.edit_business" as Permission, label: "Edit Business Settings", description: "Modify business configuration" },
    { key: "settings.manage_branches" as Permission, label: "Manage Branches", description: "Create and edit branch locations" },
    { key: "settings.manage_roles" as Permission, label: "Manage Roles", description: "Create and edit user roles" },
  ],
};
