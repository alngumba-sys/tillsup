import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import { Plus, DollarSign, Building2, TrendingDown, AlertCircle, Filter, X, Trash2, Loader2, Upload, Download, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useExpense } from "../contexts/ExpenseContext";
import { useSubscription } from "../hooks/useSubscription";
import { toast } from "sonner";
import { useCurrency } from "../hooks/useCurrency";
import { Textarea } from "../components/ui/textarea";
import { Alert, AlertDescription } from "../components/ui/alert";
import { SchemaError } from "../components/inventory/SchemaError";
import { validateSubscriptionForImport } from "../utils/subscriptionGuard";

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Supplies",
  "Marketing",
  "Equipment",
  "Maintenance",
  "Transport",
  "Insurance",
  "Other"
];

export function Expenses() {
  const { user, business } = useAuth();
  const { branches, getBranchById } = useBranch();
  const { hasFeature } = useSubscription();
  const navigate = useNavigate();
  const { 
    expenses, 
    createExpense,
    deleteExpense,
    getTotalExpenses,
    getTotalExpensesToday,
    getExpensesByCategory,
    error
  } = useExpense();
  const { formatCurrency, currencySymbol } = useCurrency();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [filterBranchId, setFilterBranchId] = useState<string>(
    user?.role === "Business Owner" ? "ALL_BRANCHES" : user?.branchId || ""
  );
  const [filterCategory, setFilterCategory] = useState<string>("ALL_CATEGORIES");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    category: "Other",
    description: "",
    amount: "",
    branchId: user?.branchId || "",
    date: new Date().toISOString().split('T')[0]
  });

  // ═══════════════════════════════════════════════════════════════════
  // IMPORT/EXPORT STATE
  // ═══════════════════════════════════════════════════════════════════
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importValidation, setImportValidation] = useState<{
    errors: string[];
    warnings: string[];
    success: string[];
    totalRows: number;
  } | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // RBAC: Permission Check
  // ═══════════════════════════════════════════════════════════════════
  const canCreateExpense = user?.canCreateExpense || false;
  const isFeatureEnabled = hasFeature("expenseTracking");

  if (!isFeatureEnabled) {
    return (
      <div className="p-4 lg:p-6">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Expense Tracking is not available on your current plan. 
            <Button 
              variant="link" 
              className="px-1.5 h-auto font-semibold text-amber-900 underline"
              onClick={() => navigate("/app/subscription")}
            >
              Upgrade Plan
            </Button>
            to access this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RBAC: Determine filtering based on role
  // ═══════════════════════════════════════════════════════════════════
  const availableBranches = user?.role === "Business Owner"
    ? branches.filter(b => b.businessId === business?.id && b.status === "active")
    : branches.filter(b => b.id === user?.branchId && b.status === "active");

  // ═══════════════════════════════════════════════════════════════════
  // FILTER: Expenses based on role and filters
  // ═══════════════════════════════════════════════════════════════════
  const filteredExpenses = useMemo(() => {
    if (!business) return [];

    let filtered = expenses.filter(expense => expense.businessId === business.id);

    // Role-based access control
    if (user?.role === "Business Owner") {
      // Business Owner sees all expenses (can filter by branch)
      if (filterBranchId !== "ALL_BRANCHES") {
        filtered = filtered.filter(e => e.branchId === filterBranchId);
      }
    } else if (user?.role === "Manager") {
      // Manager sees only expenses from their branch
      filtered = filtered.filter(e => e.branchId === user.branchId);
    } else {
      // Staff sees only expenses they created
      filtered = filtered.filter(e => e.createdByStaffId === user?.id);
    }

    // Category filter
    if (filterCategory !== "ALL_CATEGORIES") {
      filtered = filtered.filter(e => e.category === filterCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, business, user, filterBranchId, filterCategory, searchQuery]);

  // ═══════════════════════════════════════════════════════════════════
  // ANALYTICS: Calculate KPIs
  // ═══════════════════════════════════════════════════════════════════
  const analytics = useMemo(() => {
    if (!business) return { totalExpenses: 0, todayExpenses: 0, categoryBreakdown: [] };

    const branchFilter = user?.role === "Business Owner" && filterBranchId !== "ALL_BRANCHES" 
      ? filterBranchId 
      : user?.role !== "Business Owner" 
        ? user?.branchId 
        : undefined;

    const totalExpenses = getTotalExpenses(business.id, branchFilter);
    const todayExpenses = getTotalExpensesToday(business.id, branchFilter);
    const categoryMap = getExpensesByCategory(business.id, branchFilter);
    
    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.totalExpenses - a.totalExpenses)
      .slice(0, 5);

    return {
      totalExpenses,
      todayExpenses,
      categoryBreakdown
    };
  }, [business, user, filterBranchId, getTotalExpenses, getTotalExpensesToday, getExpensesByCategory]);

  // ═══════════════════════════════════════════════════════════════════
  // HANDLER: Create Expense
  // ═══════════════════════════════════════════════════════════════════
  const handleCreateExpense = async () => {
    if (!user || !business) return;

    // Validation
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (!formData.branchId) {
      toast.error("Branch is required");
      return;
    }

    const result = await createExpense({
      title: formData.title,
      category: formData.category as any,
      description: formData.description,
      amount: parseFloat(formData.amount),
      businessId: business.id,
      branchId: formData.branchId,
      createdByStaffId: user.id,
      createdByStaffName: `${user.firstName} ${user.lastName}`,
      createdByRole: user.role,
      date: new Date(formData.date)
    });

    if (result.success) {
      toast.success("Expense created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
    } else {
      toast.error(result.error || "Failed to create expense");
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;

    setIsDeleting(true);
    const result = await deleteExpense(expenseToDelete);
    setIsDeleting(false);

    if (result.success) {
      toast.success("Expense deleted successfully");
      setIsDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } else {
      toast.error(result.error || "Failed to delete expense");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      category: "Other",
      description: "",
      amount: "",
      branchId: user?.branchId || "",
      date: new Date().toISOString().split('T')[0]
    });
  };

  const clearFilters = () => {
    setFilterBranchId(user?.role === "Business Owner" ? "ALL_BRANCHES" : user?.branchId || "");
    setFilterCategory("ALL_CATEGORIES");
    setSearchQuery("");
  };

  // ═══════════════════════════════════════════════════════════════════
  // DOWNLOAD IMPORT TEMPLATE
  // ═══════════════════════════════════════════════════════════════════
  const downloadImportTemplate = () => {
    const templateData = [
      {
        "Date": "2026-03-29",
        "Category Name": "Utilities",
        "Description": "March Electricity Bill",
        "Amount": "5500",
        "Reference": "TXN98765"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Style the header row (bold, light gray background)
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "F0F0F0" } }
    };

    // Apply header styling
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = headerStyle;
    }

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 18 }, // Category Name
      { wch: 30 }, // Description
      { wch: 10 }, // Amount
      { wch: 15 }  // Reference
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses Template");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses_import_template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded successfully");
  };

  // ═══════════════════════════════════════════════════════════════════
  // HANDLE FILE UPLOAD
  // ═══════════════════════════════════════════════════════════════════
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportValidation(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATE AND IMPORT EXCEL DATA
  // ═══════════════════════════════════════════════════════════════════
  const validateAndImportExcel = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    // Check subscription status before allowing import
    if (business?.id) {
      try {
        await validateSubscriptionForImport(business.id);
      } catch (error: any) {
        toast.error("Import Blocked", {
          description: error.message || "Subscription Inactive: Please renew your subscription to perform bulk imports."
        });
        setIsProcessingImport(false);
        return;
      }
    }

    setIsProcessingImport(true);
    const errors: string[] = [];
    const warnings: string[] = [];
    const success: string[] = [];

    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Find header row
      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length > 0 && row.includes("Date")) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        errors.push("Could not find header row. Please use the template format.");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      const headers = jsonData[headerRowIndex];
      const dataRows = jsonData.slice(headerRowIndex + 1).filter(row =>
        row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== "")
      );

      if (dataRows.length === 0) {
        errors.push("No data rows found in file");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Create header map
      const headerMap: Record<string, number> = {};
      headers.forEach((header: string, index: number) => {
        if (header) headerMap[header.trim()] = index;
      });

      // Validate required headers
      const requiredHeaders = ["Category Name", "Amount"];
      for (const reqHeader of requiredHeaders) {
        if (!(reqHeader in headerMap)) {
          errors.push(`Missing required column: ${reqHeader}`);
        }
      }

      if (errors.length > 0) {
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = headerRowIndex + i + 2;

        try {
          const dateStr = row[headerMap["Date"]]?.toString().trim() || "";
          const categoryName = row[headerMap["Category Name"]]?.toString().trim() || "Other";
          const description = row[headerMap["Description"]]?.toString().trim() || "";
          const amountStr = row[headerMap["Amount"]]?.toString().trim() || "";
          const reference = row[headerMap["Reference"]]?.toString().trim() || "";

          // Validation
          if (!categoryName) {
            errors.push(`Row ${rowNum}: Category name is required`);
            continue;
          }

          if (!amountStr || isNaN(parseFloat(amountStr))) {
            errors.push(`Row ${rowNum}: Valid amount is required`);
            continue;
          }

          // Parse date
          let expenseDate = new Date().toISOString().split('T')[0];
          if (dateStr) {
            try {
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate.getTime())) {
                expenseDate = parsedDate.toISOString().split('T')[0];
              } else {
                warnings.push(`Row ${rowNum}: Invalid date format, using today's date`);
              }
            } catch {
              warnings.push(`Row ${rowNum}: Invalid date format, using today's date`);
            }
          }

          // Find or create category
          let categoryId = "";
          const existingCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
          
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Create new category
            const newCategory = await addCategory(categoryName);
            if (newCategory) {
              categoryId = newCategory.id;
              warnings.push(`Row ${rowNum}: Created new category "${categoryName}"`);
            } else {
              warnings.push(`Row ${rowNum}: Failed to create category "${categoryName}", using "Other"`);
              // Find "Other" category
              const otherCategory = categories.find(c => c.name.toLowerCase() === "other");
              categoryId = otherCategory?.id || "";
            }
          }

          // Create expense with description including reference if provided
          const fullDescription = reference ? `${description} (Ref: ${reference})` : description;

          const result = await createExpense({
            title: categoryName, // Use category name as title since we don't have a separate title field
            category: categoryId || "Other",
            amount: parseFloat(amountStr),
            description: fullDescription,
            branchId: formData.branchId || user?.branchId || "",
            date: expenseDate
          });

          if (result.success) {
            success.push(`Row ${rowNum}: Created expense "${categoryName}"`);
          } else {
            errors.push(`Row ${rowNum}: ${result.error || "Failed to create expense"}`);
          }
        } catch (error) {
          console.error(`Error processing row ${rowNum}:`, error);
          errors.push(`Row ${rowNum}: Failed to process row`);
        }
      }

      setImportValidation({ errors, warnings, success, totalRows: dataRows.length });

      if (errors.length === 0 && success.length > 0) {
        toast.success(`Successfully imported ${success.length} expenses`);
        setTimeout(() => {
          setIsImportDialogOpen(false);
          setImportFile(null);
          setImportValidation(null);
        }, 3000);
      } else if (errors.length > 0) {
        toast.error(`Import completed with ${errors.length} errors`);
      }
    } catch (error) {
      console.error("Import error:", error);
      errors.push("Failed to read Excel file. Please ensure it's a valid .xlsx file");
      setImportValidation({ errors, warnings, success, totalRows: 0 });
    }

    setIsProcessingImport(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // RESET IMPORT DIALOG
  // ═══════════════════════════════════════════════════════════════════
  const resetImportDialog = () => {
    setImportFile(null);
    setImportValidation(null);
    setIsImportDialogOpen(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-1">Expense Management</h1>
          <p className="text-muted-foreground">
            Track and manage business expenses
          </p>
        </div>
        
        {canCreateExpense && (
          <div className="flex gap-2">
            {/* Import Excel Dialog */}
            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
              if (!open) resetImportDialog();
              setIsImportDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import Expenses
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Expenses from Excel</DialogTitle>
                  <DialogDescription>
                    Upload an Excel file to bulk import expenses
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-6">
                  {/* Template Download */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-slate-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">Need a template?</h3>
                        <p className="text-sm text-slate-600 mb-3">Download our Excel template to get started</p>
                        <Button variant="outline" size="sm" onClick={downloadImportTemplate} className="flex items-center gap-2">
                          <Download className="w-4 h-4 flex-shrink-0" />
                          <span>Download Template</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="grid gap-2">
                    <Label htmlFor="expense-file-upload" className="text-base font-semibold">Upload Excel File (.xlsx)</Label>
                    <Input 
                      id="expense-file-upload" 
                      type="file" 
                      accept=".xlsx,.xls" 
                      onChange={handleFileUpload} 
                      className="cursor-pointer" 
                    />
                    {importFile && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        {importFile.name}
                      </p>
                    )}
                  </div>

                  {/* Import Guidelines */}
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-amber-900 mb-2">Import Guidelines:</h3>
                        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                          <li>Required columns: Title, Category, Amount</li>
                          <li>Optional columns: Description, Date (YYYY-MM-DD)</li>
                          <li>Valid categories: {EXPENSE_CATEGORIES.join(", ")}</li>
                          <li>Expenses will be assigned to your current branch</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Validation Results */}
                  {importValidation && (
                    <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                      {importValidation.success.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-green-900 text-sm mb-1">
                                Success ({importValidation.success.length})
                              </h4>
                              <div className="text-xs text-green-800 space-y-0.5">
                                {importValidation.success.slice(0, 5).map((msg, i) => (
                                  <div key={i}>{msg}</div>
                                ))}
                                {importValidation.success.length > 5 && (
                                  <div className="italic">... and {importValidation.success.length - 5} more</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {importValidation.warnings.length > 0 && (
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-amber-900 text-sm mb-1">
                                Warnings ({importValidation.warnings.length})
                              </h4>
                              <div className="text-xs text-amber-800 space-y-0.5">
                                {importValidation.warnings.slice(0, 5).map((msg, i) => (
                                  <div key={i}>{msg}</div>
                                ))}
                                {importValidation.warnings.length > 5 && (
                                  <div className="italic">... and {importValidation.warnings.length - 5} more</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {importValidation.errors.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                          <div className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-red-900 text-sm mb-1">
                                Errors ({importValidation.errors.length})
                              </h4>
                              <div className="text-xs text-red-800 space-y-0.5">
                                {importValidation.errors.slice(0, 5).map((msg, i) => (
                                  <div key={i}>{msg}</div>
                                ))}
                                {importValidation.errors.length > 5 && (
                                  <div className="italic">... and {importValidation.errors.length - 5} more</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground border-t pt-2">
                        Processed {importValidation.totalRows} rows from Excel file
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={resetImportDialog}>Cancel</Button>
                  <Button onClick={validateAndImportExcel} disabled={!importFile || isProcessingImport} className="gap-2">
                    {isProcessingImport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import Expenses
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create Expense Button */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Expense
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Expense</DialogTitle>
                <DialogDescription>
                  Record a business expense for tracking and reporting.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="expense-title">Title *</Label>
                  <Input
                    id="expense-title"
                    placeholder="e.g., Office Rent - January"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expense-category">Category *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="expense-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.concat(customCategories).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                        <div className="border-t mt-1 pt-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsAddingCategory(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Custom Category
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>
                    {isAddingCategory && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newCategoryName.trim()) {
                              e.preventDefault();
                              if (!EXPENSE_CATEGORIES.concat(customCategories).includes(newCategoryName.trim())) {
                                setCustomCategories([...customCategories, newCategoryName.trim()]);
                                setFormData({ ...formData, category: newCategoryName.trim() });
                                setNewCategoryName("");
                                setIsAddingCategory(false);
                                toast.success("Custom category added");
                              } else {
                                toast.error("Category already exists");
                              }
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newCategoryName.trim()) {
                              if (!EXPENSE_CATEGORIES.concat(customCategories).includes(newCategoryName.trim())) {
                                setCustomCategories([...customCategories, newCategoryName.trim()]);
                                setFormData({ ...formData, category: newCategoryName.trim() });
                                setNewCategoryName("");
                                setIsAddingCategory(false);
                                toast.success("Custom category added");
                              } else {
                                toast.error("Category already exists");
                              }
                            }
                          }}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setNewCategoryName("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="expense-amount">Amount ({currencySymbol}) *</Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expense-branch">Branch *</Label>
                    <Select 
                      value={formData.branchId} 
                      onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                      disabled={user?.role !== "Business Owner"}
                    >
                      <SelectTrigger id="expense-branch">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBranches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {user?.role !== "Business Owner" && (
                      <p className="text-xs text-muted-foreground">
                        Auto-assigned to your branch
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="expense-date">Date *</Label>
                    <Input
                      id="expense-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="expense-description">Description (Optional)</Label>
                  <Textarea
                    id="expense-description"
                    placeholder="Add notes or details about this expense..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateExpense}>
                  Create Expense
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <SchemaError error={error} />

      {/* Permission Alert */}
      {!canCreateExpense && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You do not have permission to create expenses. Contact your Business Owner to grant access.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Total Expenses</span>
              <div className="w-5 h-5 rounded-md bg-red-50 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-2.5 h-2.5 text-red-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-slate-900 leading-none truncate">{formatCurrency(analytics.totalExpenses)}</span>
            </div>
            <p className="text-[9px] text-slate-400">All time</p>
          </CardContent>
        </Card>

        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Today's Expenses</span>
              <div className="w-5 h-5 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-2.5 h-2.5 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-slate-900 leading-none truncate">{formatCurrency(analytics.todayExpenses)}</span>
            </div>
            <p className="text-[9px] text-slate-400">{new Date().toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Total Records</span>
              <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-2.5 h-2.5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-slate-900 leading-none truncate">{filteredExpenses.length}</span>
            </div>
            <p className="text-[9px] text-slate-400">Expense entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>View and manage expense entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_CATEGORIES">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {user?.role === "Business Owner" && (
              <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_BRANCHES">All Branches</SelectItem>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(filterCategory !== "ALL_CATEGORIES" || (user?.role === "Business Owner" && filterBranchId !== "ALL_BRANCHES") || searchQuery) && (
              <Button variant="outline" size="icon" onClick={clearFilters}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => {
                      const branch = getBranchById(expense.branchId);
                      return (
                        <TableRow key={expense.id}>
                          <TableCell className="text-sm">
                            {new Date(expense.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{expense.title}</p>
                              {expense.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                  {expense.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{branch?.name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {expense.createdByStaffName}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              onClick={() => {
                                setExpenseToDelete(expense.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No expenses found</p>
                        {searchQuery || filterCategory !== "ALL_CATEGORIES" ? (
                          <p className="text-sm mt-1">Try adjusting your filters</p>
                        ) : (
                          canCreateExpense && (
                            <p className="text-sm mt-1">Create your first expense to get started</p>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExpense}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}