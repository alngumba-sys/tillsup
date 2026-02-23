import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPPLIER REQUEST CONTEXT - LOW-STOCK PROCUREMENT AUTOMATION
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type CommunicationMethod = "Email" | "SMS" | "WhatsApp";
export type RequestStatus = "Sent" | "Failed" | "Pending";
export type SupplierRequestStatus = "REQUESTED" | "CONVERTED" | "CANCELLED";

export interface SupplierRequest {
  id: string;
  businessId: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  currentStock: number;
  requestedQuantity: number;
  communicationMethods: CommunicationMethod[];
  customMessage?: string;
  status: RequestStatus;
  // ═══════════════════════════════════════════════════════════════════
  // CONVERSION FLOW FIELDS
  // ═══════════════════════════════════════════════════════════════════
  conversionStatus: SupplierRequestStatus; // REQUESTED, CONVERTED, CANCELLED
  convertedToPOId?: string; // Reference to Purchase Order (if converted)
  convertedAt?: string; // Timestamp of conversion
  convertedByStaffId?: string;
  convertedByStaffName?: string;
  cancelledAt?: string; // Timestamp of cancellation
  cancelledReason?: string;
  // ══════════════════════════════════════════════════════════════════
  createdByStaffId: string;
  createdByStaffName: string;
  createdByRole: string;
  timestamp: string;
  sentVia?: string; // Actual method used (for audit)
}

interface SupplierRequestContextType {
  requests: SupplierRequest[];
  addRequest: (request: Omit<SupplierRequest, "id" | "businessId" | "timestamp" | "status" | "conversionStatus">) => Promise<void>;
  updateRequestStatus: (id: string, conversionStatus: SupplierRequestStatus, metadata?: {
    convertedToPOId?: string;
    convertedByStaffId?: string;
    convertedByStaffName?: string;
    cancelledReason?: string;
  }) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  getRequestById: (id: string) => SupplierRequest | undefined;
  getRequestsByBranch: (branchId: string) => SupplierRequest[];
  getRequestsByProduct: (productId: string) => SupplierRequest[];
  getRequestsBySupplier: (supplierId: string) => SupplierRequest[];
  getRecentRequests: (limit?: number) => SupplierRequest[];
}

const SupplierRequestContext = createContext<SupplierRequestContextType | undefined>(undefined);

export function SupplierRequestProvider({ children }: { children: ReactNode }) {
  // ═══════════════════════════════════════════════════════════════════
  // SAFE CONTEXT ACCESS
  // ═══════════════════════════════════════════════════════════════════
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn("SupplierRequestProvider: AuthContext not available", e);
  }
  const business = authContext?.business;

  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════���═══════════════════════════════════════════════════
  const [requests, setRequests] = useState<SupplierRequest[]>([]);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!business) {
      setRequests([]);
      return;
    }

    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('supplier_requests')
          .select('*')
          .eq('business_id', business.id)
          .order('timestamp', { ascending: false });

        if (error) throw error;

        if (data) {
          setRequests(data.map((req: any) => ({
            id: req.id,
            businessId: req.business_id,
            branchId: req.branch_id,
            branchName: req.branch_name,
            productId: req.product_id,
            productName: req.product_name,
            supplierId: req.supplier_id,
            supplierName: req.supplier_name,
            currentStock: Number(req.current_stock),
            requestedQuantity: Number(req.requested_quantity),
            communicationMethods: req.communication_methods || [],
            customMessage: req.custom_message,
            status: req.status as RequestStatus,
            conversionStatus: req.conversion_status as SupplierRequestStatus,
            convertedToPOId: req.converted_to_po_id,
            convertedAt: req.converted_at,
            convertedByStaffId: req.converted_by_staff_id,
            convertedByStaffName: req.converted_by_staff_name,
            cancelledAt: req.cancelled_at,
            cancelledReason: req.cancelled_reason,
            createdByStaffId: req.created_by_staff_id,
            createdByStaffName: req.created_by_staff_name,
            createdByRole: req.created_by_role,
            timestamp: req.timestamp,
            sentVia: req.sent_via
          })));
        }
      } catch (err) {
        console.error("Error fetching supplier requests:", err);
      }
    };

    fetchRequests();
  }, [business]);

  // ═══════════════════════════════════════════════════════════════════
  // ADD SUPPLIER REQUEST
  // ═══════════════════════════════════════════════════════════════════
  const addRequest = async (request: Omit<SupplierRequest, "id" | "businessId" | "timestamp" | "status" | "conversionStatus">) => {
    if (!business) {
      console.error("Cannot create supplier request: No business context");
      return;
    }

    const timestamp = new Date().toISOString();
    const id = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newRequest: SupplierRequest = {
      ...request,
      id,
      businessId: business.id,
      timestamp,
      status: "Sent", // Default to "Sent" for simulation
      sentVia: request.communicationMethods.join(", "),
      conversionStatus: "REQUESTED"
    };

    try {
      const dbRequest = {
        id: newRequest.id,
        business_id: newRequest.businessId,
        branch_id: newRequest.branchId,
        branch_name: newRequest.branchName,
        product_id: newRequest.productId,
        product_name: newRequest.productName,
        supplier_id: newRequest.supplierId,
        supplier_name: newRequest.supplierName,
        current_stock: newRequest.currentStock,
        requested_quantity: newRequest.requestedQuantity,
        communication_methods: newRequest.communicationMethods,
        custom_message: newRequest.customMessage,
        status: newRequest.status,
        conversion_status: newRequest.conversionStatus,
        created_by_staff_id: newRequest.createdByStaffId,
        created_by_staff_name: newRequest.createdByStaffName,
        created_by_role: newRequest.createdByRole,
        timestamp: newRequest.timestamp,
        sent_via: newRequest.sentVia
      };

      const { error } = await supabase
        .from('supplier_requests')
        .insert(dbRequest);

      if (error) throw error;

      setRequests(prev => [newRequest, ...prev]);
      toast.success("Supplier request sent");
    } catch (err: any) {
      console.error("Error adding supplier request:", err);
      toast.error("Failed to send supplier request");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE REQUEST STATUS
  // ═══════════════════════════════════════════════════════════════════
  const updateRequestStatus = async (id: string, conversionStatus: SupplierRequestStatus, metadata?: {
    convertedToPOId?: string;
    convertedByStaffId?: string;
    convertedByStaffName?: string;
    cancelledReason?: string;
  }) => {
    try {
      const updates: any = {
        conversion_status: conversionStatus
      };

      if (conversionStatus === "CONVERTED") {
        updates.converted_to_po_id = metadata?.convertedToPOId;
        updates.converted_at = new Date().toISOString();
        updates.converted_by_staff_id = metadata?.convertedByStaffId;
        updates.converted_by_staff_name = metadata?.convertedByStaffName;
      } else if (conversionStatus === "CANCELLED") {
        updates.cancelled_at = new Date().toISOString();
        updates.cancelled_reason = metadata?.cancelledReason;
      }

      const { error } = await supabase
        .from('supplier_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setRequests(prev => prev.map(req => {
        if (req.id === id) {
          return {
            ...req,
            conversionStatus,
            convertedToPOId: metadata?.convertedToPOId,
            convertedAt: conversionStatus === "CONVERTED" ? updates.converted_at : req.convertedAt,
            convertedByStaffId: metadata?.convertedByStaffId,
            convertedByStaffName: metadata?.convertedByStaffName,
            cancelledAt: conversionStatus === "CANCELLED" ? updates.cancelled_at : req.cancelledAt,
            cancelledReason: metadata?.cancelledReason
          };
        }
        return req;
      }));
    } catch (err: any) {
      console.error("Error updating request status:", err);
      toast.error("Failed to update request status");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // DELETE REQUEST
  // ═══════════════════════════════════════════════════════════════════
  const deleteRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('supplier_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRequests(prev => prev.filter(req => req.id !== id));
      toast.success("Request deleted");
    } catch (err: any) {
      console.error("Error deleting request:", err);
      toast.error("Failed to delete request");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // QUERY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════
  const getRequestById = (id: string): SupplierRequest | undefined => {
    return requests.find(req => req.id === id);
  };

  const getRequestsByBranch = (branchId: string): SupplierRequest[] => {
    return requests.filter(req => req.branchId === branchId);
  };

  const getRequestsByProduct = (productId: string): SupplierRequest[] => {
    return requests.filter(req => req.productId === productId);
  };

  const getRequestsBySupplier = (supplierId: string): SupplierRequest[] => {
    return requests.filter(req => req.supplierId === supplierId);
  };

  const getRecentRequests = (limit: number = 10): SupplierRequest[] => {
    if (!business) return [];
    
    return requests
      .filter(req => req.businessId === business.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  };

  return (
    <SupplierRequestContext.Provider
      value={{
        requests,
        addRequest,
        updateRequestStatus,
        deleteRequest,
        getRequestById,
        getRequestsByBranch,
        getRequestsByProduct,
        getRequestsBySupplier,
        getRecentRequests
      }}
    >
      {children}
    </SupplierRequestContext.Provider>
  );
}

export function useSupplierRequest() {
  const context = useContext(SupplierRequestContext);
  if (context === undefined) {
    throw new Error("useSupplierRequest must be used within a SupplierRequestProvider");
  }
  return context;
}
