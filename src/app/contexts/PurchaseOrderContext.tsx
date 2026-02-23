import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PURCHASE ORDER CONTEXT - ENTERPRISE PROCUREMENT REQUEST SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
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
  addPurchaseOrder: (po: Omit<PurchaseOrder, "id" | "poNumber" | "businessId" | "createdAt" | "updatedAt" | "status">) => Promise<string | undefined>;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<void>;
  sendPurchaseOrder: (id: string, methods: CommunicationMethod[]) => Promise<void>;
  approvePurchaseOrder: (id: string, approverStaffId: string, approverStaffName: string) => Promise<void>;
  cancelPurchaseOrder: (id: string, reason: string) => Promise<void>;
  getPurchaseOrderById: (id: string) => PurchaseOrder | undefined;
  getPurchaseOrdersByBranch: (branchId: string) => PurchaseOrder[];
  getPurchaseOrdersBySupplier: (supplierId: string) => PurchaseOrder[];
  getPurchaseOrdersByStatus: (status: POStatus) => PurchaseOrder[];
  getNextPONumber: () => string;
}

const PurchaseOrderContext = createContext<PurchaseOrderContextType | undefined>(undefined);

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
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // ══════════════════════════════════════════════════════════════════
  // FETCH FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!business) {
      setPurchaseOrders([]);
      return;
    }

    const fetchPOs = async () => {
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setPurchaseOrders(data.map((po: any) => ({
            id: po.id,
            poNumber: po.po_number,
            businessId: po.business_id,
            branchId: po.branch_id,
            branchName: po.branch_name,
            supplierId: po.supplier_id,
            supplierName: po.supplier_name,
            supplierContact: po.supplier_contact,
            items: po.items || [],
            expectedDeliveryDate: po.expected_delivery_date,
            notes: po.notes,
            status: po.status as POStatus,
            totalAmount: po.total_amount ? Number(po.total_amount) : undefined,
            sourceRequestId: po.source_request_id,
            createdByStaffId: po.created_by_staff_id,
            createdByStaffName: po.created_by_staff_name,
            createdByRole: po.created_by_role,
            createdAt: po.created_at,
            updatedAt: po.updated_at,
            sentAt: po.sent_at,
            sentVia: po.sent_via,
            approvedAt: po.approved_at,
            approvedByStaffId: po.approved_by_staff_id,
            approvedByStaffName: po.approved_by_staff_name,
            cancelledAt: po.cancelled_at,
            cancelledReason: po.cancelled_reason
          })));
        }
      } catch (err) {
        console.error("Error fetching purchase orders:", err);
      }
    };

    fetchPOs();
  }, [business]);

  // ═══════════════════════════════════════════════════════════════════
  // GENERATE NEXT PO NUMBER
  // ═══════════════════════════════════════════════════════════════════
  const getNextPONumber = (): string => {
    if (!business) return "PO-001";

    const businessPOs = purchaseOrders.filter(po => po.businessId === business.id);
    const nextNumber = businessPOs.length + 1;
    return `PO-${String(nextNumber).padStart(3, "0")}`;
  };

  // ═══════════════════════════════════════════════════════════════════
  // ADD PURCHASE ORDER (Draft status)
  // ═══════════════════════════════════════════════════════════════════
  const addPurchaseOrder = async (
    po: Omit<PurchaseOrder, "id" | "poNumber" | "businessId" | "createdAt" | "updatedAt" | "status">
  ): Promise<string | undefined> => {
    if (!business) {
      console.error("Cannot create purchase order: No business context");
      return undefined;
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const id = `PO-${dateStr}-${randomId}`;

    // Calculate total amount
    const totalAmount = po.items.reduce((sum, item) => {
      return sum + (item.totalCost || 0);
    }, 0);

    const newPO: PurchaseOrder = {
      ...po,
      id,
      poNumber: getNextPONumber(), // Note: potential race condition here but acceptable for this scope
      businessId: business.id,
      status: "Draft",
      totalAmount: totalAmount > 0 ? totalAmount : undefined,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    try {
      const dbPO = {
        id: newPO.id,
        po_number: newPO.poNumber,
        business_id: newPO.businessId,
        branch_id: newPO.branchId,
        branch_name: newPO.branchName,
        supplier_id: newPO.supplierId,
        supplier_name: newPO.supplierName,
        supplier_contact: newPO.supplierContact,
        items: newPO.items,
        expected_delivery_date: newPO.expectedDeliveryDate,
        notes: newPO.notes,
        status: newPO.status,
        total_amount: newPO.totalAmount,
        source_request_id: newPO.sourceRequestId,
        created_by_staff_id: newPO.createdByStaffId,
        created_by_staff_name: newPO.createdByStaffName,
        created_by_role: newPO.createdByRole,
        created_at: newPO.createdAt,
        updated_at: newPO.updatedAt
      };

      const { error } = await supabase
        .from('purchase_orders')
        .insert(dbPO);

      if (error) throw error;

      setPurchaseOrders(prev => [newPO, ...prev]);
      toast.success("Purchase Order Created");
      return id;
    } catch (err: any) {
      console.error("Error creating purchase order:", err);
      toast.error("Failed to create Purchase Order");
      return undefined;
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PURCHASE ORDER (Draft only)
  // ═══════════════════════════════════════════════════════════════════
  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po) return;

    if (po.status !== "Draft") {
      toast.error(`Cannot update PO: Status is ${po.status}`);
      return;
    }

    try {
      const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
      
      // Recalculate total if items changed
      if (updates.items) {
        dbUpdates.total_amount = updates.items.reduce((sum, item) => {
          return sum + (item.totalCost || 0);
        }, 0);
        dbUpdates.items = updates.items;
      }

      // Map other fields to snake_case if necessary (assuming direct mapping for simplistic fields works if keys match or are explicitly handled)
      // Since updates uses camelCase, we need to map strictly.
      const mappedUpdates: any = { updated_at: dbUpdates.updated_at };
      if (dbUpdates.total_amount) mappedUpdates.total_amount = dbUpdates.total_amount;
      if (dbUpdates.items) mappedUpdates.items = dbUpdates.items;
      if (updates.notes !== undefined) mappedUpdates.notes = updates.notes;
      if (updates.expectedDeliveryDate !== undefined) mappedUpdates.expected_delivery_date = updates.expectedDeliveryDate;
      if (updates.supplierContact !== undefined) mappedUpdates.supplier_contact = updates.supplierContact;

      const { error } = await supabase
        .from('purchase_orders')
        .update(mappedUpdates)
        .eq('id', id);

      if (error) throw error;

      setPurchaseOrders(prev => prev.map(p => {
        if (p.id !== id) return p;
        return { 
          ...p, 
          ...updates, 
          totalAmount: dbUpdates.total_amount,
          updatedAt: dbUpdates.updated_at 
        };
      }));
      
      toast.success("Purchase Order Updated");
    } catch (err: any) {
      console.error("Error updating PO:", err);
      toast.error("Failed to update Purchase Order");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // SEND PURCHASE ORDER (Draft → Sent)
  // ═══════════════════════════════════════════════════════════════════
  const sendPurchaseOrder = async (id: string, methods: CommunicationMethod[]) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po) return;

    if (po.status !== "Draft") {
      toast.error(`Cannot send PO: Status is ${po.status}`);
      return;
    }

    try {
      const sentAt = new Date().toISOString();
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Sent',
          sent_at: sentAt,
          sent_via: methods,
          updated_at: sentAt
        })
        .eq('id', id);

      if (error) throw error;

      setPurchaseOrders(prev => prev.map(p => {
        if (p.id !== id) return p;
        return {
          ...p,
          status: "Sent",
          sentAt,
          sentVia: methods,
          updatedAt: sentAt
        };
      }));
      
      toast.success("Purchase Order Sent");
    } catch (err: any) {
      console.error("Error sending PO:", err);
      toast.error("Failed to send Purchase Order");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // APPROVE PURCHASE ORDER (Sent → Approved)
  // ═══════════════════════════════════════════════════════════════════
  const approvePurchaseOrder = async (id: string, approverStaffId: string, approverStaffName: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po) return;

    if (po.status !== "Sent") {
      toast.error(`Cannot approve PO: Status is ${po.status}`);
      return;
    }

    try {
      const approvedAt = new Date().toISOString();
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Approved',
          approved_at: approvedAt,
          approved_by_staff_id: approverStaffId,
          approved_by_staff_name: approverStaffName,
          updated_at: approvedAt
        })
        .eq('id', id);

      if (error) throw error;

      setPurchaseOrders(prev => prev.map(p => {
        if (p.id !== id) return p;
        return {
          ...p,
          status: "Approved",
          approvedAt,
          approvedByStaffId: approverStaffId,
          approvedByStaffName: approverStaffName,
          updatedAt: approvedAt
        };
      }));
      
      toast.success("Purchase Order Approved");
    } catch (err: any) {
      console.error("Error approving PO:", err);
      toast.error("Failed to approve Purchase Order");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // CANCEL PURCHASE ORDER
  // ═══════════════════════════════════════════════════════════════════
  const cancelPurchaseOrder = async (id: string, reason: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po) return;

    if (po.status === "Cancelled" || po.status === "Delivered") {
      toast.error(`Cannot cancel PO: Status is ${po.status}`);
      return;
    }

    try {
      const cancelledAt = new Date().toISOString();
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Cancelled',
          cancelled_at: cancelledAt,
          cancelled_reason: reason,
          updated_at: cancelledAt
        })
        .eq('id', id);

      if (error) throw error;

      setPurchaseOrders(prev => prev.map(p => {
        if (p.id !== id) return p;
        return {
          ...p,
          status: "Cancelled",
          cancelledAt,
          cancelledReason: reason,
          updatedAt: cancelledAt
        };
      }));
      
      toast.success("Purchase Order Cancelled");
    } catch (err: any) {
      console.error("Error cancelling PO:", err);
      toast.error("Failed to cancel Purchase Order");
    }
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
