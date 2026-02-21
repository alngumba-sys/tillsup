import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROLE CONTEXT - ROLE-BASED ACCESS CONTROL (RBAC)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ARCHITECTURE PRINCIPLES:
 * 
 * 1. ROLES ARE PERMISSION CONTAINERS
 *    - Roles group multiple permissions
 *    - Staff inherit permissions from their assigned role
 *    - Permissions are NEVER assigned directly to staff
 * 
 * 2. BUSINESS-LEVEL ROLES
 *    - Roles are shared across all branches within a business
 *    - Each role belongs to a specific business (businessId)
 *    - Roles are NOT branch-specific
 * 
 * 3. SOFT DELETE (DISABLE/ENABLE)
 *    - Roles can be disabled instead of hard-deleted
 *    - Disabled roles won't appear in staff creation dropdown
 *    - Historical staff retain role reference
 * 
 * 4. REQUIRED FOR STAFF
 *    - Staff must have a roleId (not just a role name)
 *    - Staff creation is blocked if no active roles exist
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Permission structure grouped by module
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

export interface Role {
  id: string;
  name: string;
  description: string;
  businessId: string;
  permissions: Permission[];
  isSystemRole: boolean; // Flag for default/system roles
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

interface RoleContextType {
  roles: Role[];
  activeRoles: Role[];
  addRole: (role: Omit<Role, "id" | "businessId" | "createdAt" | "updatedAt" | "status">) => void;
  updateRole: (id: string, role: Partial<Role>) => void;
  disableRole: (id: string) => void;
  enableRole: (id: string) => void;
  getRoleById: (id: string) => Role | undefined;
  getRoleByName: (name: string) => Role | undefined;
  hasPermission: (roleId: string, permission: Permission) => boolean;
  getPermissionsForRole: (roleId: string) => Permission[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const STORAGE_KEY = "pos_roles";

// ═══════════════════════════════════════════════════════════════════
// DEFAULT SYSTEM ROLES WITH PERMISSIONS
// ═══════════════════════════════════════════════════════════════════
const getDefaultSystemRoles = (businessId: string): Omit<Role, "id" | "createdAt" | "updatedAt">[] => [
  {
    name: "Manager",
    description: "Full access to branch operations including staff management and reports",
    businessId,
    isSystemRole: true,
    status: "active" as const,
    permissions: [
      "pos.access", "pos.process_sales", "pos.apply_discounts", "pos.void_sales",
      "inventory.view", "inventory.create", "inventory.edit", "inventory.delete", "inventory.manage_categories",
      "expenses.view", "expenses.create", "expenses.edit", "expenses.approve",
      "reports.view_sales", "reports.view_inventory", "reports.view_expenses", "reports.view_staff", "reports.export",
      "staff.view", "staff.create", "staff.edit", "staff.manage_attendance", "staff.manage_schedule",
      "suppliers.view", "suppliers.create", "suppliers.edit", "suppliers.manage_orders",
      "settings.view"
    ]
  },
  {
    name: "Cashier",
    description: "Point of sale operations and basic inventory viewing",
    businessId,
    isSystemRole: true,
    status: "active" as const,
    permissions: [
      "pos.access", "pos.process_sales",
      "inventory.view"
    ]
  },
  {
    name: "Accountant",
    description: "Financial reports, expenses, and read-only access to sales data",
    businessId,
    isSystemRole: true,
    status: "active" as const,
    permissions: [
      "expenses.view", "expenses.create", "expenses.edit", "expenses.approve",
      "reports.view_sales", "reports.view_expenses", "reports.export",
      "inventory.view"
    ]
  },
  {
    name: "Staff",
    description: "General staff member with basic access to POS and inventory",
    businessId,
    isSystemRole: true,
    status: "active" as const,
    permissions: [
      "pos.access", "pos.process_sales",
      "inventory.view"
    ]
  }
];

export function RoleProvider({ children }: { children: ReactNode }) {
  // ═══════════════════════════════════════════════════════════════════
  // SAFE CONTEXT ACCESS
  // ═══════════════════════════════════════════════════════════════════
  // We wrap useAuth in a try-catch to prevent the entire app from crashing
  // if the AuthContext is not yet available or if there's an initialization error.
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn("RoleProvider: AuthContext not available", e);
  }
  
  const business = authContext?.business;

  const [allRoles, setAllRoles] = useState<Role[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load roles from localStorage:", error);
    }
    return [];
  });

  const updateRoles = (newRoles: Role[]) => {
    setAllRoles(newRoles);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRoles));
    } catch (error) {
      console.error("Failed to save roles:", error);
    }
  };

  // Filter roles by current business
  const roles = business
    ? allRoles.filter((role) => role.businessId === business.id)
    : [];

  // Get only active roles (for staff creation dropdown)
  const activeRoles = roles.filter((role) => role.status === "active");

  const addRole = (role: Omit<Role, "id" | "businessId" | "createdAt" | "updatedAt" | "status">) => {
    if (!business) {
      console.error("Cannot add role: No business context");
      return;
    }

    const newRole: Role = {
      ...role,
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      businessId: business.id,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateRoles([...allRoles, newRole]);
  };

  const updateRole = (id: string, updates: Partial<Role>) => {
    const updated = allRoles.map((role) =>
      role.id === id
        ? { ...role, ...updates, updatedAt: new Date().toISOString() }
        : role
    );
    updateRoles(updated);
  };

  const disableRole = (id: string) => {
    updateRole(id, { status: "disabled" });
  };

  const enableRole = (id: string) => {
    updateRole(id, { status: "active" });
  };

  const getRoleById = (id: string): Role | undefined => {
    return roles.find((role) => role.id === id);
  };

  const getRoleByName = (name: string): Role | undefined => {
    return roles.find((role) => role.name.toLowerCase() === name.toLowerCase());
  };

  const hasPermission = (roleId: string, permission: Permission): boolean => {
    const role = getRoleById(roleId);
    return role ? role.permissions.includes(permission) : false;
  };

  const getPermissionsForRole = (roleId: string): Permission[] => {
    const role = getRoleById(roleId);
    return role ? role.permissions : [];
  };

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-SEED DEFAULT SYSTEM ROLES FOR NEW BUSINESSES
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (business && roles.length === 0) {
      // This business has no roles yet - seed with default system roles
      const defaultRoles = getDefaultSystemRoles(business.id);
      const rolesWithIds: Role[] = defaultRoles.map((role) => ({
        ...role,
        id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      updateRoles([...allRoles, ...rolesWithIds]);
      console.log(`Auto-seeded ${rolesWithIds.length} default system roles for business ${business.id}`);
    }
  }, [business?.id, roles.length]); // Run when business changes or roles length changes

  return (
    <RoleContext.Provider
      value={{
        roles,
        activeRoles,
        addRole,
        updateRole,
        disableRole,
        enableRole,
        getRoleById,
        getRoleByName,
        hasPermission,
        getPermissionsForRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}