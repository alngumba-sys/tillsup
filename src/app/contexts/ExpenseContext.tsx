import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./AuthContext";

// ═══════════════════════════════════════════════════════════════════
// EXPENSE DATA MODEL - Multi-Tenant Accounting with Branch Isolation
// Enterprise-grade approval workflow (Part 3-5)
// ═══════════════════════════════════════════════════════════════════

export type ExpenseSource = "MANUAL" | "SUPPLIER_INVOICE";

// ═══════════════════════════════════════════════════════════════════
// EXPENSE STATUS WORKFLOW (Part 3)
// ═══════════════════════════════════════════════════════════════════
export type ExpenseStatus = 
  | "DRAFT"                 // Created but not submitted
  | "PENDING_APPROVAL"      // Submitted, awaiting Business Owner approval
  | "APPROVED"              // Approved by Business Owner, ready for payment
  | "PAID"                  // Payment confirmed - affects reports
  | "REJECTED";             // Rejected by Business Owner

export type PaymentMethod = "Cash" | "Bank" | "Mobile";

// ═══════════════════════════════════════════════════════════════════
// EXPENSE CATEGORIES (Part 3)
// ═══════════════════════════════════════════════════════════════════
export type ExpenseCategory = 
  | "Salary"                // Staff compensation
  | "Cost of Goods Sold"    // COGS - Automatic from sales
  | "Utilities"             // Electricity, water, etc.
  | "Rent"                  // Premises rental
  | "Supplies"              // Office/business supplies
  | "Marketing"             // Advertising, promotions
  | "Transport"             // Vehicle, fuel, etc.
  | "Maintenance"           // Repairs, servicing
  | "Insurance"             // Business insurance
  | "Other";                // Miscellaneous

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  description?: string;
  amount: number; // KES
  businessId: string;
  branchId: string;
  createdByStaffId: string;
  createdByStaffName: string;
  createdByRole: string;
  date: Date;
  createdAt: Date;
  
  // ═══════════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW FIELDS (Part 4)
  // ═══════════════════════════════════════════════════════════════════
  status: ExpenseStatus;
  
  // Approval tracking
  approvedBy?: string;      // User ID who approved
  approvedByName?: string;  // User name who approved
  approvedAt?: Date;        // When approved
  
  // Rejection tracking
  rejectedBy?: string;      // User ID who rejected
  rejectedByName?: string;  // User name who rejected
  rejectedAt?: Date;        // When rejected
  rejectionReason?: string; // Why rejected
  
  // ═══════════════════════════════════════════════════════════════════
  // PAYMENT TRACKING (Part 5)
  // ═══════════════════════════════════════════════════════════════════
  paymentMethod?: PaymentMethod;
  paidAt?: Date;            // When payment was confirmed
  paidBy?: string;          // User ID who confirmed payment
  paidByName?: string;      // User name who confirmed payment
  
  // ═══════════════════════════════════════════════════════════════════
  // SALARY-SPECIFIC FIELDS (Part 3)
  // Links to staff member if this is a salary expense
  // ═══════════════════════════════════════════════════════════════════
  staffId?: string;         // If category is "Salary", which staff member
  salaryMonth?: string;     // e.g., "2024-01" for January 2024
  salaryPeriod?: string;    // e.g., "Week 1", "Biweekly 1"
  
  // Source tracking for linked expenses
  sourceType?: ExpenseSource;
  sourceReferenceId?: string; // Invoice ID, etc.
  sourceReferenceNumber?: string; // Human-readable reference
  isSystemGenerated?: boolean; // Prevents manual editing
}

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  error: any;
  refreshExpenses: () => Promise<void>;
  createExpense: (expense: Omit<Expense, "id" | "createdAt" | "status">) => Promise<{ success: boolean; error?: any }>;
  getExpensesForBusiness: (businessId: string) => Expense[];
  getExpensesForBranch: (branchId: string) => Expense[];
  getExpensesForStaff: (staffId: string) => Expense[];
  getExpensesByDateRange: (startDate: Date, endDate: Date, businessId?: string, branchId?: string) => Expense[];
  getTotalExpenses: (businessId?: string, branchId?: string, staffId?: string) => number;
  getTotalExpensesToday: (businessId?: string, branchId?: string) => number;
  getExpensesByBranch: (businessId: string) => Map<string, { branchId: string; totalExpenses: number; expenseCount: number }>;
  getExpensesByCategory: (businessId?: string, branchId?: string) => Map<string, { category: string; totalExpenses: number; expenseCount: number }>;
  
  // ═══════════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW (Part 4)
  // ═══════════════════════════════════════════════════════════════════
  submitExpense: (expenseId: string) => Promise<{ success: boolean; error?: string }>;
  approveExpense: (expenseId: string, approvedBy: string, approvedByName: string) => Promise<{ success: boolean; error?: string }>;
  rejectExpense: (expenseId: string, rejectedBy: string, rejectedByName: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  
  // ══════════════════════════════════════════════════════════════════
  // PAYMENT WORKFLOW (Part 5)
  // ═══════════════════════════════════════════════════════════════════
  markExpenseAsPaid: (expenseId: string, paidBy: string, paidByName: string, paymentMethod: PaymentMethod) => Promise<{ success: boolean; error?: string }>;
  
  // ═══════════════════════════════════════════════════════════════════
  // FILTERED QUERIES (Part 6)
  // Only PAID expenses affect financial reports
  // ═══════════════════════════════════════════════════════════════════
  getPaidExpenses: (businessId?: string, branchId?: string) => Expense[];
  getTotalPaidExpenses: (businessId?: string, branchId?: string) => number;
  getPendingApprovalExpenses: (businessId: string) => Expense[];
  getApprovedExpenses: (businessId?: string) => Expense[];
  deleteExpense: (expenseId: string) => Promise<{ success: boolean; error?: string }>;
}

export const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════
// EXPENSE PROVIDER - Single Source of Truth for All Expense Data
// ═══════════════════════════════════════════════════════════════════

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { business } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // Helper to map DB record to Expense object
  const mapExpenseFromDB = (record: any): Expense => ({
    id: record.id,
    title: record.title,
    category: record.category as ExpenseCategory,
    description: record.description,
    amount: Number(record.amount),
    businessId: record.business_id,
    branchId: record.branch_id,
    createdByStaffId: record.created_by,
    createdByStaffName: record.created_by_name,
    createdByRole: record.created_by_role,
    date: new Date(record.date),
    createdAt: new Date(record.created_at),
    status: record.status as ExpenseStatus,
    approvedBy: record.approved_by,
    approvedByName: record.approved_by_name,
    approvedAt: record.approved_at ? new Date(record.approved_at) : undefined,
    rejectedBy: record.rejected_by,
    rejectedByName: record.rejected_by_name,
    rejectedAt: record.rejected_at ? new Date(record.rejected_at) : undefined,
    rejectionReason: record.rejection_reason,
    paymentMethod: record.payment_method as PaymentMethod,
    paidAt: record.paid_at ? new Date(record.paid_at) : undefined,
    paidBy: record.paid_by,
    paidByName: record.paid_by_name,
    staffId: record.staff_id,
    salaryMonth: record.salary_month,
    salaryPeriod: record.salary_period,
    sourceType: record.source_type as ExpenseSource,
    sourceReferenceId: record.source_reference_id,
    sourceReferenceNumber: record.source_reference_number,
    isSystemGenerated: record.is_system_generated
  });

  // Fetch expenses from Supabase
  const refreshExpenses = async () => {
    if (!business) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('business_id', business.id);

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setExpenses(data.map(mapExpenseFromDB));
      }
    } catch (err) {
      console.error("Error fetching expenses:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business) {
      refreshExpenses();
    } else {
      setExpenses([]);
    }
  }, [business]);

  // ───────────────────────────────────────────────────────────────
  // CORE: Create Expense
  // ───────────────────────────────────────────────────────────────
  const createExpense = async (expenseData: Omit<Expense, "id" | "createdAt" | "status">): Promise<{ success: boolean; error?: any }> => {
    if (!business) return { success: false, error: "No business context" };

    // Validation
    if (!expenseData.title || expenseData.title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    if (!expenseData.amount || expenseData.amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    if (!expenseData.branchId) {
      return { success: false, error: "Branch is required" };
    }

    const dbRecord = {
      title: expenseData.title,
      category: expenseData.category,
      description: expenseData.description,
      amount: expenseData.amount,
      business_id: business.id,
      branch_id: expenseData.branchId,
      created_by: expenseData.createdByStaffId,
      created_by_name: expenseData.createdByStaffName,
      created_by_role: expenseData.createdByRole,
      date: expenseData.date,
      status: "DRAFT",
      staff_id: expenseData.staffId,
      salary_month: expenseData.salaryMonth,
      salary_period: expenseData.salaryPeriod,
      source_type: expenseData.sourceType || "MANUAL",
      source_reference_id: expenseData.sourceReferenceId,
      source_reference_number: expenseData.sourceReferenceNumber,
      is_system_generated: expenseData.isSystemGenerated || false
    };

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert(dbRecord)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setExpenses(prev => [...prev, mapExpenseFromDB(data)]);
        return { success: true };
      }
      return { success: false, error: "No data returned from insert" };
    } catch (err: any) {
      console.error("Error creating expense:", err);
      setError(err);
      return { success: false, error: err.message || err };
    }
  };

  // ───────────────────────────────────────────────────────────────
  // FILTER: Get Expenses for a Specific Business
  // ───────────────────────────────────────────────────────────────
  const getExpensesForBusiness = (businessId: string): Expense[] => {
    return expenses.filter((expense) => expense.businessId === businessId);
  };

  // ───────────────────────────────────────────────────────────────
  // FILTER: Get Expenses for a Specific Branch
  // ───────────────────────────────────────────────────────────────
  const getExpensesForBranch = (branchId: string): Expense[] => {
    return expenses.filter((expense) => expense.branchId === branchId);
  };

  // ───────────────────────────────────────────────────────────────
  // FILTER: Get Expenses for a Specific Staff Member
  // ───────────────────────────────────────────────────────────────
  const getExpensesForStaff = (staffId: string): Expense[] => {
    return expenses.filter((expense) => expense.createdByStaffId === staffId);
  };

  // ───────────────────────────────────────────────────────────────
  // HELPER: Filter expenses by business, branch, and staff
  // ───────────────────────────────────────────────────────────────
  const filterExpenses = (businessId?: string, branchId?: string, staffId?: string): Expense[] => {
    let filtered = expenses;
    
    if (businessId) {
      filtered = filtered.filter((expense) => expense.businessId === businessId);
    }
    
    if (branchId) {
      filtered = filtered.filter((expense) => expense.branchId === branchId);
    }
    
    if (staffId) {
      filtered = filtered.filter((expense) => expense.createdByStaffId === staffId);
    }
    
    return filtered;
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Get Expenses by Date Range
  // ───────────────────────────────────────────────────────────────
  const getExpensesByDateRange = (startDate: Date, endDate: Date, businessId?: string, branchId?: string): Expense[] => {
    return filterExpenses(businessId, branchId).filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Total Expenses (All Time)
  // ───────────────────────────────────────────────────────────────
  const getTotalExpenses = (businessId?: string, branchId?: string, staffId?: string): number => {
    return filterExpenses(businessId, branchId, staffId).reduce((sum, expense) => sum + expense.amount, 0);
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Total Expenses Today
  // ───────────────────────────────────────────────────────────────
  const getTotalExpensesToday = (businessId?: string, branchId?: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return filterExpenses(businessId, branchId).filter((expense) => {
      const expenseDate = new Date(expense.date);
      expenseDate.setHours(0, 0, 0, 0);
      return expenseDate.getTime() === today.getTime();
    }).reduce((sum, expense) => sum + expense.amount, 0);
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Expenses Grouped by Branch
  // ───────────────────────────────────────────────────────────────
  const getExpensesByBranch = (businessId: string): Map<string, { branchId: string; totalExpenses: number; expenseCount: number }> => {
    const branchMap = new Map<string, { branchId: string; totalExpenses: number; expenseCount: number }>();

    filterExpenses(businessId).forEach((expense) => {
      const existing = branchMap.get(expense.branchId);
      if (existing) {
        existing.totalExpenses += expense.amount;
        existing.expenseCount += 1;
      } else {
        branchMap.set(expense.branchId, {
          branchId: expense.branchId,
          totalExpenses: expense.amount,
          expenseCount: 1,
        });
      }
    });

    return branchMap;
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Expenses Grouped by Category
  // ───────────────────────────────────────────────────────────────
  const getExpensesByCategory = (businessId?: string, branchId?: string): Map<string, { category: string; totalExpenses: number; expenseCount: number }> => {
    const categoryMap = new Map<string, { category: string; totalExpenses: number; expenseCount: number }>();

    filterExpenses(businessId, branchId).forEach((expense) => {
      const existing = categoryMap.get(expense.category);
      if (existing) {
        existing.totalExpenses += expense.amount;
        existing.expenseCount += 1;
      } else {
        categoryMap.set(expense.category, {
          category: expense.category,
          totalExpenses: expense.amount,
          expenseCount: 1,
        });
      }
    });

    return categoryMap;
  };

  // ───────────────────────────────────────────────────────────────
  // APPROVAL WORKFLOW: Submit Expense for Approval
  // ───────────────────────────────────────────────────────────────
  const submitExpense = async (expenseId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'PENDING_APPROVAL' })
        .eq('id', expenseId);

      if (error) throw error;

      setExpenses(prev => prev.map(e => 
        e.id === expenseId ? { ...e, status: "PENDING_APPROVAL" } : e
      ));
      return { success: true };
    } catch (err: any) {
      console.error("Error submitting expense:", err);
      return { success: false, error: err.message };
    }
  };

  // ───────────────────────────────────────────────────────────────
  // APPROVAL WORKFLOW: Approve Expense
  // ───────────────────────────────────────────────────────────────
  const approveExpense = async (expenseId: string, approvedBy: string, approvedByName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const updates = {
        status: 'APPROVED',
        approved_by: approvedBy,
        approved_by_name: approvedByName,
        approved_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId);

      if (error) throw error;

      setExpenses(prev => prev.map(e => 
        e.id === expenseId ? { 
          ...e, 
          status: "APPROVED",
          approvedBy,
          approvedByName,
          approvedAt: new Date()
        } : e
      ));
      return { success: true };
    } catch (err: any) {
      console.error("Error approving expense:", err);
      return { success: false, error: err.message };
    }
  };

  // ───────────────────────────────────────────────────────────────
  // APPROVAL WORKFLOW: Reject Expense
  // ───────────────────────────────────────────────────────────────
  const rejectExpense = async (expenseId: string, rejectedBy: string, rejectedByName: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const updates = {
        status: 'REJECTED',
        rejected_by: rejectedBy,
        rejected_by_name: rejectedByName,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason
      };

      const { error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId);

      if (error) throw error;

      setExpenses(prev => prev.map(e => 
        e.id === expenseId ? { 
          ...e, 
          status: "REJECTED",
          rejectedBy,
          rejectedByName,
          rejectedAt: new Date(),
          rejectionReason: reason
        } : e
      ));
      return { success: true };
    } catch (err: any) {
      console.error("Error rejecting expense:", err);
      return { success: false, error: err.message };
    }
  };

  // ───────────────────────────────────────────────────────────────
  // PAYMENT WORKFLOW: Mark Expense as Paid
  // ───────────────────────────────────────────────────────────────
  const markExpenseAsPaid = async (expenseId: string, paidBy: string, paidByName: string, paymentMethod: PaymentMethod): Promise<{ success: boolean; error?: string }> => {
    try {
      const updates = {
        status: 'PAID',
        payment_method: paymentMethod,
        paid_by: paidBy,
        paid_by_name: paidByName,
        paid_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId);

      if (error) throw error;

      setExpenses(prev => prev.map(e => 
        e.id === expenseId ? { 
          ...e, 
          status: "PAID",
          paymentMethod,
          paidBy,
          paidByName,
          paidAt: new Date()
        } : e
      ));
      return { success: true };
    } catch (err: any) {
      console.error("Error marking expense as paid:", err);
      return { success: false, error: err.message };
    }
  };

  // ──────────────────────────────────────────────────────────────
  // FILTERED QUERIES: Get Paid Expenses
  // ───────────────────────────────────────────────────────────────
  const getPaidExpenses = (businessId?: string, branchId?: string): Expense[] => {
    return filterExpenses(businessId, branchId).filter((expense) => expense.status === "PAID");
  };

  // ───────────────────────────────────────────────────────────────
  // FILTERED QUERIES: Total Paid Expenses
  // ───────────────────────────────────────────────────────────────
  const getTotalPaidExpenses = (businessId?: string, branchId?: string): number => {
    return getPaidExpenses(businessId, branchId).reduce((sum, expense) => sum + expense.amount, 0);
  };

  // ───────────────────────────────────────────────────────────────
  // FILTERED QUERIES: Get Pending Approval Expenses
  // ───────────────────────────────────────────────────────────────
  const getPendingApprovalExpenses = (businessId: string): Expense[] => {
    return getExpensesForBusiness(businessId).filter((expense) => expense.status === "PENDING_APPROVAL");
  };

  // ───────────────────────────────────────────────────────────────
  // FILTERED QUERIES: Get Approved Expenses
  // ───────────────────────────────────────────────────────────────
  const getApprovedExpenses = (businessId?: string): Expense[] => {
    return filterExpenses(businessId).filter((expense) => expense.status === "APPROVED");
  };

  // ───────────────────────────────────────────────────────────────
  // CORE: Delete Expense
  // ───────────────────────────────────────────────────────────────
  const deleteExpense = async (expenseId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      return { success: true };
    } catch (err: any) {
      console.error("Error deleting expense:", err);
      return { success: false, error: err.message };
    }
  };

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        loading,
        error,
        refreshExpenses,
        createExpense,
        getExpensesForBusiness,
        getExpensesForBranch,
        getExpensesForStaff,
        getExpensesByDateRange,
        getTotalExpenses,
        getTotalExpensesToday,
        getExpensesByBranch,
        getExpensesByCategory,
        
        // Approval workflow
        submitExpense,
        approveExpense,
        rejectExpense,
        
        // Payment workflow
        markExpenseAsPaid,
        
        // Filtered queries
        getPaidExpenses,
        getTotalPaidExpenses,
        getPendingApprovalExpenses,
        getApprovedExpenses,
        deleteExpense
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOOK: Use Expense Context
// ══════════════════════════════════════════════════════════════════

export function useExpense() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    // Fallback to prevent crashes if context is missing
    console.warn("useExpense used outside ExpenseProvider - returning fallback context");
    return {
      expenses: [],
      loading: false,
      error: "Context missing",
      refreshExpenses: async () => {},
      createExpense: async () => ({ success: false, error: "Expense context missing" }),
      getExpensesForBusiness: () => [],
      getExpensesForBranch: () => [],
      getExpensesForStaff: () => [],
      getExpensesByDateRange: () => [],
      getTotalExpenses: () => 0,
      getTotalExpensesToday: () => 0,
      getExpensesByBranch: () => new Map(),
      getExpensesByCategory: () => new Map(),
      submitExpense: async () => ({ success: false, error: "Context missing" }),
      approveExpense: async () => ({ success: false, error: "Context missing" }),
      rejectExpense: async () => ({ success: false, error: "Context missing" }),
      markExpenseAsPaid: async () => ({ success: false, error: "Context missing" }),
      getPaidExpenses: () => [],
      getTotalPaidExpenses: () => 0,
      getPendingApprovalExpenses: () => [],
      getApprovedExpenses: () => [],
      deleteExpense: async () => ({ success: false, error: "Context missing" }),
    } as ExpenseContextType;
  }
  return context;
}
