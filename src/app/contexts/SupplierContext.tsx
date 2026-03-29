import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  pinNumber?: string;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierContextType {
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, "id" | "businessId" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Omit<Supplier, "id" | "businessId" | "createdAt">>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  getSupplierById: (id: string) => Supplier | undefined;
  getSupplierByName: (name: string) => Supplier | undefined;
  refreshSuppliers: () => Promise<void>;
  error: any;
}

const SupplierContext = createContext<SupplierContextType | undefined>(undefined);

export function SupplierProvider({ children }: { children: ReactNode }) {
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("SupplierProvider: AuthContext not available", e);
  }
  const business = auth?.business || null;
  const user = auth?.user || null;

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<any>(null);

  const refreshSuppliers = async () => {
    if (!business) return;

    setError(null);

    console.log("🔵 Fetching suppliers from Supabase database...", { businessId: business.id });

    try {
      // RBAC: Non-owner staff are scoped to their assigned branch for data isolation
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', business.id);

      if (user && user.role !== 'Business Owner' && user.branchId) {
        query = query.eq('branch_id', user.branchId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("❌ Error fetching suppliers from database:", fetchError);
        console.error("   Error code:", fetchError.code);
        console.error("   Error message:", fetchError.message);
        
        // Check for schema errors to show fix UI
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(fetchError.code)) {
            setError(fetchError);
        } else {
            setError(fetchError);
        }
        return;
      }

      if (data) {
        const mappedSuppliers: Supplier[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          contactPerson: item.contact_person || "",
          phone: item.phone || "",
          email: item.email || "",
          address: item.address || "",
          notes: item.notes || "",
          pinNumber: item.pin_number || "",
          businessId: item.business_id,
          createdAt: item.created_at,
          updatedAt: item.updated_at || item.created_at,
        }));
        
        console.log(`✅ Loaded ${data.length} suppliers from database:`, {
          total: data.length,
          withContact: mappedSuppliers.filter(s => s.contactPerson).length,
          withEmail: mappedSuppliers.filter(s => s.email).length,
          withNotes: mappedSuppliers.filter(s => s.notes).length,
          suppliers: mappedSuppliers.map(s => ({ name: s.name, contact: s.contactPerson }))
        });
        
        setAllSuppliers(mappedSuppliers);
      } else {
        console.log("ℹ️  No suppliers found in database");
        setAllSuppliers([]);
      }
    } catch (err: any) {
      console.error("❌ Unexpected error fetching suppliers:", err);
      setError({ message: err.message || "Unexpected error" });
    }
  };

  useEffect(() => {
    if (business) {
      refreshSuppliers();
    } else {
      setAllSuppliers([]);
    }
  }, [business]);

  const suppliers = allSuppliers; // Already filtered by query

  const addSupplier = async (
    supplier: Omit<Supplier, "id" | "businessId" | "createdAt" | "updatedAt">
  ) => {
    if (!business) {
        console.error("❌ Cannot add supplier: No business context");
        toast.error("Authentication Error: Business context missing");
        throw new Error("No business context");
    }

    const newSupplier = {
      business_id: business.id,
      name: supplier.name,
      contact_person: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
      pin_number: supplier.pinNumber,
    };

    console.log("🟢 Adding supplier to Supabase database:", newSupplier);

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(newSupplier)
        .select()
        .single();

      if (error) {
        console.error("❌ Error adding supplier to database:", error);
        console.error("   Error code:", error.code);
        console.error("   Error message:", error.message);
        console.error("   Error details:", error.details);
        console.error("   Error hint:", error.hint);
        
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
        
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(error.code)) {
            setError(error);
            toast.error("Database Schema Error", {
              description: "The suppliers table is not properly set up. Please run the database setup SQL."
            });
            throw error;
        } else if (error.code === 'PGRST116' || error.message.includes('violates row-level security')) {
            toast.error("Permission Error", {
              description: "You don't have permission to add suppliers. Try logging out and back in.",
              action: {
                label: "Logout",
                onClick: () => { localStorage.clear(); window.location.href = '/'; }
              }
            });
            throw new Error("Permission denied");
        } else if (error.code === '23505') {
            toast.error("Duplicate Entry", {
              description: "A supplier with this name already exists."
            });
            throw new Error("Duplicate supplier");
        } else {
            toast.error("Failed to add supplier", {
              description: error.message || "Unknown error. Check console for details."
            });
            throw error;
        }
      }

      console.log("✅ Supplier added to database successfully:", data);

      await refreshSuppliers();
      
      toast.success("Supplier added successfully!", {
        description: `"${supplier.name}" has been added to the database`
      });
    } catch (err: any) {
      console.error("❌ Unexpected error adding supplier:", err);
      
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
      
      toast.error("Unexpected Error", {
        description: "Failed to add supplier"
      });
      throw new Error("Unexpected error");
    }
  };

  const updateSupplier = async (
    id: string,
    updates: Partial<Omit<Supplier, "id" | "businessId" | "createdAt">>
  ) => {
    if (!business) return;

    const dbUpdates: any = {
        updated_at: new Date().toISOString()
    };
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.pinNumber !== undefined) dbUpdates.pin_number = updates.pinNumber;

    try {
      const { error } = await supabase
        .from('suppliers')
        .update(dbUpdates)
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) {
        console.error("Error updating supplier:", error);
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(error.code)) {
            setError(error);
        }
        toast.error("Failed to update supplier");
        return;
      }

      await refreshSuppliers();
      toast.success("Supplier updated successfully");
    } catch (err: any) {
      console.error("Unexpected error updating supplier:", err);
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!business) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) {
        console.error("Error deleting supplier:", error);
        toast.error("Failed to delete supplier");
        return;
      }

      await refreshSuppliers();
      toast.success("Supplier deleted successfully");
    } catch (err: any) {
      console.error("Unexpected error deleting supplier:", err);
    }
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
    refreshSuppliers,
    error
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