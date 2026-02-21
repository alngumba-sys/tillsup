import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PURCHASE ORDER CONTEXT - ENTERPRISE PROCUREMENT REQUEST SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Manage formal purchase order requests to suppliers
 * - Track multi-product orders with line items
 * - Support professional approval workflows
 * - Maintain complete audit trail
 * - Branch-aware and role-based access controlled
 * 
 * CRITICAL NON-DESTRUCTIVE GUARANTEE:
 * - Does NOT modify inventory stock levels at ANY stage
 * - Does NOT auto-create expenses or invoices
 * - Does NOT affect POS or sales logic
 * - Purchase Orders are REQUESTS ONLY - require manual fulfillment
 * 
 * STATUS WORKFLOW:
 * Draft → Sent → Approved → Cancelled
 * (Delivered status reserved for future Goods Received module)
 * 
 * ══════════════════════════════════════════════════════════════════════════
 */

export type POStatus = "Draft" | "Sent" | "Approved" | "Cancelled" | "Delivered";
export type CommunicationMethod = "Email" | "SMS" | "WhatsApp";

export interface PurchaseOrderLineItem {
  productId: string;
  productName: string;
  productSKU: string;
  currentStock: number; // For reference only - NOT modified
  requestedQuantity: number;
  unitCost?: number; // Optional - may be negotiated with supplier
  totalCost?: number; // Calculated: requestedQuantity * unitCost
}

export interface PurchaseOrder {
  id: string; // Format: PO-YYYYMMDD-XXXX
  poNumber: string; // Human-readable: PO-001, PO-002, etc.
  businessId: string;
  branchId: string;
  branchName: string;
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  items: PurchaseOrderLineItem[];
  expectedDeliveryDate: string;
  notes?: string;
  status: POStatus;
  totalAmount?: number; // Sum of all line item totalCosts
  // ═══════════════════════════════════════════════════════════════════
  // CONVERSION FLOW FIELD
  // ═══════════════════════════════════════════════════════════════════
  sourceRequestId?: string; // Reference to Supplier Request (if converted from one)
  // ═══════════════════════════════════════════════════════════════════
  createdByStaffId: string;
  createdByStaffName: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  sentVia?: CommunicationMethod[];
  approvedAt?: string;
  approvedByStaffId?: string;
  approvedByStaffName?: string;
  cancelledAt?: string;
  cancelledReason?: string;
}

interface PurchaseOrderContextType {
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, "id" | "poNumber" | "businessId" | "createdAt" | "updatedAt" | "status">) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  sendPurchaseOrder: (id: string, methods: CommunicationMethod[]) => void;
  approvePurchaseOrder: (id: string, approverStaffId: string, approverStaffName: string) => void;
  cancelPurchaseOrder: (id: string, reason: string) => void;
  getPurchaseOrderById: (id: string) => PurchaseOrder | undefined;
  getPurchaseOrdersByBranch: (branchId: string) => PurchaseOrder[];
  getPurchaseOrdersBySupplier: (supplierId: string) => PurchaseOrder[];
  getPurchaseOrdersByStatus: (status: POStatus) => PurchaseOrder[];
  getNextPONumber: () => string;
}

const PurchaseOrderContext = createContext<PurchaseOrderContextType | undefined>(undefined);

const STORAGE_KEY = "pos_purchase_orders";

export function PurchaseOrderProvider({ children }: { children: ReactNode }) {
  // ═══════════════════════════════════════════════════════════════════
  // SAFE CONTEXT ACCESS - Hooks must be called unconditionally
  // ═══════════════════════════════════════════════════════════════════
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("PurchaseOrderProvider: AuthContext not available", e);
  }
  const business = auth?.business || null;

  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load purchase orders:", error);
      return [];
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // PERSIST TO LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(purchaseOrders));
    } catch (error) {
      console.error("Failed to save purchase orders:", error);
    }
  }, [purchaseOrders]);

  // ═══════════════════════════════════════════════════════════════════
  // GENERATE NEXT PO NUMBER
  // ══════════════════════════════════════════════════════════════════���
  const getNextPONumber = (): string => {
    if (!business) return "PO-001";

    const businessPOs = purchaseOrders.filter(po => po.businessId === business.id);
    const nextNumber = businessPOs.length + 1;
    return `PO-${String(nextNumber).padStart(3, "0")}`;
  };

  // ═══════════════════════════════════════════════════════════════════
  // ADD PURCHASE ORDER (Draft status)
  // ═══════════════════════════════════════════════════════════════════
  const addPurchaseOrder = (
    po: Omit<PurchaseOrder, "id" | "poNumber" | "businessId" | "createdAt" | "updatedAt" | "status">
  ) => {
    if (!business) {
      console.error("Cannot create purchase order: No business context");
      return;
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();

    // Calculate total amount
    const totalAmount = po.items.reduce((sum, item) => {
      return sum + (item.totalCost || 0);
    }, 0);

    const newPO: PurchaseOrder = {
      ...po,
      id: `PO-${dateStr}-${randomId}`,
      poNumber: getNextPONumber(),
      businessId: business.id,
      status: "Draft",
      totalAmount: totalAmount > 0 ? totalAmount : undefined,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    setPurchaseOrders(prev => [newPO, ...prev]);
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PURCHASE ORDER (Draft only)
  // ═══════════════════════════════════════════════════════════════════
  const updatePurchaseOrder = (id: string, updates: Partial<PurchaseOrder>) => {
    setPurchaseOrders(prev =>
      prev.map(po => {
        if (po.id !== id) return po;

        // Only allow updates to Draft status
        if (po.status !== "Draft") {
          console.warn(`Cannot update PO ${id}: Status is ${po.status}, not Draft`);
          return po;
        }

        // Recalculate total if items changed
        let totalAmount = po.totalAmount;
        if (updates.items) {
          totalAmount = updates.items.reduce((sum, item) => {
            return sum + (item.totalCost || 0);
          }, 0);
        }

        return {
          ...po,
          ...updates,
          totalAmount: totalAmount && totalAmount > 0 ? totalAmount : undefined,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // SEND PURCHASE ORDER (Draft → Sent)
  // ═══════════════════════════════════════════════════════════════════
  const sendPurchaseOrder = (id: string, methods: CommunicationMethod[]) => {
    setPurchaseOrders(prev =>
      prev.map(po => {
        if (po.id !== id) return po;

        if (po.status !== "Draft") {
          console.warn(`Cannot send PO ${id}: Status is ${po.status}, not Draft`);
          return po;
        }

        return {
          ...po,
          status: "Sent" as POStatus,
          sentAt: new Date().toISOString(),
          sentVia: methods,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // APPROVE PURCHASE ORDER (Sent → Approved)
  // ═══════════════════════════════════════════════════════════════════
  const approvePurchaseOrder = (id: string, approverStaffId: string, approverStaffName: string) => {
    setPurchaseOrders(prev =>
      prev.map(po => {
        if (po.id !== id) return po;

        if (po.status !== "Sent") {
          console.warn(`Cannot approve PO ${id}: Status is ${po.status}, not Sent`);
          return po;
        }

        return {
          ...po,
          status: "Approved" as POStatus,
          approvedAt: new Date().toISOString(),
          approvedByStaffId: approverStaffId,
          approvedByStaffName: approverStaffName,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // CANCEL PURCHASE ORDER
  // ═══════════════════════════════════════════════════════════════════
  const cancelPurchaseOrder = (id: string, reason: string) => {
    setPurchaseOrders(prev =>
      prev.map(po => {
        if (po.id !== id) return po;

        // Can cancel Draft, Sent, or Approved (not Delivered)
        if (po.status === "Cancelled" || po.status === "Delivered") {
          console.warn(`Cannot cancel PO ${id}: Status is ${po.status}`);
          return po;
        }

        return {
          ...po,
          status: "Cancelled" as POStatus,
          cancelledAt: new Date().toISOString(),
          cancelledReason: reason,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // QUERY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════
  const getPurchaseOrderById = (id: string): PurchaseOrder | undefined => {
    return purchaseOrders.find(po => po.id === id);
  };

  const getPurchaseOrdersByBranch = (branchId: string): PurchaseOrder[] => {
    return purchaseOrders.filter(po => po.branchId === branchId);
  };

  const getPurchaseOrdersBySupplier = (supplierId: string): PurchaseOrder[] => {
    return purchaseOrders.filter(po => po.supplierId === supplierId);
  };

  const getPurchaseOrdersByStatus = (status: POStatus): PurchaseOrder[] => {
    if (!business) return [];
    return purchaseOrders.filter(po => po.businessId === business.id && po.status === status);
  };

  return (
    <PurchaseOrderContext.Provider
      value={{
        purchaseOrders,
        addPurchaseOrder,
        updatePurchaseOrder,
        sendPurchaseOrder,
        approvePurchaseOrder,
        cancelPurchaseOrder,
        getPurchaseOrderById,
        getPurchaseOrdersByBranch,
        getPurchaseOrdersBySupplier,
        getPurchaseOrdersByStatus,
        getNextPONumber
      }}
    >
      {children}
    </PurchaseOrderContext.Provider>
  );
}

export function usePurchaseOrder() {
  const context = useContext(PurchaseOrderContext);
  if (context === undefined) {
    throw new Error("usePurchaseOrder must be used within a PurchaseOrderProvider");
  }
  return context;
}