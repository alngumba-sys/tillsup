import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * INVENTORY CONTEXT - ENTERPRISE POS BRANCH-BASED INVENTORY MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * VERSION: 3.0 - Supabase Persistence
 * 
 * ARCHITECTURE PRINCIPLES:
 * 
 * 1. SUPABASE BACKEND
 *    - All inventory data is persisted in the 'inventory' table
 *    - Real-time synchronization (optional, can be added later)
 * 
 * 2. MANDATORY BRANCH ASSIGNMENT
 *    - Every product MUST have a branchId
 *    - Branch selection is REQUIRED when adding products
 * 
 * 3. ZERO-TOLERANCE ISOLATION
 *    - Each branch's inventory is completely isolated
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
  image?: string; // Product image URL
  // ═══════════════════════════════════════════════════════════════════
  // PRICING EXTENSION - Multi-tier pricing support
  // ═══════════════════════════════════════════════════════════════════
  costPrice?: number; // Purchase/acquisition price (for margin calculation)
  retailPrice?: number; // Default selling price (if not set, falls back to 'price')
  wholesalePrice?: number; // Optional bulk/wholesale selling price
}

interface InventoryContextType {
  inventory: InventoryItem[];
  addProduct: (product: Omit<InventoryItem, "id" | "businessId" | "branchId">, branchId?: string) => Promise<void>;
  updateProduct: (id: string, product: Partial<InventoryItem>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deductStock: (productId: string, quantity: number) => Promise<boolean>;
  deductMultipleStock: (items: { productId: string; quantity: number }[]) => Promise<{ success: boolean; errors: string[] }>;
  getProductById: (id: string) => InventoryItem | undefined;
  validateStock: (productId: string, quantity: number) => boolean;
  getInventoryForBranch: (branchId: string) => InventoryItem[];
  getLowStockProducts: (branchId?: string) => InventoryItem[];
  isLowStock: (product: InventoryItem) => boolean;
  increaseStock: (productId: string, branchId: string, quantity: number) => Promise<boolean>;
  increaseMultipleStock: (items: { productId: string; sku: string; name: string; quantity: number }[], branchId: string) => Promise<{ success: boolean; errors: string[]; createdProducts: string[] }>;
  refreshInventory: () => Promise<void>;
  error: any;
}

export const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  // ═══════════════════════════════════════════════════════════════════
  // SAFE CONTEXT ACCESS - Hooks must be called unconditionally
  // ══════════════════════════════════════════════════════════════════
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("InventoryProvider: AuthContext not available", e);
  }

  const business = auth?.business || null;
  const user = auth?.user || null;

  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<any>(null);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH INVENTORY FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  const refreshInventory = async () => {
    if (!business) return;

    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('business_id', business.id);

      if (fetchError) {
        console.error("Error fetching inventory:", fetchError);
        // Check for schema errors to show fix UI
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(fetchError.code)) {
            setError(fetchError);
        } else {
            setError(fetchError);
        }
        return;
      }

      if (data) {
        const mappedInventory: InventoryItem[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: Number(item.retail_price || item.price || 0),
          stock: Number(item.stock || 0),
          sku: item.sku || "",
          supplier: item.supplier || "",
          image: item.image,
          businessId: item.business_id,
          branchId: item.branch_id,
          lowStockThreshold: Number(item.low_stock_threshold || 10),
          costPrice: item.cost_price ? Number(item.cost_price) : undefined,
          retailPrice: item.retail_price ? Number(item.retail_price) : Number(item.price || 0),
          wholesalePrice: item.wholesale_price ? Number(item.wholesale_price) : undefined,
        }));
        setAllInventory(mappedInventory);
      }
    } catch (err) {
      console.error("Unexpected error fetching inventory:", err);
    }
  };

  useEffect(() => {
    if (business) {
      refreshInventory();
    } else {
      setAllInventory([]);
    }
  }, [business]);

  const inventory = useMemo(() => {
    if (!business) return [];
    return allInventory.filter(item => item.businessId === business.id);
  }, [business, allInventory]);

  const getInventoryForBranch = (branchId: string): InventoryItem[] => {
    if (!business) return [];
    return allInventory.filter(
      item => item.businessId === business.id && item.branchId === branchId
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // SUPABASE ACTIONS
  // ═══════════════════════════════════════════════════════════════════
  
  const addProduct = async (
    product: Omit<InventoryItem, "id" | "businessId" | "branchId">,
    branchId?: string
  ) => {
    if (!business) {
      console.error("Cannot add product: No business context");
      toast.error("Authentication Error: Business context missing. Please refresh.");
      return;
    }
    
    // Determine target branch dynamically
    let targetBranchId = branchId;
    
    if (!targetBranchId) {
      if (user?.role === "Business Owner") {
        // Business Owner must select a branch when adding products
        // targetBranchId = ""; // No default fallback, caller must provide it
      } else {
        targetBranchId = user?.branchId || "";
      }
    }
    
    if (!targetBranchId) {
      console.error("Cannot add product: Branch assignment is required");
      toast.error("Branch assignment is required");
      return;
    }
    
    const newItem = {
      business_id: business.id,
      branch_id: targetBranchId,
      name: product.name,
      category: product.category,
      price: product.price, // Fallback
      retail_price: product.retailPrice || product.price,
      cost_price: product.costPrice,
      wholesale_price: product.wholesalePrice,
      stock: product.stock,
      sku: product.sku,
      supplier: product.supplier,
      image: product.image,
      low_stock_threshold: product.lowStockThreshold || 10
    };

    console.log("Adding product to Supabase:", newItem);

    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert(newItem)
        .select()
        .single();

      if (error) {
        console.error("Error adding product:", error);
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(error.code)) {
            setError(error);
            // Don't toast if we are showing the large schema error alert
        } else {
            toast.error("Failed to add product: " + (error.message || "Unknown error"));
        }
        return;
      }

      if (data) {
        // Optimistically update local state or refresh
        await refreshInventory();
      }
    } catch (err) {
      console.error("Unexpected error adding product:", err);
    }
  };

  const updateProduct = async (id: string, updates: Partial<InventoryItem>) => {
    if (!business) return;
    
    console.log('🔵 updateProduct called with:', { id, updates });
    
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.supplier !== undefined) dbUpdates.supplier = updates.supplier;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.branchId !== undefined) dbUpdates.branch_id = updates.branchId;
    if (updates.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = updates.lowStockThreshold;
    
    // Pricing
    if (updates.retailPrice !== undefined) {
        dbUpdates.retail_price = updates.retailPrice;
        dbUpdates.price = updates.retailPrice; // Keep legacy field in sync
    } else if (updates.price !== undefined) {
        dbUpdates.retail_price = updates.price;
        dbUpdates.price = updates.price;
    }
    
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.wholesalePrice !== undefined) dbUpdates.wholesale_price = updates.wholesalePrice;

    console.log('📤 Sending to Supabase:', { dbUpdates, id, business_id: business.id });

    try {
      const { error, data } = await supabase
        .from('inventory')
        .update(dbUpdates)
        .eq('id', id)
        .eq('business_id', business.id)
        .select();

      console.log('📥 Supabase response received');
      console.log('📥 Error:', error);
      console.log('📥 Data:', data);

      if (error) {
        console.error("❌ Error updating product:", error);
        console.error("Error details:", { code: error.code, message: error.message, details: error.details, hint: error.hint });
        toast.error("Failed to update product: " + error.message);
        return;
      }
      
      console.log('✅ Product updated successfully');
      await refreshInventory();
    } catch (err) {
      console.error("❌ Unexpected error updating product:", err);
      toast.error("Unexpected error: " + (err as Error).message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!business) return;
    
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
        return;
      }

      await refreshInventory();
    } catch (err) {
      console.error("Unexpected error deleting product:", err);
    }
  };

  const getProductById = (id: string): InventoryItem | undefined => {
    return inventory.find((item) => item.id === id);
  };

  const validateStock = (productId: string, quantity: number): boolean => {
    const product = getProductById(productId);
    if (!product) return false;
    return product.stock >= quantity;
  };

  const deductStock = async (productId: string, quantity: number): Promise<boolean> => {
    const product = getProductById(productId);
    
    if (!product) {
      console.error(`Product ${productId} not found in inventory`);
      return false;
    }
    
    if (product.stock < quantity) {
      console.error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
      return false;
    }

    const newStock = Math.max(0, product.stock - quantity);

    try {
      const { error } = await supabase
        .from('inventory')
        .update({ stock: newStock })
        .eq('id', productId)
        .eq('business_id', business?.id);

      if (error) {
        console.error("Error deducting stock:", error);
        return false;
      }

      // Optimistic update
      setAllInventory(prev => prev.map(item => 
        item.id === productId ? { ...item, stock: newStock } : item
      ));
      
      return true;
    } catch (err) {
      console.error("Unexpected error deducting stock:", err);
      return false;
    }
  };

  const deductMultipleStock = async (
    items: { productId: string; quantity: number }[]
  ): Promise<{ success: boolean; errors: string[] }> => {
    const errors: string[] = [];

    // 1. Validation phase
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

    // 2. Execution phase - Process one by one (ideal would be a stored procedure or batch RPC)
    // For now, we'll do parallel updates for simplicity in this frontend-heavy app
    const promises = items.map(async (item) => {
      const product = getProductById(item.productId);
      if (!product) return;
      
      const newStock = Math.max(0, product.stock - item.quantity);
      
      const { error } = await supabase
        .from('inventory')
        .update({ stock: newStock })
        .eq('id', item.productId);
        
      if (error) throw error;
      
      return { productId: item.productId, newStock };
    });

    try {
      const results = await Promise.all(promises);
      
      // Update local state
      setAllInventory(prev => prev.map(invItem => {
        const result = results.find(r => r?.productId === invItem.id);
        if (result) {
          return { ...invItem, stock: result.newStock };
        }
        return invItem;
      }));

      return { success: true, errors: [] };
    } catch (err: any) {
      console.error("Error in bulk stock deduction:", err);
      return { success: false, errors: ["Database error during stock update"] };
    }
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

  const increaseStock = async (productId: string, branchId: string, quantity: number): Promise<boolean> => {
    const product = getProductById(productId);
    
    if (!product) {
      console.error(`Product ${productId} not found in inventory`);
      return false;
    }
    
    if (product.branchId !== branchId) {
      console.error(`Product ${product.name} does not belong to branch ${branchId}`);
      return false;
    }

    const newStock = product.stock + quantity;

    try {
      const { error } = await supabase
        .from('inventory')
        .update({ stock: newStock })
        .eq('id', productId);

      if (error) {
        console.error("Error increasing stock:", error);
        return false;
      }

      setAllInventory(prev => prev.map(item => 
        item.id === productId ? { ...item, stock: newStock } : item
      ));

      return true;
    } catch (err) {
      console.error("Unexpected error increasing stock:", err);
      return false;
    }
  };

  const increaseMultipleStock = async (
    items: { productId: string; sku: string; name: string; quantity: number }[],
    branchId: string
  ): Promise<{ success: boolean; errors: string[]; createdProducts: string[] }> => {
    if (!business) {
      return { success: false, errors: ["No business context"], createdProducts: [] };
    }

    const errors: string[] = [];
    const createdProducts: string[] = [];
    
    // We'll process sequentially to handle create vs update
    for (const item of items) {
      try {
        // Find existing product by productId OR by SKU + branchId
        let product = allInventory.find(p => p.id === item.productId);
        
        if (!product) {
          // Try finding by SKU + branchId
          product = allInventory.find(
            p => p.sku === item.sku && p.branchId === branchId && p.businessId === business.id
          );
        }
        
        if (!product) {
          // Product does not exist - create new inventory record for this branch
          const newItem = {
            business_id: business.id,
            branch_id: branchId,
            name: item.name,
            category: "Uncategorized",
            price: 0,
            stock: item.quantity,
            sku: item.sku,
            supplier: "Unknown",
            low_stock_threshold: 10
          };
          
          const { data, error } = await supabase.from('inventory').insert(newItem).select('id').single();
          if (error) {
            errors.push(`Failed to create product ${item.sku}: ${error.message}`);
          } else {
            createdProducts.push(item.sku);
          }
        } else {
          // Product exists - verify branch and increase stock
          if (product.branchId !== branchId) {
            errors.push(`Product "${product.name}" belongs to different branch`);
            continue;
          }
          
          const newStock = product.stock + item.quantity;
          const { error } = await supabase.from('inventory').update({ stock: newStock }).eq('id', product.id);
          
          if (error) {
            errors.push(`Failed to update stock for ${item.sku}: ${error.message}`);
          }
        }
      } catch (err: any) {
        errors.push(`Error processing ${item.sku}: ${err.message}`);
      }
    }

    await refreshInventory();

    if (errors.length > 0) {
      return { success: false, errors, createdProducts };
    }

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
    increaseMultipleStock,
    refreshInventory,
    error
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