import { createContext, useContext, useState, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";

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
 * 3. REQUIRED FOR PRODUCTS
 *    - Products must have a category_id (not category name)
 *    - Product creation is blocked if no active categories exist
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
  addCategory: (category: Omit<Category, "id" | "businessId" | "createdAt" | "updatedAt" | "status">) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  disableCategory: (id: string) => void;
  enableCategory: (id: string) => void;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

const STORAGE_KEY = "pos_categories";

export function CategoryProvider({ children }: { children: ReactNode }) {
  // Safe context access pattern
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn("CategoryProvider: AuthContext not available", e);
  }
  const business = authContext?.business;
  const categoryCounterRef = useRef(0);

  const [allCategories, setAllCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load categories from localStorage:", error);
    }
    return [];
  });

  const updateCategories = (newCategories: Category[]) => {
    setAllCategories(newCategories);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCategories));
    } catch (error) {
      console.error("Failed to save categories:", error);
    }
  };

  // Filter categories by current business
  const categories = business
    ? allCategories.filter((cat) => cat.businessId === business.id)
    : [];

  // Get only active categories (for product creation dropdown)
  const activeCategories = categories.filter((cat) => cat.status === "active");

  const addCategory = (category: Omit<Category, "id" | "businessId" | "createdAt" | "updatedAt" | "status">) => {
    if (!business) {
      console.error("Cannot add category: No business context");
      return;
    }

    // Increment counter to ensure unique IDs even if created in rapid succession
    categoryCounterRef.current += 1;

    const newCategory: Category = {
      ...category,
      id: `cat_${Date.now()}_${categoryCounterRef.current}_${Math.random().toString(36).substr(2, 9)}`,
      businessId: business.id,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateCategories([...allCategories, newCategory]);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const updated = allCategories.map((cat) =>
      cat.id === id
        ? { ...cat, ...updates, updatedAt: new Date().toISOString() }
        : cat
    );
    updateCategories(updated);
  };

  const disableCategory = (id: string) => {
    updateCategory(id, { status: "disabled" });
  };

  const enableCategory = (id: string) => {
    updateCategory(id, { status: "active" });
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
        disableCategory,
        enableCategory,
        getCategoryById,
        getCategoryByName,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategory must be used within a CategoryProvider");
  }
  return context;
}
