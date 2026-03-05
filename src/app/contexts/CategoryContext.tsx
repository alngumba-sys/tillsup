import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { isPreviewMode } from "../utils/previewMode";

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

  // ════════��═════════════════════════════════════════════════════════
  // FETCH CATEGORIES FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  const refreshCategories = async () => {
    if (!business) return;
    
    // Preview mode: Use mock data from previewMode.ts
    if (isPreviewMode()) {
      console.log("🎨 Preview mode: Using mock categories");
      const { mockPreviewCategories } = await import("../utils/previewMode");
      setAllCategories(mockPreviewCategories as any[]);
      return;
    }
    
    // Guard: Prevent query if ID is not a valid UUID (prevents 22P02 error)
    // This handles legacy/test data with "BIZ-..." IDs
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(business.id);
    if (!isUuid) {
      console.warn("Skipping categories fetch: Business ID is not a valid UUID:", business.id);
      setAllCategories([]); 
      return;
    }

    setError(null);

    console.log("🔵 Fetching categories from Supabase database...", { businessId: business.id });

    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', business.id)
        .order('name');

      if (fetchError) {
        console.error("❌ Error fetching categories from database:", fetchError);
        console.error("   Error code:", fetchError.code);
        console.error("   Error message:", fetchError.message);
        
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
        
        console.log(`✅ Loaded ${data.length} categories from database:`, {
          total: data.length,
          active: mappedCategories.filter(c => c.status === 'active').length,
          disabled: mappedCategories.filter(c => c.status === 'disabled').length,
          categories: mappedCategories.map(c => c.name)
        });
        
        setAllCategories(mappedCategories);
      } else {
        console.log("ℹ️  No categories found in database");
        setAllCategories([]);
      }
    } catch (err: any) {
      console.error("❌ Unexpected error fetching categories:", err);
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
      throw new Error("Authentication Error: Business context missing.");
    }

    const newCategory = {
      name: category.name,
      description: category.description,
      business_id: business.id,
      status: "active",
    };

    console.log("🟢 Adding category to Supabase database:", newCategory);

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(newCategory)
        .select()
        .single();

      if (error) {
        console.error("❌ Error adding category to database:", error);
        console.error("   Error code:", error.code);
        console.error("   Error message:", error.message);
        console.error("   Error details:", error.details);
        
        // Network/Connection errors
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            toast.error("Network Error", {
              description: "Cannot connect to database. Check your internet connection and try again."
            });
            throw new Error("Network error: " + error.message);
        }
        
        // Auth/Session errors
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
            toast.error("Session Expired", {
              description: "Your session has expired. Please logout and login again.",
              action: {
                label: "Logout",
                onClick: () => { localStorage.clear(); window.location.href = '/'; }
              }
            });
            throw new Error("Session expired");
        }
        
        // Check for schema errors to show fix UI
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(error.code)) {
            setError(error);
            toast.error("Database Schema Error", {
              description: "The categories table is not properly set up."
            });
            throw error;
        }
        
        // Permission errors
        if (error.code === 'PGRST116' || error.message.includes('violates row-level security')) {
            toast.error("Permission Error", {
              description: "You don't have permission to add categories. Try logging out and back in.",
              action: {
                label: "Logout",
                onClick: () => { localStorage.clear(); window.location.href = '/'; }
              }
            });
            throw new Error("Permission denied");
        }
        
        toast.error("Failed to add category", {
          description: error.message || "Unknown database error"
        });
        
        throw error;
      }

      console.log("✅ Category added to database successfully:", data);
      
      await refreshCategories();
      
      toast.success("Category added successfully!", {
        description: `"${category.name}" has been added to the database`
      });
      
      return { success: true };
    } catch (err: any) {
      console.error("❌ Unexpected error adding category:", err);
      
      // Handle network errors from fetch
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('ERR_')) {
        toast.error("Network Connection Error", {
          description: "Cannot reach the database. Please check your internet connection and try again."
        });
        throw new Error("Network connection error");
      }
      
      // Re-throw if already an Error object
      if (err instanceof Error) {
        throw err;
      }
      
      toast.error("Unexpected error occurred", {
        description: "Failed to add category"
      });
      throw new Error("Unexpected error");
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