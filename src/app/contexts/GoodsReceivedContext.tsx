import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GOODS RECEIVED NOTES (GRN) CONTEXT - DELIVERY CONFIRMATION SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Record ACTUAL physical delivery of goods from suppliers
 * - Derived strictly from Purchase Orders
 * - Track ordered vs received quantities
 * - Handle partial deliveries
 * - Maintain immutable delivery records
 * - Provide foundation for inventory stock updates (future)
 * 
 * CRITICAL NON-DESTRUCTIVE GUARANTEE:
 * - Does NOT automatically update inventory stock levels
 * - Does NOT auto-create expenses or invoices
 * - Does NOT affect POS or sales logic
 * - GRNs are CONFIRMATION ONLY - stock updates happen separately
 * 
 * STATUS WORKFLOW:
 * Draft → Confirmed (immutable)
 * 
 * DELIVERY STATUS:
 * - Full: All items received as ordered
 * - Partial: Some items received less than ordered
 * 
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
  addGRN: (grn: Omit<GoodsReceivedNote, "id" | "grnNumber" | "businessId" | "createdAt" | "updatedAt" | "status" | "confirmedAt">) => void;
  updateGRN: (id: string, updates: Partial<GoodsReceivedNote>) => void;
  confirmGRN: (id: string) => void;
  getGRNById: (id: string) => GoodsReceivedNote | undefined;
  getGRNsByBranch: (branchId: string) => GoodsReceivedNote[];
  getGRNsByPO: (purchaseOrderId: string) => GoodsReceivedNote[];
  getGRNsBySupplier: (supplierId: string) => GoodsReceivedNote[];
  getNextGRNNumber: () => string;
  calculateDeliveryStatus: (items: GRNLineItem[]) => DeliveryStatus;
}

const GoodsReceivedContext = createContext<GoodsReceivedContextType | undefined>(undefined);

const STORAGE_KEY = "pos_goods_received_notes";

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
  const [goodsReceivedNotes, setGoodsReceivedNotes] = useState<GoodsReceivedNote[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load goods received notes:", error);
      return [];
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // PERSIST TO LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goodsReceivedNotes));
    } catch (error) {
      console.error("Failed to save goods received notes:", error);
    }
  }, [goodsReceivedNotes]);

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
  const addGRN = (
    grn: Omit<GoodsReceivedNote, "id" | "grnNumber" | "businessId" | "createdAt" | "updatedAt" | "status" | "confirmedAt">
  ) => {
    if (!business) {
      console.error("Cannot create GRN: No business context");
      return;
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();

    const deliveryStatus = calculateDeliveryStatus(grn.items);

    const newGRN: GoodsReceivedNote = {
      ...grn,
      id: `GRN-${dateStr}-${randomId}`,
      grnNumber: getNextGRNNumber(),
      businessId: business.id,
      status: "Draft",
      deliveryStatus,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    setGoodsReceivedNotes(prev => [newGRN, ...prev]);
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE GRN (Draft only - before confirmation)
  // ═══════════════════════════════════════════════════════════════════
  const updateGRN = (id: string, updates: Partial<GoodsReceivedNote>) => {
    setGoodsReceivedNotes(prev =>
      prev.map(grn => {
        if (grn.id !== id) return grn;

        // Only allow updates to Draft status (before confirmation)
        if (grn.status !== "Draft") {
          console.warn(`Cannot update GRN ${id}: Status is ${grn.status}, not Draft`);
          return grn;
        }

        // Recalculate delivery status if items changed
        let deliveryStatus = grn.deliveryStatus;
        if (updates.items) {
          deliveryStatus = calculateDeliveryStatus(updates.items);
        }

        return {
          ...grn,
          ...updates,
          deliveryStatus,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // CONFIRM GRN (Draft → Confirmed, becomes immutable)
  // ═══════════════════════════════════════════════════════════════════
  const confirmGRN = (id: string) => {
    setGoodsReceivedNotes(prev =>
      prev.map(grn => {
        if (grn.id !== id) return grn;

        if (grn.status !== "Draft") {
          console.warn(`Cannot confirm GRN ${id}: Status is ${grn.status}, not Draft`);
          return grn;
        }

        return {
          ...grn,
          status: "Confirmed" as GRNStatus,
          confirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      })
    );
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