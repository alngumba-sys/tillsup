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
import { Plus, DollarSign, Building2, TrendingDown, AlertCircle, Filter, X, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useExpense } from "../contexts/ExpenseContext";
import { useSubscription } from "../hooks/useSubscription";
import { toast } from "sonner";
import { useCurrency } from "../hooks/useCurrency";
import { Textarea } from "../components/ui/textarea";
import { Alert, AlertDescription } from "../components/ui/alert";
import { SchemaError } from "../components/inventory/SchemaError";

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-3xl font-semibold">{formatCurrency(analytics.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Today's Expenses</p>
                <p className="text-3xl font-semibold">{formatCurrency(analytics.todayExpenses)}</p>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-3xl font-semibold">{filteredExpenses.length}</p>
                <p className="text-xs text-muted-foreground">Expense entries</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
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