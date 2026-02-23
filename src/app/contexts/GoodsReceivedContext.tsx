import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GOODS RECEIVED NOTES (GRN) CONTEXT - DELIVERY CONFIRMATION SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type GRNStatus = "Draft" | "Confirmed";
export type DeliveryStatus = "Full" | "Partial";

export interface GRNLineItem {
  productId: string;
  productName: string;
  productSKU: string;
  orderedQuantity: number;
  receivedQuantity: number;
  notes?: string; // "Damaged", "Missing", "Partially delivered", etc.
}

export interface GoodsReceivedNote {
  id: string; // Format: GRN-YYYYMMDD-XXXX
  grnNumber: string; // Human-readable: GRN-001, GRN-002, etc.
  businessId: string;
  branchId: string;
  branchName: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplierName: string;
  items: GRNLineItem[];
  deliveryStatus: DeliveryStatus;
  status: GRNStatus;
  receivedByStaffId: string;
  receivedByStaffName: string;
  receivedByRole: string;
  notes?: string; // General notes about the delivery
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string; // Timestamp when GRN was confirmed (becomes immutable)
}

interface GoodsReceivedContextType {
  goodsReceivedNotes: GoodsReceivedNote[];
  addGRN: (grn: Omit<GoodsReceivedNote, "id" | "grnNumber" | "businessId" | "createdAt" | "updatedAt" | "status" | "confirmedAt">) => Promise<void>;
  updateGRN: (id: string, updates: Partial<GoodsReceivedNote>) => Promise<void>;
  confirmGRN: (id: string) => Promise<void>;
  getGRNById: (id: string) => GoodsReceivedNote | undefined;
  getGRNsByBranch: (branchId: string) => GoodsReceivedNote[];
  getGRNsByPO: (purchaseOrderId: string) => GoodsReceivedNote[];
  getGRNsBySupplier: (supplierId: string) => GoodsReceivedNote[];
  getNextGRNNumber: () => string;
  calculateDeliveryStatus: (items: GRNLineItem[]) => DeliveryStatus;
}

const GoodsReceivedContext = createContext<GoodsReceivedContextType | undefined>(undefined);

export function GoodsReceivedProvider({ children }: { children: ReactNode }) {
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("GoodsReceivedProvider: AuthContext not available", e);
  }
  const business = auth?.business || null;

  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  const [goodsReceivedNotes, setGoodsReceivedNotes] = useState<GoodsReceivedNote[]>([]);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!business) {
      setGoodsReceivedNotes([]);
      return;
    }

    const fetchGRNs = async () => {
      try {
        const { data, error } = await supabase
          .from('goods_received_notes')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setGoodsReceivedNotes(data.map((grn: any) => ({
            id: grn.id,
            grnNumber: grn.grn_number,
            businessId: grn.business_id,
            branchId: grn.branch_id,
            branchName: grn.branch_name,
            purchaseOrderId: grn.purchase_order_id,
            purchaseOrderNumber: grn.purchase_order_number,
            supplierId: grn.supplier_id,
            supplierName: grn.supplier_name,
            items: grn.items || [],
            deliveryStatus: grn.delivery_status as DeliveryStatus,
            status: grn.status as GRNStatus,
            receivedByStaffId: grn.received_by_staff_id,
            receivedByStaffName: grn.received_by_staff_name,
            receivedByRole: grn.received_by_role,
            notes: grn.notes,
            createdAt: grn.created_at,
            updatedAt: grn.updated_at,
            confirmedAt: grn.confirmed_at
          })));
        }
      } catch (err) {
        console.error("Error fetching GRNs:", err);
      }
    };

    fetchGRNs();
  }, [business]);

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATE DELIVERY STATUS
  // ═══════════════════════════════════════════════════════════════════
  const calculateDeliveryStatus = (items: GRNLineItem[]): DeliveryStatus => {
    const allFull = items.every(item => item.receivedQuantity === item.orderedQuantity);
    return allFull ? "Full" : "Partial";
  };

  // ═══════════════════════════════════════════════════════════════════
  // GENERATE NEXT GRN NUMBER
  // ═══════════════════════════════════════════════════════════════════
  const getNextGRNNumber = (): string => {
    if (!business) return "GRN-001";

    const businessGRNs = goodsReceivedNotes.filter(grn => grn.businessId === business.id);
    const nextNumber = businessGRNs.length + 1;
    return `GRN-${String(nextNumber).padStart(3, "0")}`;
  };

  // ═══════════════════════════════════════════════════════════════════
  // ADD GRN (Draft status)
  // ═══════════════════════════════════════════════════════════════════
  const addGRN = async (
    grn: Omit<GoodsReceivedNote, "id" | "grnNumber" | "businessId" | "createdAt" | "updatedAt" | "status" | "confirmedAt">
  ) => {
    if (!business) {
      console.error("Cannot create GRN: No business context");
      return;
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const id = `GRN-${dateStr}-${randomId}`;

    const deliveryStatus = calculateDeliveryStatus(grn.items);

    const newGRN: GoodsReceivedNote = {
      ...grn,
      id,
      grnNumber: getNextGRNNumber(), // Race condition possible
      businessId: business.id,
      status: "Draft",
      deliveryStatus,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    try {
      const dbGRN = {
        id: newGRN.id,
        grn_number: newGRN.grnNumber,
        business_id: newGRN.businessId,
        branch_id: newGRN.branchId,
        branch_name: newGRN.branchName,
        purchase_order_id: newGRN.purchaseOrderId,
        purchase_order_number: newGRN.purchaseOrderNumber,
        supplier_id: newGRN.supplierId,
        supplier_name: newGRN.supplierName,
        items: newGRN.items,
        delivery_status: newGRN.deliveryStatus,
        status: newGRN.status,
        received_by_staff_id: newGRN.receivedByStaffId,
        received_by_staff_name: newGRN.receivedByStaffName,
        received_by_role: newGRN.receivedByRole,
        notes: newGRN.notes,
        created_at: newGRN.createdAt,
        updated_at: newGRN.updatedAt
      };

      const { error } = await supabase
        .from('goods_received_notes')
        .insert(dbGRN);

      if (error) throw error;

      setGoodsReceivedNotes(prev => [newGRN, ...prev]);
      toast.success("GRN Created");
    } catch (err: any) {
      console.error("Error creating GRN:", err);
      toast.error("Failed to create GRN");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE GRN (Draft only - before confirmation)
  // ═══════════════════════════════════════════════════════════════════
  const updateGRN = async (id: string, updates: Partial<GoodsReceivedNote>) => {
    const grn = goodsReceivedNotes.find(g => g.id === id);
    if (!grn) return;

    if (grn.status !== "Draft") {
      toast.error(`Cannot update GRN: Status is ${grn.status}`);
      return;
    }

    try {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      
      let deliveryStatus = grn.deliveryStatus;
      if (updates.items) {
        deliveryStatus = calculateDeliveryStatus(updates.items);
        dbUpdates.items = updates.items;
        dbUpdates.delivery_status = deliveryStatus;
      }

      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await supabase
        .from('goods_received_notes')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setGoodsReceivedNotes(prev => prev.map(g => {
        if (g.id !== id) return g;
        return { 
          ...g, 
          ...updates, 
          deliveryStatus, 
          updatedAt: dbUpdates.updated_at 
        };
      }));
      
      toast.success("GRN Updated");
    } catch (err: any) {
      console.error("Error updating GRN:", err);
      toast.error("Failed to update GRN");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // CONFIRM GRN (Draft → Confirmed, becomes immutable)
  // ═══════════════════════════════════════════════════════════════════
  const confirmGRN = async (id: string) => {
    const grn = goodsReceivedNotes.find(g => g.id === id);
    if (!grn) return;

    if (grn.status !== "Draft") {
      toast.error(`Cannot confirm GRN: Status is ${grn.status}`);
      return;
    }

    try {
      const confirmedAt = new Date().toISOString();
      const { error } = await supabase
        .from('goods_received_notes')
        .update({
          status: 'Confirmed',
          confirmed_at: confirmedAt,
          updated_at: confirmedAt
        })
        .eq('id', id);

      if (error) throw error;

      setGoodsReceivedNotes(prev => prev.map(g => {
        if (g.id !== id) return g;
        return {
          ...g,
          status: "Confirmed",
          confirmedAt,
          updatedAt: confirmedAt
        };
      }));
      
      toast.success("GRN Confirmed");
    } catch (err: any) {
      console.error("Error confirming GRN:", err);
      toast.error("Failed to confirm GRN");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // QUERY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════
  const getGRNById = (id: string): GoodsReceivedNote | undefined => {
    return goodsReceivedNotes.find(grn => grn.id === id);
  };

  const getGRNsByBranch = (branchId: string): GoodsReceivedNote[] => {
    return goodsReceivedNotes.filter(grn => grn.branchId === branchId);
  };

  const getGRNsByPO = (purchaseOrderId: string): GoodsReceivedNote[] => {
    return goodsReceivedNotes.filter(grn => grn.purchaseOrderId === purchaseOrderId);
  };

  const getGRNsBySupplier = (supplierId: string): GoodsReceivedNote[] => {
    return goodsReceivedNotes.filter(grn => grn.supplierId === supplierId);
  };

  return (
    <GoodsReceivedContext.Provider
      value={{
        goodsReceivedNotes,
        addGRN,
        updateGRN,
        confirmGRN,
        getGRNById,
        getGRNsByBranch,
        getGRNsByPO,
        getGRNsBySupplier,
        getNextGRNNumber,
        calculateDeliveryStatus
      }}
    >
      {children}
    </GoodsReceivedContext.Provider>
  );
}

export function useGoodsReceived() {
  const context = useContext(GoodsReceivedContext);
  if (context === undefined) {
    throw new Error("useGoodsReceived must be used within a GoodsReceivedProvider");
  }
  return context;
}
