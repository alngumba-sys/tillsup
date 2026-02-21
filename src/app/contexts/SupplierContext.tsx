import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  pinNumber?: string; // Supplier PIN Number (optional)
  businessId: string; // Multi-tenant support
  createdAt: string;
  updatedAt: string;
}

interface SupplierContextType {
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, "id" | "businessId" | "createdAt" | "updatedAt">) => void;
  updateSupplier: (id: string, supplier: Partial<Omit<Supplier, "id" | "businessId" | "createdAt">>) => void;
  deleteSupplier: (id: string) => void;
  getSupplierById: (id: string) => Supplier | undefined;
  getSupplierByName: (name: string) => Supplier | undefined;
}

const SupplierContext = createContext<SupplierContextType | undefined>(undefined);

const STORAGE_KEY = "pos_suppliers";

// Seed supplier data per business
const getSeedSuppliers = (businessId: string): Supplier[] => [];

export function SupplierProvider({ children }: { children: ReactNode }) {
  // ═══════════════════════════════════════════════════════════════════
  // SAFE CONTEXT ACCESS - Hooks must be called unconditionally
  // ═══════════════════════════════════════════════════════════════════
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("SupplierProvider: AuthContext not available", e);
  }
  const business = auth?.business || null;

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSuppliers: Supplier[] = JSON.parse(stored);
        
        // Deduplicate suppliers by ID - keep only the first occurrence of each ID
        const seenIds = new Set<string>();
        const deduplicatedSuppliers = parsedSuppliers.filter((supplier) => {
          if (seenIds.has(supplier.id)) {
            return false; // Skip duplicate
          }
          seenIds.add(supplier.id);
          return true;
        });
        
        return deduplicatedSuppliers;
      }
    } catch (error) {
      console.error("Error loading suppliers from localStorage:", error);
    }
    return [];
  });

  // Initialize seed data for new business
  useEffect(() => {
    if (business && allSuppliers.length === 0) {
      const seedData = getSeedSuppliers(business.id);
      setAllSuppliers(seedData);
    }
  }, [business, allSuppliers.length]);

  // Filter suppliers by current business
  const suppliers = business
    ? allSuppliers.filter((s) => s.businessId === business.id)
    : [];

  // Persist to localStorage whenever suppliers change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSuppliers));
    } catch (error) {
      console.error("Error saving suppliers to localStorage:", error);
    }
  }, [allSuppliers]);

  const addSupplier = (
    supplier: Omit<Supplier, "id" | "businessId" | "createdAt" | "updatedAt">
  ) => {
    if (!business) return;

    const newSupplier: Supplier = {
      ...supplier,
      id: Date.now().toString(),
      businessId: business.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllSuppliers((prev) => [...prev, newSupplier]);
  };

  const updateSupplier = (
    id: string,
    updates: Partial<Omit<Supplier, "id" | "businessId" | "createdAt">>
  ) => {
    setAllSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === id
          ? {
              ...supplier,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : supplier
      )
    );
  };

  const deleteSupplier = (id: string) => {
    setAllSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
  };

  const getSupplierById = (id: string) => {
    return suppliers.find((supplier) => supplier.id === id);
  };

  const getSupplierByName = (name: string) => {
    return suppliers.find(
      (supplier) => supplier.name.toLowerCase() === name.toLowerCase()
    );
  };

  const value: SupplierContextType = {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById,
    getSupplierByName,
  };

  return (
    <SupplierContext.Provider value={value}>
      {children}
    </SupplierContext.Provider>
  );
}

export function useSupplier() {
  const context = useContext(SupplierContext);
  if (!context) {
    throw new Error("useSupplier must be used within a SupplierProvider");
  }
  return context;
}