import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";

console.log("BranchContext module loaded - v3.0 - Supabase Persistence Only");

// ═══════════════════════════════════════════════════════════════════
// BRANCH DATA MODEL
// ═══════════════════════════════════════════════════════════════════

export interface Branch {
  id: string;
  name: string;
  location: string;
  businessId: string;
  status: "active" | "inactive";
  createdAt: Date;
}

interface BranchContextType {
  branches: Branch[];
  createBranch: (name: string, location: string) => Promise<{ success: boolean; error?: string; branchId?: string }>;
  updateBranch: (branchId: string, updates: Partial<Omit<Branch, "id" | "businessId" | "createdAt">>) => Promise<{ success: boolean; error?: string }>;
  deleteBranch: (branchId: string) => Promise<{ success: boolean; error?: string }>;
  getBranchById: (branchId: string) => Branch | undefined;
  getBranchesForBusiness: (businessId: string) => Branch[];
  getActiveBranches: (businessId: string) => Branch[];
  selectedBranchId: string | null;
  setSelectedBranchId: (branchId: string | null) => void;
  // Role-based access helpers
  canSwitchBranch: () => boolean;
  getAccessibleBranches: () => Branch[];
  refreshBranches: () => Promise<void>;
  isLoading: boolean;
  error: any;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════
// BRANCH PROVIDER
// ═══════════════════════════════════════════════════════════════════

export function BranchProvider({ children }: { children: ReactNode }) {
  // Safe context access
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn("BranchProvider: AuthContext not available", e);
  }
  
  const business = authContext?.business || null;
  const user = authContext?.user || null;
  
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Create a default branch if none exists
  const createDefaultBranch = async (businessId: string) => {
    console.log("Creating default Main Branch...");
    const defaultBranch = {
      business_id: businessId,
      name: "Main Branch",
      location: "Headquarters",
      status: "active"
    };

    try {
      const { data, error } = await supabase
        .from('branches')
        .insert(defaultBranch)
        .select()
        .single();

      if (error) {
        console.error("Failed to create default branch:", error);
        setError(error);
      } else if (data) {
        const newBranch: Branch = {
          id: data.id,
          name: data.name,
          location: data.location || "Not specified",
          businessId: data.business_id,
          status: data.status,
          createdAt: new Date(data.created_at)
        };
        setAllBranches(prev => [...prev, newBranch]);
        
        // Auto-select for owner
        if (user?.role === "Business Owner") {
          setSelectedBranchId(newBranch.id);
        }
      }
    } catch (err) {
      console.error("Error creating default branch:", err);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // FETCH BRANCHES FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  const refreshBranches = async () => {
    if (!business) {
      setAllBranches([]);
      setIsLoading(false);
      return;
    }

    // Guard: Prevent query if ID is not a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(business.id);
    if (!isUuid) {
      console.warn("Skipping branches fetch: Business ID is not a valid UUID:", business.id);
      setAllBranches([]);
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('branches')
        .select('id, business_id, name, location, status, created_at')
        .eq('business_id', business.id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error("Error fetching branches:", fetchError);
        setError(fetchError);
        return;
      }

      if (data) {
        const mappedBranches: Branch[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          location: item.location || "Not specified",
          businessId: item.business_id,
          status: item.status || "active",
          createdAt: new Date(item.created_at)
        }));
        setAllBranches(mappedBranches);
        
        // Auto-create default branch if none exist
        if (mappedBranches.length === 0) {
          createDefaultBranch(business.id);
        }
      }
    } catch (err) {
      console.error("Unexpected error fetching branches:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (business) {
      refreshBranches();
    } else {
      setAllBranches([]);
    }
  }, [business?.id]);

  // ═══════════════════════════════════════════════════════════════════
  // STRICT BRANCH ENFORCEMENT & SELECTION
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (user && !isLoading) {
      if (user.role === "Business Owner") {
        // Business Owner: Can access all branches
        // If no branch selected, and branches exist, select the first one
        // Note: Removed localStorage persistence. Defaults to first active branch.
        if (!selectedBranchId && allBranches.length > 0) {
            const firstActive = allBranches.find(b => b.status === "active");
            if (firstActive) setSelectedBranchId(firstActive.id);
        }
      } else if (user.branchId) {
        // Manager/Staff/Cashier: LOCKED to their assigned branch
        if (selectedBranchId !== user.branchId) {
          setSelectedBranchId(user.branchId);
        }
      }
    }
  }, [user, selectedBranchId, allBranches, isLoading]);

  // ───────────────────────────────────────────────────────────────
  // CREATE BRANCH (Business Owner Only)
  // ───────────────────────────────────────────────────────────────
  const createBranch = async (
    name: string,
    location: string
  ): Promise<{ success: boolean; error?: string; branchId?: string }> => {
    if (!business || !user) {
      return { success: false, error: "Not authenticated" };
    }

    if (user.role !== "Business Owner") {
      return { success: false, error: "Only Business Owners can create branches" };
    }

    if (!name.trim()) {
      return { success: false, error: "Branch name is required" };
    }

    // Check for duplicate locally first (optimistic)
    const existingBranch = allBranches.find(
      b => b.businessId === business.id && 
      b.name.toLowerCase() === name.toLowerCase()
    );

    if (existingBranch) {
      return { success: false, error: "Branch name already exists" };
    }

    try {
      const { data, error } = await supabase
        .from('branches')
        .insert({
          business_id: business.id,
          name: name.trim(),
          location: location.trim() || "Not specified",
          status: "active"
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating branch:", error);
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02'].includes(error.code)) {
            setError(error);
        }
        return { success: false, error: error.message };
      }

      await refreshBranches();
      return { success: true, branchId: data.id };
    } catch (err: any) {
      console.error("Unexpected error creating branch:", err);
      return { success: false, error: "Unexpected error occurred" };
    }
  };

  // ───────────────────────────────────────────────────────────────
  // UPDATE BRANCH (Business Owner Only)
  // ───────────────────────────────────────────────────────────────
  const updateBranch = async (
    branchId: string,
    updates: Partial<Omit<Branch, "id" | "businessId" | "createdAt">>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!business || !user) return { success: false, error: "Not authenticated" };
    if (user.role !== "Business Owner") return { success: false, error: "Permission denied" };

    try {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.location) dbUpdates.location = updates.location;
      if (updates.status) dbUpdates.status = updates.status;

      const { error } = await supabase
        .from('branches')
        .update(dbUpdates)
        .eq('id', branchId)
        .eq('business_id', business.id);

      if (error) {
        console.error("Error updating branch:", error);
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02'].includes(error.code)) {
            setError(error);
        }
        return { success: false, error: error.message };
      }

      await refreshBranches();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Unexpected error" };
    }
  };

  // ───────────────────────────────────────────────────────────────
  // DELETE BRANCH (Business Owner Only)
  // ───────────────────────────────────────────────────────────────
  const deleteBranch = async (branchId: string): Promise<{ success: boolean; error?: string }> => {
    if (!business || !user) return { success: false, error: "Not authenticated" };
    if (user.role !== "Business Owner") return { success: false, error: "Permission denied" };

    try {
      // 1. Attempt to use the optimized RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_branch_v3', { 
        payload: { branch_id: branchId } 
      });

      if (!rpcError && rpcData) {
        if (rpcData.success) {
           setAllBranches(prev => prev.filter(b => b.id !== branchId));
           if (selectedBranchId === branchId) {
             setSelectedBranchId(null);
           }
           return { success: true };
        } else {
           return { success: false, error: rpcData.error };
        }
      }
      
      console.warn("RPC delete failed, falling back to client-side logic:", rpcError);
    } catch (rpcErr) {
      console.warn("RPC call error:", rpcErr);
    }

    // 2. Client-side Fallback
    try {
      // Check for dependencies
      const checkOp = Promise.all([
        supabase.from('profiles').select('id').eq('branch_id', branchId).limit(1),
        supabase.from('inventory').select('id').eq('branch_id', branchId).limit(1),
        supabase.from('sales').select('id').eq('branch_id', branchId).limit(1),
        supabase.from('expenses').select('id').eq('branch_id', branchId).limit(1),
        supabase.from('attendance').select('id').eq('branch_id', branchId).limit(1),
        supabase.from('clock_in_sessions').select('id').eq('branch_id', branchId).limit(1)
      ]);

      const checkTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Dependency check timed out")), 5000)
      );

      try {
        const results = await Promise.race([checkOp, checkTimeout]) as any[];
        const [staffCheck, inventoryCheck, salesCheck, expensesCheck, attendanceCheck, clockInCheck] = results;

        const depErrors = [];
        if (staffCheck.data?.length > 0) depErrors.push("staff members");
        if (inventoryCheck.data?.length > 0) depErrors.push("products");
        if (salesCheck.data?.length > 0) depErrors.push("sales records");
        if (expensesCheck.data?.length > 0) depErrors.push("expenses");
        if (attendanceCheck.data?.length > 0) depErrors.push("attendance records");
        if (clockInCheck.data?.length > 0) depErrors.push("clock-in sessions");

        if (depErrors.length > 0) {
          return {
            success: false,
            error: `Cannot delete branch because it has associated data: ${depErrors.join(", ")}. Please deactivate it instead.`
          };
        }
      } catch (checkError: any) {
        return { 
          success: false, 
          error: "Unable to verify branch data. Please refresh the page and try again." 
        };
      }

      // Execute delete operation
      const deleteOp = async () => {
        return await supabase
          .from('branches')
          .delete()
          .eq('id', branchId)
          .eq('business_id', business.id);
      };

      const timeoutPromise = new Promise<{ error: any }>((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out - Server busy")), 15000)
      );

      const result: any = await Promise.race([deleteOp(), timeoutPromise]);
      const error = result.error;

      if (error) {
        if (error.code === '23503') {
           return { 
             success: false, 
             error: "Cannot delete this branch because it has associated records. Please deactivate it instead." 
           };
        }
        return { success: false, error: error.message };
      }

      setAllBranches(prev => prev.filter(b => b.id !== branchId));
      
      if (selectedBranchId === branchId) {
        setSelectedBranchId(null);
      }
      
      return { success: true };
    } catch (err: any) {
      if (err.message?.includes("timed out")) {
        return { 
          success: false, 
          error: "The server is busy. Please try deactivating the branch instead." 
        };
      }
      return { success: false, error: err.message || "Unexpected error occurred" };
    }
  };

  const getBranchById = (branchId: string): Branch | undefined => {
    return allBranches.find(b => b.id === branchId);
  };

  const getBranchesForBusiness = (businessId: string): Branch[] => {
    return allBranches.filter(b => b.businessId === businessId);
  };

  const getActiveBranches = (businessId: string): Branch[] => {
    return allBranches.filter(
      b => b.businessId === businessId && b.status === "active"
    );
  };

  const branches = business
    ? allBranches.filter(b => b.businessId === business.id)
    : [];

  const canSwitchBranch = (): boolean => {
    return user?.role === "Business Owner";
  };

  const getAccessibleBranches = (): Branch[] => {
    if (user?.role === "Business Owner") {
      return branches;
    } else if (user?.branchId) {
      const branch = getBranchById(user.branchId);
      return branch ? [branch] : [];
    }
    return [];
  };

  const value: BranchContextType = useMemo(() => ({
    branches,
    createBranch,
    updateBranch,
    deleteBranch,
    getBranchById,
    getBranchesForBusiness,
    getActiveBranches,
    selectedBranchId,
    setSelectedBranchId,
    canSwitchBranch,
    getAccessibleBranches,
    refreshBranches,
    isLoading,
    error
  }), [branches, selectedBranchId, isLoading, error, business, user]);

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    return {
      branches: [],
      createBranch: async () => ({ success: false, error: "BranchContext missing" }),
      updateBranch: async () => ({ success: false, error: "BranchContext missing" }),
      deleteBranch: async () => ({ success: false, error: "BranchContext missing" }),
      getBranchById: () => undefined,
      getBranchesForBusiness: () => [],
      getActiveBranches: () => [],
      selectedBranchId: null,
      setSelectedBranchId: () => {},
      canSwitchBranch: () => false,
      getAccessibleBranches: () => [],
      refreshBranches: async () => {},
      isLoading: false,
      error: "BranchContext missing (Safe Mode)"
    } as BranchContextType;
  }
  return context;
}
