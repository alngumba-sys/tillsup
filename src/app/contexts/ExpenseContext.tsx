import { createContext, useContext, useState, ReactNode } from "react";

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
  createExpense: (expense: Omit<Expense, "id" | "createdAt">) => { success: boolean; error?: string };
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
  submitExpense: (expenseId: string) => { success: boolean; error?: string };
  approveExpense: (expenseId: string, approvedBy: string, approvedByName: string) => { success: boolean; error?: string };
  rejectExpense: (expenseId: string, rejectedBy: string, rejectedByName: string, reason?: string) => { success: boolean; error?: string };
  
  // ══════════════════════════════════════════════════════════════════
  // PAYMENT WORKFLOW (Part 5)
  // ═══════════════════════════════════════════════════════════════════
  markExpenseAsPaid: (expenseId: string, paidBy: string, paidByName: string, paymentMethod: PaymentMethod) => { success: boolean; error?: string };
  
  // ═══════════════════════════════════════════════════════════════════
  // FILTERED QUERIES (Part 6)
  // Only PAID expenses affect financial reports
  // ═══════════════════════════════════════════════════════════════════
  getPaidExpenses: (businessId?: string, branchId?: string) => Expense[];
  getTotalPaidExpenses: (businessId?: string, branchId?: string) => number;
  getPendingApprovalExpenses: (businessId: string) => Expense[];
  getApprovedExpenses: (businessId?: string) => Expense[];
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════
// EXPENSE PROVIDER - Single Source of Truth for All Expense Data
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY = "pos_expense_records";

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((e: Expense) => ({
          ...e,
          date: new Date(e.date),
          createdAt: new Date(e.createdAt),
          approvedAt: e.approvedAt ? new Date(e.approvedAt) : undefined,
          rejectedAt: e.rejectedAt ? new Date(e.rejectedAt) : undefined,
          paidAt: e.paidAt ? new Date(e.paidAt) : undefined,
        }));
      }
    } catch (error) {
      console.error("Failed to load expenses from localStorage:", error);
    }
    return [];
  });

  // Persist to localStorage whenever expenses change
  const updateExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newExpenses));
    } catch (error) {
      console.error("Failed to save expenses to localStorage:", error);
    }
  };

  // ───────────────────────────────────────────────────────────────
  // CORE: Create Expense
  // ───────────────────────────────────────────────────────────────
  const createExpense = (expenseData: Omit<Expense, "id" | "createdAt">): { success: boolean; error?: string } => {
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

    if (!expenseData.businessId) {
      return { success: false, error: "Business ID is required" };
    }

    const newExpense: Expense = {
      ...expenseData,
      id: `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: "DRAFT",
    };

    updateExpenses([...expenses, newExpense]);
    return { success: true };
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
  const submitExpense = (expenseId: string): { success: boolean; error?: string } => {
    const expenseIndex = expenses.findIndex((expense) => expense.id === expenseId);
    if (expenseIndex === -1) {
      return { success: false, error: "Expense not found" };
    }

    const expense = expenses[expenseIndex];
    if (expense.status !== "DRAFT") {
      return { success: false, error: "Expense is not in draft status" };
    }

    const updatedExpense: Expense = {
      ...expense,
      status: "PENDING_APPROVAL",
    };

    updateExpenses([
      ...expenses.slice(0, expenseIndex),
      updatedExpense,
      ...expenses.slice(expenseIndex + 1),
    ]);

    return { success: true };
  };

  // ───────────────────────────────────────────────────────────────
  // APPROVAL WORKFLOW: Approve Expense
  // ───────────────────────────────────────────────────────────────
  const approveExpense = (expenseId: string, approvedBy: string, approvedByName: string): { success: boolean; error?: string } => {
    const expenseIndex = expenses.findIndex((expense) => expense.id === expenseId);
    if (expenseIndex === -1) {
      return { success: false, error: "Expense not found" };
    }

    const expense = expenses[expenseIndex];
    if (expense.status !== "PENDING_APPROVAL") {
      return { success: false, error: "Expense is not pending approval" };
    }

    const updatedExpense: Expense = {
      ...expense,
      status: "APPROVED",
      approvedBy,
      approvedByName,
      approvedAt: new Date(),
    };

    updateExpenses([
      ...expenses.slice(0, expenseIndex),
      updatedExpense,
      ...expenses.slice(expenseIndex + 1),
    ]);

    return { success: true };
  };

  // ───────────────────────────────────────────────────────────────
  // APPROVAL WORKFLOW: Reject Expense
  // ───────────────────────────────────────────────────────────────
  const rejectExpense = (expenseId: string, rejectedBy: string, rejectedByName: string, reason?: string): { success: boolean; error?: string } => {
    const expenseIndex = expenses.findIndex((expense) => expense.id === expenseId);
    if (expenseIndex === -1) {
      return { success: false, error: "Expense not found" };
    }

    const expense = expenses[expenseIndex];
    if (expense.status !== "PENDING_APPROVAL") {
      return { success: false, error: "Expense is not pending approval" };
    }

    const updatedExpense: Expense = {
      ...expense,
      status: "REJECTED",
      rejectedBy,
      rejectedByName,
      rejectedAt: new Date(),
      rejectionReason: reason,
    };

    updateExpenses([
      ...expenses.slice(0, expenseIndex),
      updatedExpense,
      ...expenses.slice(expenseIndex + 1),
    ]);

    return { success: true };
  };

  // ───────────────────────────────────────────────────────────────
  // PAYMENT WORKFLOW: Mark Expense as Paid
  // ───────────────────────────────────────────────────────────────
  const markExpenseAsPaid = (expenseId: string, paidBy: string, paidByName: string, paymentMethod: PaymentMethod): { success: boolean; error?: string } => {
    const expenseIndex = expenses.findIndex((expense) => expense.id === expenseId);
    if (expenseIndex === -1) {
      return { success: false, error: "Expense not found" };
    }

    const expense = expenses[expenseIndex];
    if (expense.status !== "APPROVED") {
      return { success: false, error: "Expense is not approved" };
    }

    const updatedExpense: Expense = {
      ...expense,
      status: "PAID",
      paymentMethod,
      paidBy,
      paidByName,
      paidAt: new Date(),
    };

    updateExpenses([
      ...expenses.slice(0, expenseIndex),
      updatedExpense,
      ...expenses.slice(expenseIndex + 1),
    ]);

    return { success: true };
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

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
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
    throw new Error("useExpense must be used within an ExpenseProvider");
  }
  return context;
}