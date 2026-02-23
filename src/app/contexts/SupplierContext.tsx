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

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<any>(null);

  const refreshSuppliers = async () => {
    if (!business) return;

    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', business.id);

      if (fetchError) {
        console.error("Error fetching suppliers:", fetchError);
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
        setAllSuppliers(mappedSuppliers);
      }
    } catch (err: any) {
      console.error("Unexpected error fetching suppliers:", err);
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
        toast.error("Authentication Error: Business context missing");
        return;
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

    try {
      const { error } = await supabase
        .from('suppliers')
        .insert(newSupplier)
        .select()
        .single();

      if (error) {
        console.error("Error adding supplier:", error);
        if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(error.code)) {
            setError(error);
        } else {
            toast.error("Failed to add supplier: " + error.message);
        }
        return;
      }

      await refreshSuppliers();
      toast.success("Supplier added successfully");
    } catch (err: any) {
      console.error("Unexpected error adding supplier:", err);
      toast.error("Unexpected error adding supplier");
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