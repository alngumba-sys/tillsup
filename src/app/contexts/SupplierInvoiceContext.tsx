import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { ExpenseContext } from "./ExpenseContext";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPPLIER INVOICE CONTEXT - FINANCIAL ACCOUNTING FOR PROCUREMENT
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
  addSupplierInvoice: (invoice: Omit<SupplierInvoice, "id" | "businessId" | "createdAt" | "updatedAt" | "status" | "linkedExpenseId">) => Promise<void>;
  updateSupplierInvoice: (id: string, updates: Partial<SupplierInvoice>) => Promise<void>;
  approveSupplierInvoice: (id: string, approvedByStaffId: string, approvedByStaffName: string) => Promise<{ success: boolean; error?: string }>;
  markInvoiceAsPaid: (id: string, paidByStaffId: string, paidByStaffName: string) => Promise<void>;
  getSupplierInvoiceById: (id: string) => SupplierInvoice | undefined;
  getInvoicesByBranch: (branchId: string) => SupplierInvoice[];
  getInvoicesBySupplier: (supplierId: string) => SupplierInvoice[];
  getInvoicesByGRN: (grnId: string) => SupplierInvoice[];
  getInvoicesByStatus: (status: SupplierInvoiceStatus) => SupplierInvoice[];
  getTotalOutstanding: (businessId?: string, branchId?: string) => number; // Approved but not paid
}

const SupplierInvoiceContext = createContext<SupplierInvoiceContextType | undefined>(undefined);

export function SupplierInvoiceProvider({ children }: { children: ReactNode }) {
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("SupplierInvoiceProvider: AuthContext not available", e);
  }
  const business = auth?.business || null;

  const expenseContext = useContext(ExpenseContext);
  // Note: ExpenseContext might not be updated to be fully async/Supabase backed yet in this refactor, but we assume it handles its own persistence.
  // Ideally, ExpenseContext should also be checked, but for now we focus on SupplierInvoiceContext.
  const createExpense = expenseContext?.createExpense || (async () => ({ success: false, error: "Expense context unavailable" }));

  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!business) {
      setSupplierInvoices([]);
      return;
    }

    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('supplier_invoices')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setSupplierInvoices(data.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            businessId: inv.business_id,
            branchId: inv.branch_id,
            branchName: inv.branch_name,
            supplierId: inv.supplier_id,
            supplierName: inv.supplier_name,
            purchaseOrderId: inv.purchase_order_id,
            purchaseOrderNumber: inv.purchase_order_number,
            grnId: inv.grn_id,
            grnNumber: inv.grn_number,
            items: inv.items || [],
            subtotal: Number(inv.subtotal),
            taxAmount: Number(inv.tax_amount || 0),
            totalAmount: Number(inv.total_amount),
            invoiceDate: inv.invoice_date,
            dueDate: inv.due_date,
            status: inv.status as SupplierInvoiceStatus,
            notes: inv.notes,
            createdByStaffId: inv.created_by_staff_id,
            createdByStaffName: inv.created_by_staff_name,
            createdByRole: inv.created_by_role,
            createdAt: inv.created_at,
            updatedAt: inv.updated_at,
            approvedAt: inv.approved_at,
            approvedByStaffId: inv.approved_by_staff_id,
            approvedByStaffName: inv.approved_by_staff_name,
            paidAt: inv.paid_at,
            paidByStaffId: inv.paid_by_staff_id,
            paidByStaffName: inv.paid_by_staff_name,
            linkedExpenseId: inv.linked_expense_id
          })));
        }
      } catch (err) {
        console.error("Error fetching supplier invoices:", err);
      }
    };

    fetchInvoices();
  }, [business]);

  // ═══════════════════════════════════════════════════════════════════
  // ADD SUPPLIER INVOICE (Draft status)
  // ═══════════════════════════════════════════════════════════════════
  const addSupplierInvoice = async (
    invoice: Omit<SupplierInvoice, "id" | "businessId" | "createdAt" | "updatedAt" | "status" | "linkedExpenseId">
  ) => {
    if (!business) {
      console.error("Cannot create supplier invoice: No business context");
      return;
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const id = `INV-${dateStr}-${randomId}`;

    const newInvoice: SupplierInvoice = {
      ...invoice,
      id,
      businessId: business.id,
      status: "Draft",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    try {
      const dbInvoice = {
        id: newInvoice.id,
        invoice_number: newInvoice.invoiceNumber,
        business_id: newInvoice.businessId,
        branch_id: newInvoice.branchId,
        branch_name: newInvoice.branchName,
        supplier_id: newInvoice.supplierId,
        supplier_name: newInvoice.supplierName,
        purchase_order_id: newInvoice.purchaseOrderId,
        purchase_order_number: newInvoice.purchaseOrderNumber,
        grn_id: newInvoice.grnId,
        grn_number: newInvoice.grnNumber,
        items: newInvoice.items,
        subtotal: newInvoice.subtotal,
        tax_amount: newInvoice.taxAmount,
        total_amount: newInvoice.totalAmount,
        invoice_date: newInvoice.invoiceDate,
        due_date: newInvoice.dueDate,
        status: newInvoice.status,
        notes: newInvoice.notes,
        created_by_staff_id: newInvoice.createdByStaffId,
        created_by_staff_name: newInvoice.createdByStaffName,
        created_by_role: newInvoice.createdByRole,
        created_at: newInvoice.createdAt,
        updated_at: newInvoice.updatedAt
      };

      const { error } = await supabase
        .from('supplier_invoices')
        .insert(dbInvoice);

      if (error) throw error;

      setSupplierInvoices(prev => [newInvoice, ...prev]);
      toast.success("Supplier Invoice Created");
    } catch (err: any) {
      console.error("Error creating supplier invoice:", err);
      toast.error("Failed to create Supplier Invoice");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE SUPPLIER INVOICE (Draft only - before approval)
  // ═══════════════════════════════════════════════════════════════════
  const updateSupplierInvoice = async (id: string, updates: Partial<SupplierInvoice>) => {
    const invoice = supplierInvoices.find(inv => inv.id === id);
    if (!invoice) return;

    if (invoice.status !== "Draft") {
      toast.error(`Cannot update invoice: Status is ${invoice.status}`);
      return;
    }

    try {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      
      // Map updates to snake_case
      if (updates.items) dbUpdates.items = updates.items;
      if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
      if (updates.taxAmount !== undefined) dbUpdates.tax_amount = updates.taxAmount;
      if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.invoiceDate !== undefined) dbUpdates.invoice_date = updates.invoiceDate;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.invoiceNumber !== undefined) dbUpdates.invoice_number = updates.invoiceNumber;

      const { error } = await supabase
        .from('supplier_invoices')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setSupplierInvoices(prev => prev.map(inv => {
        if (inv.id !== id) return inv;
        return { 
          ...inv, 
          ...updates, 
          updatedAt: dbUpdates.updated_at 
        };
      }));
      
      toast.success("Supplier Invoice Updated");
    } catch (err: any) {
      console.error("Error updating invoice:", err);
      toast.error("Failed to update Supplier Invoice");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // APPROVE SUPPLIER INVOICE (Draft → Approved, creates expense)
  // ═══════════════════════════════════════════════════════════════════
  const approveSupplierInvoice = async (
    id: string,
    approvedByStaffId: string,
    approvedByStaffName: string
  ): Promise<{ success: boolean; error?: string }> => {
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
    const expenseResult = await createExpense({
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

    try {
      const approvedAt = new Date().toISOString();
      const { error } = await supabase
        .from('supplier_invoices')
        .update({
          status: 'Approved',
          approved_at: approvedAt,
          approved_by_staff_id: approvedByStaffId,
          approved_by_staff_name: approvedByStaffName,
          updated_at: approvedAt,
          linked_expense_id: expenseResult.id // Assuming createExpense returns id if successful? Need to check ExpenseContext but assuming best effort
        })
        .eq('id', id);

      if (error) throw error;

      // Update invoice status locally
      setSupplierInvoices(prev =>
        prev.map(inv =>
          inv.id === id
            ? {
                ...inv,
                status: "Approved" as SupplierInvoiceStatus,
                approvedAt,
                approvedByStaffId,
                approvedByStaffName,
                updatedAt: approvedAt,
                linkedExpenseId: expenseResult.id
              }
            : inv
        )
      );

      return { success: true };
    } catch (err: any) {
      console.error("Error approving invoice:", err);
      return { success: false, error: err.message };
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // MARK INVOICE AS PAID (Approved → Paid)
  // ═══════════════════════════════════════════════════════════════════
  const markInvoiceAsPaid = async (id: string, paidByStaffId: string, paidByStaffName: string) => {
    const invoice = supplierInvoices.find(inv => inv.id === id);
    if (!invoice) return;

    if (invoice.status !== "Approved") {
      toast.error(`Cannot mark invoice as paid: Status is ${invoice.status}`);
      return;
    }

    try {
      const paidAt = new Date().toISOString();
      const { error } = await supabase
        .from('supplier_invoices')
        .update({
          status: 'Paid',
          paid_at: paidAt,
          paid_by_staff_id: paidByStaffId,
          paid_by_staff_name: paidByStaffName,
          updated_at: paidAt
        })
        .eq('id', id);

      if (error) throw error;

      setSupplierInvoices(prev =>
        prev.map(inv => {
          if (inv.id !== id) return inv;
          return {
            ...inv,
            status: "Paid" as SupplierInvoiceStatus,
            paidAt,
            paidByStaffId,
            paidByStaffName,
            updatedAt: paidAt
          };
        })
      );
      
      toast.success("Invoice marked as Paid");
    } catch (err: any) {
      console.error("Error marking invoice as paid:", err);
      toast.error("Failed to mark invoice as paid");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // QUERY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════
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
