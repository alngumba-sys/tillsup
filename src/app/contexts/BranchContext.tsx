import { createContext, useContext, useState, useRef, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

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
  createBranch: (name: string, location: string) => { success: boolean; error?: string; branchId?: string };
  updateBranch: (branchId: string, updates: Partial<Omit<Branch, "id" | "businessId" | "createdAt">>) => { success: boolean; error?: string };
  getBranchById: (branchId: string) => Branch | undefined;
  getBranchesForBusiness: (businessId: string) => Branch[];
  getActiveBranches: (businessId: string) => Branch[];
  selectedBranchId: string | null;
  setSelectedBranchId: (branchId: string | null) => void;
  // Role-based access helpers
  canSwitchBranch: () => boolean;
  getAccessibleBranches: () => Branch[];
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════
// LOCAL STORAGE KEY
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY = "pos_branches";
const SELECTED_BRANCH_KEY = "pos_selected_branch";

// ═══════════════════════════════════════════════════════════════════
// BRANCH PROVIDER
// ═══════════════════════════════════════════════════════════════════

export function BranchProvider({ children }: { children: ReactNode }) {
  // ═══════════════════════════════════════════════════════════════════
  // SAFE CONTEXT ACCESS
  // ═══════════════════════════════════════════════════════════════════
  // We wrap useAuth in a try-catch to prevent the entire app from crashing
  // if the AuthContext is not yet available or if there's an initialization error.
  // This is a defensive measure for the critical provider chain.
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn("BranchProvider: AuthContext not available", e);
  }
  
  const auth = authContext;
  const business = auth?.business || null;
  const user = auth?.user || null;
  const branchCounterRef = useRef(0);
  
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────
  // Initialize from localStorage
  // ───────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAllBranches(
          parsed.map((b: Branch) => ({
            ...b,
            createdAt: new Date(b.createdAt)
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load branches from localStorage:", error);
    }

    // Load selected branch
    try {
      const storedSelection = localStorage.getItem(SELECTED_BRANCH_KEY);
      if (storedSelection) {
        setSelectedBranchId(storedSelection);
      }
    } catch (error) {
      console.error("Failed to load selected branch:", error);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────
  // Persist to localStorage
  // ───────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allBranches));
    } catch (error) {
      console.error("Failed to save branches:", error);
    }
  }, [allBranches]);

  useEffect(() => {
    try {
      if (selectedBranchId) {
        localStorage.setItem(SELECTED_BRANCH_KEY, selectedBranchId);
      } else {
        localStorage.removeItem(SELECTED_BRANCH_KEY);
      }
    } catch (error) {
      console.error("Failed to save selected branch:", error);
    }
  }, [selectedBranchId]);

  // ═════��═════════════════════════════════════════════════════════════
  // STRICT BRANCH ENFORCEMENT AT LOGIN
  // ═══════════════════════════════════════════════════════════════════
  // Auto-load assigned branch for staff/managers, clear for owners
  useEffect(() => {
    if (user) {
      if (user.role === "Business Owner") {
        // Business Owner: Can access all branches, no branch lock
        // Do not automatically select a branch
      } else if (user.branchId) {
        // Manager/Staff/Cashier: LOCKED to their assigned branch
        if (selectedBranchId !== user.branchId) {
          setSelectedBranchId(user.branchId);
        }
      }
    }
  }, [user, selectedBranchId]);

  // ───────────────────────────────────────────────────────────────
  // Auto-create default branch for existing businesses
  // ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (business) {
      const hasBranches = allBranches.some(b => b.businessId === business.id);
      
      // Create default "Main Branch" for businesses without branches
      if (!hasBranches) {
        const defaultBranch: Branch = {
          id: `BRANCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: "Main Branch",
          location: "Headquarters",
          businessId: business.id,
          status: "active",
          createdAt: new Date()
        };
        
        setAllBranches(prev => [...prev, defaultBranch]);
        
        // Auto-select this branch for the user
        if (user?.role === "Business Owner") {
          setSelectedBranchId(defaultBranch.id);
        }
      }
    }
  }, [business, user]);

  // ───────────────────────────────────────────────────────────────
  // CREATE BRANCH (Business Owner Only)
  // ───────────────────────────────────────────────────────────────
  const createBranch = (
    name: string,
    location: string
  ): { success: boolean; error?: string; branchId?: string } => {
    if (!business || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Permission check
    if (user.role !== "Business Owner") {
      return { success: false, error: "Only Business Owners can create branches" };
    }

    // Validate inputs
    if (!name.trim()) {
      return { success: false, error: "Branch name is required" };
    }

    // Check for duplicate branch name within business
    const existingBranch = allBranches.find(
      b => b.businessId === business.id && 
           b.name.toLowerCase() === name.toLowerCase()
    );

    if (existingBranch) {
      return { success: false, error: "Branch name already exists" };
    }

    // Create new branch
    // Increment counter to ensure unique IDs even if created in rapid succession
    branchCounterRef.current += 1;
    
    const newBranch: Branch = {
      id: `BRANCH-${Date.now()}-${branchCounterRef.current}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      location: location.trim() || "Not specified",
      businessId: business.id,
      status: "active",
      createdAt: new Date()
    };

    setAllBranches(prev => [...prev, newBranch]);

    return { success: true, branchId: newBranch.id };
  };

  // ───────────────────────────────────────────────────────────────
  // UPDATE BRANCH (Business Owner Only)
  // ───────────────────────────────────────────────────────────────
  const updateBranch = (
    branchId: string,
    updates: Partial<Omit<Branch, "id" | "businessId" | "createdAt">>
  ): { success: boolean; error?: string } => {
    if (!business || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Permission check
    if (user.role !== "Business Owner") {
      return { success: false, error: "Only Business Owners can update branches" };
    }

    // Find branch
    const branch = allBranches.find(
      b => b.id === branchId && b.businessId === business.id
    );

    if (!branch) {
      return { success: false, error: "Branch not found" };
    }

    // Check for duplicate name if name is being updated
    if (updates.name) {
      const duplicate = allBranches.find(
        b => b.businessId === business.id &&
             b.id !== branchId &&
             b.name.toLowerCase() === updates.name!.toLowerCase()
      );

      if (duplicate) {
        return { success: false, error: "Branch name already exists" };
      }
    }

    // Update branch
    setAllBranches(prev =>
      prev.map(b =>
        b.id === branchId ? { ...b, ...updates } : b
      )
    );

    return { success: true };
  };

  // ───────────────────────────────────────────────────────────────
  // GET BRANCH BY ID
  // ───────────────────────────────────────────────────────────────
  const getBranchById = (branchId: string): Branch | undefined => {
    return allBranches.find(b => b.id === branchId);
  };

  // ───────────────────────────────────────────────────────────────
  // GET BRANCHES FOR BUSINESS
  // ───────────────────────────────────────────────────────────────
  const getBranchesForBusiness = (businessId: string): Branch[] => {
    return allBranches.filter(b => b.businessId === businessId);
  };

  // ───────────────────────────────────────────────────────────────
  // GET ACTIVE BRANCHES
  // ────────────────────────────────────────────────────���──────────
  const getActiveBranches = (businessId: string): Branch[] => {
    return allBranches.filter(
      b => b.businessId === businessId && b.status === "active"
    );
  };

  // ───────────────────────────────────────────────────────────────
  // Get branches for current business
  // ───────────────────────────────────────────────────────────────
  const branches = business
    ? allBranches.filter(b => b.businessId === business.id)
    : [];

  // ───────────────────────────────────────────────────────────────
  // Role-based access helpers
  // ───────────────────────────────────────────────────────────────
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

  const value: BranchContextType = {
    branches,
    createBranch,
    updateBranch,
    getBranchById,
    getBranchesForBusiness,
    getActiveBranches,
    selectedBranchId,
    setSelectedBranchId,
    canSwitchBranch,
    getAccessibleBranches
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOOK: Use Branch Context
// ═══════════════════════════════════════════════════════════════════

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}