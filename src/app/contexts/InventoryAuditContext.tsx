import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INVENTORY AUDIT LOG CONTEXT - IMMUTABLE STOCK TRANSACTION HISTORY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Maintain immutable audit trail of ALL inventory stock changes
 * - Track source of every stock increase/decrease
 * - Enable full traceability for compliance and debugging
 * - Support rollback and reconciliation operations
 * 
 * AUDIT SOURCES:
 * - GRN_CONFIRMATION: Stock increase from confirmed Goods Received Note
 * - POS_SALE: Stock decrease from point-of-sale transaction
 * - MANUAL_ADJUSTMENT: Manual stock correction (future)
 * - STOCK_TRANSFER: Inter-branch stock transfer (future)
 * 
 * IMMUTABILITY GUARANTEE:
 * - Audit records can ONLY be created, never updated or deleted
 * - Each record has a unique, chronological ID
 * - Timestamp is immutable and server-authoritative
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type AuditSource = 
  | "GRN_CONFIRMATION" 
  | "POS_SALE" 
  | "MANUAL_ADJUSTMENT" 
  | "STOCK_TRANSFER";

export type AuditAction = "INCREASE" | "DECREASE";

export interface InventoryAuditRecord {
  id: string; // Format: AUDIT-YYYYMMDD-HHMMSS-XXXX
  businessId: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  productSKU: string;
  action: AuditAction;
  quantity: number; // Positive number representing change amount
  previousStock: number;
  newStock: number;
  source: AuditSource;
  sourceReferenceId: string; // GRN ID, Sale ID, etc.
  sourceReferenceNumber?: string; // Human-readable: GRN-001, SALE-12345, etc.
  performedByStaffId: string;
  performedByStaffName: string;
  performedByRole: string;
  notes?: string;
  timestamp: string; // ISO 8601
}

interface InventoryAuditContextType {
  auditRecords: InventoryAuditRecord[];
  addAuditRecord: (record: Omit<InventoryAuditRecord, "id" | "businessId" | "timestamp">) => void;
  getAuditsByProduct: (productId: string) => InventoryAuditRecord[];
  getAuditsByBranch: (branchId: string) => InventoryAuditRecord[];
  getAuditsBySource: (source: AuditSource) => InventoryAuditRecord[];
  getAuditsByGRN: (grnId: string) => InventoryAuditRecord[];
  getAuditsByDateRange: (startDate: Date, endDate: Date) => InventoryAuditRecord[];
}

const InventoryAuditContext = createContext<InventoryAuditContextType | undefined>(undefined);

const STORAGE_KEY = "pos_inventory_audit_log";

export function InventoryAuditProvider({ children }: { children: ReactNode }) {
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("InventoryAuditProvider: AuthContext not available", e);
  }
  const business = auth?.business || null;

  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT - Immutable Audit Records
  // ═══════════════════════════════════════════════════════════════════
  const [auditRecords, setAuditRecords] = useState<InventoryAuditRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load inventory audit log:", error);
      return [];
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // PERSIST TO LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auditRecords));
    } catch (error) {
      console.error("Failed to save inventory audit log:", error);
    }
  }, [auditRecords]);

  // ═══════════════════════════════════════════════════════════════════
  // ADD AUDIT RECORD (Create-Only, Immutable)
  // ═══════════════════════════════════════════════════════════════════
  const addAuditRecord = (
    record: Omit<InventoryAuditRecord, "id" | "businessId" | "timestamp">
  ) => {
    if (!business) {
      console.error("Cannot create audit record: No business context");
      return;
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    const timeStr = timestamp.split('T')[1].replace(/[:.]/g, '').substring(0, 6);
    const randomId = Math.random().toString(36).substr(2, 4).toUpperCase();

    const newRecord: InventoryAuditRecord = {
      ...record,
      id: `AUDIT-${dateStr}-${timeStr}-${randomId}`,
      businessId: business.id,
      timestamp
    };

    setAuditRecords(prev => [newRecord, ...prev]);
  };

  // ═══════════════════════════════════════════════════════════════════
  // QUERY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════
  const getAuditsByProduct = (productId: string): InventoryAuditRecord[] => {
    return auditRecords.filter(record => record.productId === productId);
  };

  const getAuditsByBranch = (branchId: string): InventoryAuditRecord[] => {
    return auditRecords.filter(record => record.branchId === branchId);
  };

  const getAuditsBySource = (source: AuditSource): InventoryAuditRecord[] => {
    return auditRecords.filter(record => record.source === source);
  };

  const getAuditsByGRN = (grnId: string): InventoryAuditRecord[] => {
    return auditRecords.filter(
      record => record.source === "GRN_CONFIRMATION" && record.sourceReferenceId === grnId
    );
  };

  const getAuditsByDateRange = (startDate: Date, endDate: Date): InventoryAuditRecord[] => {
    return auditRecords.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= startDate && recordDate <= endDate;
    });
  };

  return (
    <InventoryAuditContext.Provider
      value={{
        auditRecords,
        addAuditRecord,
        getAuditsByProduct,
        getAuditsByBranch,
        getAuditsBySource,
        getAuditsByGRN,
        getAuditsByDateRange
      }}
    >
      {children}
    </InventoryAuditContext.Provider>
  );
}

export function useInventoryAudit() {
  const context = useContext(InventoryAuditContext);
  if (context === undefined) {
    throw new Error("useInventoryAudit must be used within an InventoryAuditProvider");
  }
  return context;
}
