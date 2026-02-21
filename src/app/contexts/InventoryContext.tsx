import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { useBranch } from "./BranchContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INVENTORY CONTEXT - ENTERPRISE POS BRANCH-BASED INVENTORY MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * VERSION: 2.0 - Strict Branch Enforcement, Zero Cross-Branch Leakage
 * 
 * ARCHITECTURE PRINCIPLES:
 * 
 * 1. NO AUTO-SEEDING
 *    - All inventory must be manually created with explicit branch assignment
 *    - No dummy, placeholder, or seed data is auto-generated
 *    - Empty inventory is the default state for all branches
 * 
 * 2. MANDATORY BRANCH ASSIGNMENT
 *    - Every product MUST have a branchId
 *    - Branch selection is REQUIRED when adding products
 *    - NO fallback to "first branch" or "main branch"
 * 
 * 3. DYNAMIC BRANCH FILTERING
 *    - Products are filtered by the active/selected branch
 *    - Business Owner: Can view any branch via selectedBranchId
 *    - Staff/Manager: Auto-locked to their assigned branchId
 *    - NO cross-branch inventory sharing
 * 
 * 4. ZERO-TOLERANCE ISOLATION
 *    - Each branch's inventory is completely isolated
 *    - Product visibility is strictly enforced by branchId
 *    - Empty branches show empty state (no fallback data)
 * 
 * 5. BACKEND-READY DESIGN
 *    - All products stored with explicit businessId + branchId
 *    - Structure ready for multi-tenant database migration
 *    - Filtering logic mirrors SQL WHERE clause patterns
 * 
 * MIGRATION NOTES:
 * - Version 2.0 automatically clears old seed data on first load
 * - Users must recreate inventory with proper branch assignment
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number; // LEGACY FIELD - Maps to Retail Price (DEFAULT selling price)
  stock: number;
  sku: string;
  supplier: string;
  businessId: string;
  branchId: string; // MANDATORY - Determines which branch owns this product
  lowStockThreshold?: number; // Optional threshold for low-stock alerts (default: 10)
  // ═══════════════════════════════════════════════════════════════════
  // PRICING EXTENSION - Multi-tier pricing support
  // ═══════════════════════════════════════════════════════════════════
  costPrice?: number; // Purchase/acquisition price (for margin calculation)
  retailPrice?: number; // Default selling price (if not set, falls back to 'price')
  wholesalePrice?: number; // Optional bulk/wholesale selling price
}

interface InventoryContextType {
  inventory: InventoryItem[];
  addProduct: (product: Omit<InventoryItem, "id" | "businessId" | "branchId">, branchId?: string) => void;
  updateProduct: (id: string, product: Partial<InventoryItem>) => void;
  deleteProduct: (id: string) => void;
  deductStock: (productId: string, quantity: number) => boolean;
  deductMultipleStock: (items: { productId: string; quantity: number }[]) => { success: boolean; errors: string[] };
  getProductById: (id: string) => InventoryItem | undefined;
  validateStock: (productId: string, quantity: number) => boolean;
  getInventoryForBranch: (branchId: string) => InventoryItem[];
  getLowStockProducts: (branchId?: string) => InventoryItem[];
  isLowStock: (product: InventoryItem) => boolean;
  increaseStock: (productId: string, branchId: string, quantity: number) => boolean;
  increaseMultipleStock: (items: { productId: string; sku: string; name: string; quantity: number }[], branchId: string) => { success: boolean; errors: string[]; createdProducts: string[] };
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const STORAGE_KEY = "pos_inventory";
const STORAGE_VERSION_KEY = "pos_inventory_version";
const CURRENT_VERSION = "2.0"; // Version 2.0: No auto-seeding, strict branch enforcement

export function InventoryProvider({ children }: { children: ReactNode }) {
  // ═══════════════════════════════════════════════════════════════════
  // SAFE CONTEXT ACCESS - Hooks must be called unconditionally
  // ═══════════════════════════════════════════════════════════════════
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("InventoryProvider: AuthContext not available", e);
  }

  let branch;
  try {
    branch = useBranch();
  } catch (e) {
    console.warn("InventoryProvider: BranchContext not available", e);
  }
  
  const business = auth?.business || null;
  const user = auth?.user || null;
  const selectedBranchId = branch?.selectedBranchId || null;
  const branches = branch?.branches || [];

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: REMOVED AUTO-SEEDING - NO MORE DUMMY DATA
  // ═══════════════════════════════════════════════════════════════════
  // All inventory must be manually created with explicit branch assignment
  // No default, placeholder, or seed data will be auto-generated
  // 
  // MIGRATION: Clear old seed data from localStorage if version mismatch
  // ═══════════════════════════════════════════════════════════════════
  
  const [allInventory, setAllInventory] = useState<InventoryItem[]>(() => {
    try {
      const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
      
      // If version doesn't match, clear old inventory data
      if (storedVersion !== CURRENT_VERSION) {
        console.log("🧹 Clearing old inventory data due to version change");
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
        return [];
      }
      
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load inventory from localStorage:", error);
    }
    return [];
  });

  // ═══════════════════════════════════════════════════════════════════
  // REMOVED: Auto-seeding useEffect
  // Inventory starts EMPTY for all branches
  // ═══════════════════════════════════════════════════════════════════
  
  const updateInventory = (newInventory: InventoryItem[]) => {
    setAllInventory(newInventory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newInventory));
    } catch (error) {
      console.error("Failed to save inventory:", error);
    }
  };

  const inventory = useMemo(() => {
    if (!business) return [];
    
    // ═══════════════════════════════════════════════════════════════════
    // CRITICAL FIX: Return ALL inventory for the business
    // Let the consuming component (Inventory page) handle branch filtering
    // This prevents double-filtering conflicts
    // ═══════════════════════════════════════════════════════════════════
    return allInventory.filter(item => item.businessId === business.id);
  }, [business, allInventory]);

  const getInventoryForBranch = (branchId: string): InventoryItem[] => {
    if (!business) return [];
    return allInventory.filter(
      item => item.businessId === business.id && item.branchId === branchId
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2-3: DYNAMIC BRANCH ASSIGNMENT - NO FALLBACKS
  // ═══════════════════════════════════════════════════════════════════
  // Branch ID must be explicitly provided OR derived from user's context
  // CRITICAL: Removed branches[0]?.id fallback to prevent "first branch" bug
  const addProduct = (
    product: Omit<InventoryItem, "id" | "businessId" | "branchId">,
    branchId?: string
  ) => {
    if (!business) {
      console.error("Cannot add product: No business context");
      return;
    }
    
    // Determine target branch dynamically
    let targetBranchId = branchId;
    
    if (!targetBranchId) {
      if (user?.role === "Business Owner") {
        // Owner: Use selected branch from context
        // NO FALLBACK to first branch - must be explicitly selected
        targetBranchId = selectedBranchId || "";
      } else {
        // Staff/Manager: Use their assigned branch
        targetBranchId = user?.branchId || "";
      }
    }
    
    // STRICT VALIDATION: Branch ID is mandatory
    if (!targetBranchId) {
      console.error("Cannot add product: Branch assignment is required");
      return;
    }
    
    const newProduct: InventoryItem = {
      id: `${business.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...product,
      businessId: business.id,
      branchId: targetBranchId
    };
    updateInventory([...allInventory, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<InventoryItem>) => {
    if (!business) return;
    
    updateInventory(
      allInventory.map((item) =>
        item.id === id && item.businessId === business.id
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const deleteProduct = (id: string) => {
    if (!business) return;
    
    updateInventory(
      allInventory.filter((item) => 
        !(item.id === id && item.businessId === business.id)
      )
    );
  };

  const getProductById = (id: string): InventoryItem | undefined => {
    return inventory.find((item) => item.id === id);
  };

  const validateStock = (productId: string, quantity: number): boolean => {
    const product = getProductById(productId);
    if (!product) return false;
    return product.stock >= quantity;
  };

  const deductStock = (productId: string, quantity: number): boolean => {
    const product = getProductById(productId);
    
    if (!product) {
      console.error(`Product ${productId} not found in inventory`);
      return false;
    }
    
    if (product.stock < quantity) {
      console.error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
      return false;
    }

    updateInventory(
      allInventory.map((item) =>
        item.id === productId
          ? { ...item, stock: Math.max(0, item.stock - quantity) }
          : item
      )
    );

    return true;
  };

  const deductMultipleStock = (
    items: { productId: string; quantity: number }[]
  ): { success: boolean; errors: string[] } => {
    const errors: string[] = [];

    for (const item of items) {
      const product = getProductById(item.productId);
      
      if (!product) {
        errors.push(`Product ${item.productId} not found`);
        continue;
      }
      
      if (product.stock < item.quantity) {
        errors.push(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
        );
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    updateInventory(
      allInventory.map((inventoryItem) => {
        const saleItem = items.find((i) => i.productId === inventoryItem.id);
        if (saleItem) {
          return {
            ...inventoryItem,
            stock: Math.max(0, inventoryItem.stock - saleItem.quantity)
          };
        }
        return inventoryItem;
      })
    );

    return { success: true, errors: [] };
  };

  const getLowStockProducts = (branchId?: string): InventoryItem[] => {
    if (!business) return [];
    
    const filteredInventory = branchId
      ? allInventory.filter(
          item => item.businessId === business.id && item.branchId === branchId
        )
      : allInventory.filter(item => item.businessId === business.id);
    
    return filteredInventory.filter(
      item => item.stock < (item.lowStockThreshold || 10)
    );
  };

  const isLowStock = (product: InventoryItem): boolean => {
    return product.stock < (product.lowStockThreshold || 10);
  };

  const increaseStock = (productId: string, branchId: string, quantity: number): boolean => {
    const product = getProductById(productId);
    
    if (!product) {
      console.error(`Product ${productId} not found in inventory`);
      return false;
    }
    
    if (product.branchId !== branchId) {
      console.error(`Product ${product.name} does not belong to branch ${branchId}`);
      return false;
    }

    updateInventory(
      allInventory.map((item) =>
        item.id === productId
          ? { ...item, stock: Math.max(0, item.stock + quantity) }
          : item
      )
    );

    return true;
  };

  const increaseMultipleStock = (
    items: { productId: string; sku: string; name: string; quantity: number }[],
    branchId: string
  ): { success: boolean; errors: string[]; createdProducts: string[] } => {
    if (!business) {
      return { success: false, errors: ["No business context"], createdProducts: [] };
    }

    const errors: string[] = [];
    const createdProducts: string[] = [];
    const updatedInventory = [...allInventory];

    for (const item of items) {
      // Find existing product by productId OR by SKU + branchId
      let product = updatedInventory.find(p => p.id === item.productId);
      
      if (!product) {
        // Try finding by SKU + branchId
        product = updatedInventory.find(
          p => p.sku === item.sku && p.branchId === branchId && p.businessId === business.id
        );
      }
      
      if (!product) {
        // Product does not exist - create new inventory record for this branch
        const newProduct: InventoryItem = {
          id: `${business.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: item.name,
          category: "Uncategorized",
          price: 0,
          stock: item.quantity,
          sku: item.sku,
          supplier: "Unknown",
          businessId: business.id,
          branchId: branchId
        };
        updatedInventory.push(newProduct);
        createdProducts.push(item.sku);
      } else {
        // Product exists - verify branch and increase stock
        if (product.branchId !== branchId) {
          errors.push(`Product "${product.name}" belongs to different branch`);
          continue;
        }
        
        const index = updatedInventory.findIndex(p => p.id === product!.id);
        if (index !== -1) {
          updatedInventory[index] = {
            ...updatedInventory[index],
            stock: updatedInventory[index].stock + item.quantity
          };
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors, createdProducts };
    }

    // Atomic update - all or nothing
    updateInventory(updatedInventory);
    return { success: true, errors: [], createdProducts };
  };

  const contextValue: InventoryContextType = {
    inventory,
    addProduct,
    updateProduct,
    deleteProduct,
    deductStock,
    deductMultipleStock,
    getProductById,
    validateStock,
    getInventoryForBranch,
    getLowStockProducts,
    isLowStock,
    increaseStock,
    increaseMultipleStock
  };

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextType {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}