import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATEGORY CONTEXT - INVENTORY CATEGORY MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ARCHITECTURE PRINCIPLES:
 * 
 * 1. BUSINESS-LEVEL CATEGORIES
 *    - Categories are shared across all branches within a business
 *    - Each category belongs to a specific business (businessId)
 *    - Categories are NOT branch-specific
 * 
 * 2. SOFT DELETE (DISABLE/ENABLE)
 *    - Categories can be disabled instead of hard-deleted
 *    - Disabled categories won't appear in product creation dropdown
 *    - Historical products retain category reference
 * 
 * 3. SUPABASE PERSISTENCE
 *    - Data is persisted in the 'categories' table
 *    - Real-time synchronization is not yet implemented
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface Category {
  id: string;
  name: string;
  description: string;
  businessId: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

interface CategoryContextType {
  categories: Category[];
  activeCategories: Category[];
  addCategory: (category: Omit<Category, "id" | "businessId" | "createdAt" | "updatedAt" | "status">) => Promise<{ success: boolean; error?: string }>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  disableCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  enableCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  refreshCategories: () => Promise<void>;
  error: any;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

const defaultContext: CategoryContextType = {
  categories: [],
  activeCategories: [],
  addCategory: async () => { console.warn("CategoryContext: addCategory called without provider"); return { success: false, error: "Provider missing" }; },
  updateCategory: async () => { console.warn("CategoryContext: updateCategory called without provider"); return { success: false, error: "Provider missing" }; },
  deleteCategory: async () => { console.warn("CategoryContext: deleteCategory called without provider"); return { success: false, error: "Provider missing" }; },
  disableCategory: async () => { console.warn("CategoryContext: disableCategory called without provider"); return { success: false, error: "Provider missing" }; },
  enableCategory: async () => { console.warn("CategoryContext: enableCategory called without provider"); return { success: false, error: "Provider missing" }; },
  getCategoryById: () => undefined,
  getCategoryByName: () => undefined,
  refreshCategories: async () => {},
  error: null,
};

export function CategoryProvider({ children }: { children: ReactNode }) {
  // Safe context access pattern
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn("CategoryProvider: AuthContext not available", e);
  }
  const business = authContext?.business;
  const user = authContext?.user;

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [error, setError] = useState<any>(null);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH CATEGORIES FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  const refreshCategories = async () => {
    if (!business) return;
    
    // Guard: Prevent query if ID is not a valid UUID (prevents 22P02 error)
    // This handles legacy/test data with "BIZ-..." IDs
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(business.id);
    if (!isUuid) {
      console.warn("Skipping categories fetch: Business ID is not a valid UUID:", business.id);
      setAllCategories([]); 
      return;
    }

    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', business.id)
        .order('name');

      if (fetchError) {
        console.error("Error fetching categories:", fetchError);
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(fetchError.code)) {
            setError(fetchError);
        } else {
            setError(fetchError);
        }
        return;
      }

      if (data) {
        const mappedCategories: Category[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          businessId: item.business_id,
          status: item.status || "active",
          createdAt: item.created_at,
          updatedAt: item.updated_at || item.created_at,
        }));
        setAllCategories(mappedCategories);
      }
    } catch (err: any) {
      console.error("Unexpected error fetching categories:", err);
      // Ensure error object structure is consistent for SchemaError
      setError({
        message: err.message || "Unexpected error",
        code: err.code || "UNKNOWN"
      });
    }
  };

  useEffect(() => {
    if (business) {
      refreshCategories();
    } else {
      setAllCategories([]);
    }
  }, [business]);

  // Filter categories by current business (redundant if we trust the fetch, but good for safety)
  const categories = useMemo(() => {
    if (!business) return [];
    return allCategories.filter((cat) => cat.businessId === business.id);
  }, [business, allCategories]);

  // Get only active categories (for product creation dropdown)
  const activeCategories = useMemo(() => {
    return categories.filter((cat) => cat.status === "active");
  }, [categories]);

  const addCategory = async (category: Omit<Category, "id" | "businessId" | "createdAt" | "updatedAt" | "status">): Promise<{ success: boolean; error?: string }> => {
    if (!business) {
      console.error("Cannot add category: No business context");
      return { success: false, error: "Authentication Error: Business context missing." };
    }

    const newCategory = {
      name: category.name,
      description: category.description,
      business_id: business.id,
      status: "active",
    };

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(newCategory)
        .select()
        .single();

      if (error) {
        console.error("Error adding category:", error);
        // Check for schema errors to show fix UI
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(error.code)) {
            setError(error);
        }
        return { success: false, error: error.message };
      }

      await refreshCategories();
      return { success: true };
    } catch (err: any) {
      console.error("Unexpected error adding category:", err);
      return { success: false, error: "Unexpected error occurred" };
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<{ success: boolean; error?: string }> => {
    if (!business) return { success: false, error: "No business context" };

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    
    // Always update updated_at
    dbUpdates.updated_at = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('categories')
        .update(dbUpdates)
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) {
        console.error("Error updating category:", error);
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(error.code)) {
            setError(error);
        }
        return { success: false, error: error.message };
      }

      await refreshCategories();
      return { success: true };
    } catch (err: any) {
      console.error("Unexpected error updating category:", err);
      return { success: false, error: "Unexpected error occurred" };
    }
  };

  const deleteCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!business) return { success: false, error: "No business context" };

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) {
        console.error("Error deleting category:", error);
        if (error.code === '23503') { // Foreign key violation
             return { success: false, error: "This category contains products. Please delete or reassign them first." };
        }
        return { success: false, error: error.message };
      }

      await refreshCategories();
      return { success: true };
    } catch (err: any) {
      console.error("Unexpected error deleting category:", err);
      return { success: false, error: "Unexpected error occurred" };
    }
  };

  const disableCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    return await updateCategory(id, { status: "disabled" });
  };

  const enableCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    return await updateCategory(id, { status: "active" });
  };

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find((cat) => cat.id === id);
  };

  const getCategoryByName = (name: string): Category | undefined => {
    return categories.find((cat) => cat.name.toLowerCase() === name.toLowerCase());
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        activeCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        disableCategory,
        enableCategory,
        getCategoryById,
        getCategoryByName,
        refreshCategories,
        error
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    // Return default context for previews/isolated components instead of crashing
    return defaultContext;
  }
  return context;
}
