import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useExpense } from "./ExpenseContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPPLIER INVOICE CONTEXT - FINANCIAL ACCOUNTING FOR PROCUREMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Record supplier bills/invoices received after delivery
 * - Track money owed to suppliers
 * - Link to Goods Received Notes (GRN) for traceability
 * - Auto-create expenses for accurate profit calculation
 * 
 * CRITICAL SEPARATION OF CONCERNS:
 * - GRN controls STOCK (physical goods received)
 * - Supplier Invoice controls EXPENSES (money owed)
 * - These are SEPARATE but LINKED
 * 
 * ACCOUNTING PRINCIPLE:
 * Stock movement ≠ Money movement
 * 
 * STATUS WORKFLOW:
 * Draft → Approved → Paid
 * 
 * EXPENSE AUTO-CREATION:
 * - When invoice is APPROVED, auto-create expense
 * - Category: "Inventory Procurement"
 * - Amount: Invoice total
 * - Branch: Invoice branch
 * - Source: Supplier Invoice
 * 
 * NON-DESTRUCTIVE GUARANTEE:
 * - Does NOT affect inventory stock levels
 * - Does NOT affect POS or sales logic
 * - Does NOT auto-pay suppliers
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type SupplierInvoiceStatus = "Draft" | "Approved" | "Paid";

export interface SupplierInvoiceLineItem {
  productId: string;
  productName: string;
  productSKU: string;
  quantity: number; // Quantity as per invoice
  unitPrice?: number; // Optional per-unit price
  lineTotal?: number; // Optional line total
}

export interface SupplierInvoice {
  id: string; // Format: INV-YYYYMMDD-XXXX
  invoiceNumber: string; // Supplier-provided invoice number
  businessId: string;
  branchId: string;
  branchName: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  grnId: string;
  grnNumber: string;
  items: SupplierInvoiceLineItem[];
  subtotal: number; // KES
  taxAmount?: number; // Optional tax (KES)
  totalAmount: number; // KES (subtotal + tax)
  invoiceDate: string; // Supplier's invoice date
  dueDate: string; // Payment due date
  status: SupplierInvoiceStatus;
  notes?: string;
  createdByStaffId: string;
  createdByStaffName: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string; // Timestamp when approved
  approvedByStaffId?: string;
  approvedByStaffName?: string;
  paidAt?: string; // Timestamp when marked as paid
  paidByStaffId?: string;
  paidByStaffName?: string;
  linkedExpenseId?: string; // Auto-created expense ID
}

interface SupplierInvoiceContextType {
  supplierInvoices: SupplierInvoice[];
  addSupplierInvoice: (invoice: Omit<SupplierInvoice, "id" | "businessId" | "createdAt" | "updatedAt" | "status" | "linkedExpenseId">) => void;
  updateSupplierInvoice: (id: string, updates: Partial<SupplierInvoice>) => void;
  approveSupplierInvoice: (id: string, approvedByStaffId: string, approvedByStaffName: string) => { success: boolean; error?: string };
  markInvoiceAsPaid: (id: string, paidByStaffId: string, paidByStaffName: string) => void;
  getSupplierInvoiceById: (id: string) => SupplierInvoice | undefined;
  getInvoicesByBranch: (branchId: string) => SupplierInvoice[];
  getInvoicesBySupplier: (supplierId: string) => SupplierInvoice[];
  getInvoicesByGRN: (grnId: string) => SupplierInvoice[];
  getInvoicesByStatus: (status: SupplierInvoiceStatus) => SupplierInvoice[];
  getTotalOutstanding: (businessId?: string, branchId?: string) => number; // Approved but not paid
}

const SupplierInvoiceContext = createContext<SupplierInvoiceContextType | undefined>(undefined);

const STORAGE_KEY = "pos_supplier_invoices";

export function SupplierInvoiceProvider({ children }: { children: ReactNode }) {
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("SupplierInvoiceProvider: AuthContext not available", e);
  }
  const business = auth?.business || null;
  const { createExpense } = useExpense();

  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load supplier invoices:", error);
      return [];
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // PERSIST TO LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supplierInvoices));
    } catch (error) {
      console.error("Failed to save supplier invoices:", error);
    }
  }, [supplierInvoices]);

  // ═══════════════════════════════════════════════════════════════════
  // ADD SUPPLIER INVOICE (Draft status)
  // ═══════════════════════════════════════════════════════════════════
  const addSupplierInvoice = (
    invoice: Omit<SupplierInvoice, "id" | "businessId" | "createdAt" | "updatedAt" | "status" | "linkedExpenseId">
  ) => {
    if (!business) {
      console.error("Cannot create supplier invoice: No business context");
      return;
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();

    const newInvoice: SupplierInvoice = {
      ...invoice,
      id: `INV-${dateStr}-${randomId}`,
      businessId: business.id,
      status: "Draft",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    setSupplierInvoices(prev => [newInvoice, ...prev]);
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE SUPPLIER INVOICE (Draft only - before approval)
  // ═══════════════════════════════════════════════════════════════════
  const updateSupplierInvoice = (id: string, updates: Partial<SupplierInvoice>) => {
    setSupplierInvoices(prev =>
      prev.map(invoice => {
        if (invoice.id !== id) return invoice;

        // Only allow updates to Draft status
        if (invoice.status !== "Draft") {
          console.warn(`Cannot update invoice ${id}: Status is ${invoice.status}, not Draft`);
          return invoice;
        }

        return {
          ...invoice,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // APPROVE SUPPLIER INVOICE (Draft → Approved, creates expense)
  // ═══════════════════════════════════════════════════════════════════
  const approveSupplierInvoice = (
    id: string,
    approvedByStaffId: string,
    approvedByStaffName: string
  ): { success: boolean; error?: string } => {
    const invoice = supplierInvoices.find(inv => inv.id === id);

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status !== "Draft") {
      return { success: false, error: `Invoice is already ${invoice.status}` };
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTO-CREATE EXPENSE FOR ACCOUNTING
    // ═══════════════════════════════════════════════════════════════════
    const expenseResult = createExpense({
      title: `Supplier Invoice: ${invoice.invoiceNumber}`,
      category: "Inventory Procurement",
      description: `Auto-generated from Supplier Invoice ${invoice.invoiceNumber} for ${invoice.supplierName}`,
      amount: invoice.totalAmount,
      businessId: invoice.businessId,
      branchId: invoice.branchId,
      createdByStaffId: approvedByStaffId,
      createdByStaffName: approvedByStaffName,
      createdByRole: "System",
      date: new Date(invoice.invoiceDate),
      sourceType: "SUPPLIER_INVOICE",
      sourceReferenceId: invoice.id,
      sourceReferenceNumber: invoice.invoiceNumber,
      isSystemGenerated: true
    });

    if (!expenseResult.success) {
      return { success: false, error: `Failed to create expense: ${expenseResult.error}` };
    }

    // Update invoice status
    setSupplierInvoices(prev =>
      prev.map(inv =>
        inv.id === id
          ? {
              ...inv,
              status: "Approved" as SupplierInvoiceStatus,
              approvedAt: new Date().toISOString(),
              approvedByStaffId,
              approvedByStaffName,
              updatedAt: new Date().toISOString()
            }
          : inv
      )
    );

    return { success: true };
  };

  // ═══════════════════════════════════════════════════════════════════
  // MARK INVOICE AS PAID (Approved → Paid)
  // ═══════════════════════════════════════════════════════════════════
  const markInvoiceAsPaid = (id: string, paidByStaffId: string, paidByStaffName: string) => {
    setSupplierInvoices(prev =>
      prev.map(invoice => {
        if (invoice.id !== id) return invoice;

        if (invoice.status !== "Approved") {
          console.warn(`Cannot mark invoice ${id} as paid: Status is ${invoice.status}, not Approved`);
          return invoice;
        }

        return {
          ...invoice,
          status: "Paid" as SupplierInvoiceStatus,
          paidAt: new Date().toISOString(),
          paidByStaffId,
          paidByStaffName,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // QUERY FUNCTIONS
  // ═══════════════════════════════════════════════════════���═══════════
  const getSupplierInvoiceById = (id: string): SupplierInvoice | undefined => {
    return supplierInvoices.find(invoice => invoice.id === id);
  };

  const getInvoicesByBranch = (branchId: string): SupplierInvoice[] => {
    return supplierInvoices.filter(invoice => invoice.branchId === branchId);
  };

  const getInvoicesBySupplier = (supplierId: string): SupplierInvoice[] => {
    return supplierInvoices.filter(invoice => invoice.supplierId === supplierId);
  };

  const getInvoicesByGRN = (grnId: string): SupplierInvoice[] => {
    return supplierInvoices.filter(invoice => invoice.grnId === grnId);
  };

  const getInvoicesByStatus = (status: SupplierInvoiceStatus): SupplierInvoice[] => {
    return supplierInvoices.filter(invoice => invoice.status === status);
  };

  const getTotalOutstanding = (businessId?: string, branchId?: string): number => {
    let filtered = supplierInvoices.filter(inv => inv.status === "Approved");

    if (businessId) {
      filtered = filtered.filter(inv => inv.businessId === businessId);
    }

    if (branchId) {
      filtered = filtered.filter(inv => inv.branchId === branchId);
    }

    return filtered.reduce((sum, inv) => sum + inv.totalAmount, 0);
  };

  return (
    <SupplierInvoiceContext.Provider
      value={{
        supplierInvoices,
        addSupplierInvoice,
        updateSupplierInvoice,
        approveSupplierInvoice,
        markInvoiceAsPaid,
        getSupplierInvoiceById,
        getInvoicesByBranch,
        getInvoicesBySupplier,
        getInvoicesByGRN,
        getInvoicesByStatus,
        getTotalOutstanding
      }}
    >
      {children}
    </SupplierInvoiceContext.Provider>
  );
}

export function useSupplierInvoice() {
  const context = useContext(SupplierInvoiceContext);
  if (context === undefined) {
    throw new Error("useSupplierInvoice must be used within a SupplierInvoiceProvider");
  }
  return context;
}
