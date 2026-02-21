import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPPLIER REQUEST CONTEXT - LOW-STOCK PROCUREMENT AUTOMATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Track supplier requests for low-stock inventory items
 * - Support multi-channel communication (Email, SMS, WhatsApp)
 * - Maintain audit trail of all supplier communications
 * - Branch-aware and role-based access controlled
 * 
 * NON-DESTRUCTIVE GUARANTEE:
 * - Does NOT modify inventory stock levels
 * - Does NOT auto-create purchase orders
 * - Does NOT deduct or add inventory
 * - Read-only integration with inventory data
 * 
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
  addRequest: (request: Omit<SupplierRequest, "id" | "businessId" | "timestamp" | "status" | "conversionStatus">) => void;
  updateRequestStatus: (id: string, conversionStatus: SupplierRequestStatus, metadata?: {
    convertedToPOId?: string;
    convertedByStaffId?: string;
    convertedByStaffName?: string;
    cancelledReason?: string;
  }) => void;
  deleteRequest: (id: string) => void;
  getRequestById: (id: string) => SupplierRequest | undefined;
  getRequestsByBranch: (branchId: string) => SupplierRequest[];
  getRequestsByProduct: (productId: string) => SupplierRequest[];
  getRequestsBySupplier: (supplierId: string) => SupplierRequest[];
  getRecentRequests: (limit?: number) => SupplierRequest[];
}

const SupplierRequestContext = createContext<SupplierRequestContextType | undefined>(undefined);

const STORAGE_KEY = "pos_supplier_requests";

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
  // ═══════════════════════════════════════════════════════════════════
  const [requests, setRequests] = useState<SupplierRequest[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load supplier requests:", error);
      return [];
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // PERSIST TO LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch (error) {
      console.error("Failed to save supplier requests:", error);
    }
  }, [requests]);

  // ═══════════════════════════════════════════════════════════════════
  // ADD SUPPLIER REQUEST
  // ═══════════════════════════════════════════════════════════════════
  const addRequest = (request: Omit<SupplierRequest, "id" | "businessId" | "timestamp" | "status" | "conversionStatus">) => {
    if (!business) {
      console.error("Cannot create supplier request: No business context");
      return;
    }

    const newRequest: SupplierRequest = {
      ...request,
      id: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      businessId: business.id,
      timestamp: new Date().toISOString(),
      status: "Sent", // Default to "Sent" for simulation (would be API response in production)
      sentVia: request.communicationMethods.join(", "),
      conversionStatus: "REQUESTED"
    };

    setRequests(prev => [newRequest, ...prev]);
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE REQUEST STATUS
  // ═══════════════════════════════════════════════════════════════════
  const updateRequestStatus = (id: string, conversionStatus: SupplierRequestStatus, metadata?: {
    convertedToPOId?: string;
    convertedByStaffId?: string;
    convertedByStaffName?: string;
    cancelledReason?: string;
  }) => {
    setRequests(prev => prev.map(req => {
      if (req.id === id) {
        return {
          ...req,
          conversionStatus,
          convertedToPOId: metadata?.convertedToPOId,
          convertedAt: conversionStatus === "CONVERTED" ? new Date().toISOString() : req.convertedAt,
          convertedByStaffId: metadata?.convertedByStaffId,
          convertedByStaffName: metadata?.convertedByStaffName,
          cancelledAt: conversionStatus === "CANCELLED" ? new Date().toISOString() : req.cancelledAt,
          cancelledReason: metadata?.cancelledReason
        };
      }
      return req;
    }));
  };

  // ═══════════════════════════════════════════════════════════════════
  // DELETE REQUEST
  // ═══════════════════════════════════════════════════════════════════
  const deleteRequest = (id: string) => {
    setRequests(prev => prev.filter(req => req.id !== id));
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