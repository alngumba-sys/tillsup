import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INVENTORY AUDIT LOG CONTEXT - IMMUTABLE STOCK TRANSACTION HISTORY
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
  addAuditRecord: (record: Omit<InventoryAuditRecord, "id" | "businessId" | "timestamp">) => Promise<void>;
  getAuditsByProduct: (productId: string) => InventoryAuditRecord[];
  getAuditsByBranch: (branchId: string) => InventoryAuditRecord[];
  getAuditsBySource: (source: AuditSource) => InventoryAuditRecord[];
  getAuditsByGRN: (grnId: string) => InventoryAuditRecord[];
  getAuditsByDateRange: (startDate: Date, endDate: Date) => InventoryAuditRecord[];
}

const InventoryAuditContext = createContext<InventoryAuditContextType | undefined>(undefined);

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
  const [auditRecords, setAuditRecords] = useState<InventoryAuditRecord[]>([]);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!business) {
      setAuditRecords([]);
      return;
    }

    const fetchAudits = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_audit_log')
          .select('*')
          .eq('business_id', business.id)
          .order('timestamp', { ascending: false });

        if (error) throw error;

        if (data) {
          setAuditRecords(data.map((rec: any) => ({
            id: rec.id,
            businessId: rec.business_id,
            branchId: rec.branch_id,
            branchName: rec.branch_name,
            productId: rec.product_id,
            productName: rec.product_name,
            productSKU: rec.product_sku,
            action: rec.action as AuditAction,
            quantity: Number(rec.quantity),
            previousStock: Number(rec.previous_stock),
            newStock: Number(rec.new_stock),
            source: rec.source as AuditSource,
            sourceReferenceId: rec.source_reference_id,
            sourceReferenceNumber: rec.source_reference_number,
            performedByStaffId: rec.performed_by_staff_id,
            performedByStaffName: rec.performed_by_staff_name,
            performedByRole: rec.performed_by_role,
            notes: rec.notes,
            timestamp: rec.timestamp
          })));
        }
      } catch (err) {
        console.error("Error fetching inventory audit log:", err);
      }
    };

    fetchAudits();
  }, [business]);

  // ═══════════════════════════════════════════════════════════════════
  // ADD AUDIT RECORD (Create-Only, Immutable)
  // ═══════════════════════════════════════════════════════════════════
  const addAuditRecord = async (
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
    const id = `AUDIT-${dateStr}-${timeStr}-${randomId}`;

    const newRecord: InventoryAuditRecord = {
      ...record,
      id,
      businessId: business.id,
      timestamp
    };

    try {
      const dbRecord = {
        id: newRecord.id,
        business_id: newRecord.businessId,
        branch_id: newRecord.branchId,
        branch_name: newRecord.branchName,
        product_id: newRecord.productId,
        product_name: newRecord.productName,
        product_sku: newRecord.productSKU,
        action: newRecord.action,
        quantity: newRecord.quantity,
        previous_stock: newRecord.previousStock,
        new_stock: newRecord.newStock,
        source: newRecord.source,
        source_reference_id: newRecord.sourceReferenceId,
        source_reference_number: newRecord.sourceReferenceNumber,
        performed_by_staff_id: newRecord.performedByStaffId,
        performed_by_staff_name: newRecord.performedByStaffName,
        performed_by_role: newRecord.performedByRole,
        notes: newRecord.notes,
        timestamp: newRecord.timestamp
      };

      const { error } = await supabase
        .from('inventory_audit_log')
        .insert(dbRecord);

      if (error) throw error;

      setAuditRecords(prev => [newRecord, ...prev]);
    } catch (err: any) {
      console.error("Error adding audit record:", err);
      toast.error("Failed to log inventory audit");
    }
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
