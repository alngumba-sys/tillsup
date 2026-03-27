import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { isPreviewMode } from "../utils/previewMode";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROLE CONTEXT - ROLE-BASED ACCESS CONTROL (RBAC)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Permission, PERMISSION_GROUPS } from "../types/permissions";

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
  addRole: (role: Omit<Role, "id" | "businessId" | "createdAt" | "updatedAt" | "status">) => Promise<void>;
  updateRole: (id: string, role: Partial<Role>) => Promise<void>;
  disableRole: (id: string) => Promise<void>;
  enableRole: (id: string) => Promise<void>;
  getRoleById: (id: string) => Role | undefined;
  getRoleByName: (name: string) => Role | undefined;
  hasPermission: (roleId: string, permission: Permission) => boolean;
  getPermissionsForRole: (roleId: string) => Permission[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

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
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn("RoleProvider: AuthContext not available", e);
  }
  
  const business = authContext?.business;

  const [roles, setRoles] = useState<Role[]>([]);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!business) {
      setRoles([]);
      return;
    }

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('*')
          .eq('business_id', business.id);

        if (error) throw error;

        if (data && data.length > 0) {
          setRoles(data.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            businessId: r.business_id,
            permissions: r.permissions || [],
            isSystemRole: r.is_system_role,
            status: r.status as "active" | "disabled",
            createdAt: r.created_at,
            updatedAt: r.updated_at
          })));
        } else {
          // No roles found - seed default roles
          await seedDefaultRoles(business.id);
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
      }
    };

    fetchRoles();
  }, [business]);

  // Helper for generating UUIDs
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const seedDefaultRoles = async (businessId: string) => {
    // Preview mode: Skip seeding
    if (isPreviewMode()) {
      console.log("🎨 Preview mode: Skipping role seeding");
      return;
    }

    // Guard: Don't seed roles if business ID is not a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId);
    if (!isUuid) {
      console.warn("Skipping role seeding: Business ID is not a valid UUID:", businessId);
      return;
    }

    const defaultRoles = getDefaultSystemRoles(businessId);
    
    try {
      const rolesToInsert = defaultRoles.map(role => ({
        id: generateUUID(),
        name: role.name,
        description: role.description,
        business_id: role.businessId,
        permissions: role.permissions,
        is_system_role: role.isSystemRole,
        status: role.status
      }));

      console.log("Seeding roles:", rolesToInsert);

      const { data, error } = await supabase
        .from('roles')
        .insert(rolesToInsert)
        .select();

      if (error) throw error;

      if (data) {
        setRoles(data.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          businessId: r.business_id,
          permissions: r.permissions || [],
          isSystemRole: r.is_system_role,
          status: r.status as "active" | "disabled",
          createdAt: r.created_at,
          updatedAt: r.updated_at
        })));
        console.log(`Auto-seeded ${data.length} default system roles`);
      }
    } catch (err) {
      console.error("Error seeding default roles:", err);
    }
  };

  // Get only active roles
  const activeRoles = roles.filter((role) => role.status === "active");

  const addRole = async (role: Omit<Role, "id" | "businessId" | "createdAt" | "updatedAt" | "status">) => {
    if (!business) {
      console.error("Cannot add role: No business context");
      return;
    }

    try {
      const dbRole = {
        id: generateUUID(),
        name: role.name,
        description: role.description,
        business_id: business.id,
        permissions: role.permissions,
        is_system_role: role.isSystemRole,
        status: "active"
      };

      const { data, error } = await supabase
        .from('roles')
        .insert(dbRole)
        .select()
        .single();

      if (error) throw error;

      const newRole: Role = {
        id: data.id,
        name: data.name,
        description: data.description,
        businessId: data.business_id,
        permissions: data.permissions,
        isSystemRole: data.is_system_role,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setRoles(prev => [...prev, newRole]);
      toast.success("Role created successfully");
    } catch (err: any) {
      console.error("Error adding role:", err);
      toast.error("Failed to create role");
    }
  };

  const updateRole = async (id: string, updates: Partial<Role>) => {
    try {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { error } = await supabase
        .from('roles')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setRoles(prev => prev.map(role => 
        role.id === id 
          ? { ...role, ...updates, updatedAt: dbUpdates.updated_at } 
          : role
      ));
      
      toast.success("Role updated successfully");
    } catch (err: any) {
      console.error("Error updating role:", err);
      toast.error("Failed to update role");
    }
  };

  const disableRole = async (id: string) => {
    await updateRole(id, { status: "disabled" });
  };

  const enableRole = async (id: string) => {
    await updateRole(id, { status: "active" });
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
