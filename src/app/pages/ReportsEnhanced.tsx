import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Package, 
  Building2,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  X,
  Receipt,
  AlertCircle
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { useSales } from "../contexts/SalesContext";
import { useInventory } from "../contexts/InventoryContext";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useExpense } from "../contexts/ExpenseContext";
import { useSubscription } from "../hooks/useSubscription";
import { formatCurrency } from "../utils/currency";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6B6B"];

export function ReportsEnhanced() {
  const { 
    sales, 
    getTotalRevenue, 
    getTotalRevenueToday, 
    getTotalCustomersToday,
    getDailySales,
    getBestSellingProducts,
    getSalesByProduct,
    getStaffPerformance,
    getBranchPerformance
  } = useSales();
  
  const { inventory } = useInventory();
  const { user, business, getStaffMembers } = useAuth();
  const { branches, getBranchById } = useBranch();
  const { 
    expenses, 
    getTotalExpenses,
    getTotalExpensesToday,
    getExpensesByBranch,
    getExpensesByCategory 
  } = useExpense();

  const { hasFeature, plan } = useSubscription();
  const navigate = useNavigate();

  // ═══════════════════════════════════════════════════════════════════
  // FILTER STATE
  // ═══════════════════════════════════════════════════════════════════
  const [dateRange, setDateRange] = useState("7days");
  const [filterBranchId, setFilterBranchId] = useState<string>("ALL_BRANCHES");
  const [filterStaffId, setFilterStaffId] = useState<string>("ALL_STAFF");

  // ═══════════════════════════════════════════════════════════════════
  // RBAC: Determine base filtering
  // ═══════════════════════════════════════════════════════════════════
  const { businessId, defaultBranchId, defaultStaffId, canViewAllBranches } = useMemo(() => {
    if (!user || !business) return { 
      businessId: undefined, 
      defaultBranchId: undefined,
      defaultStaffId: undefined,
      canViewAllBranches: false
    };
    
    let businessId = business.id;
    let defaultBranchId: string | undefined = undefined;
    let defaultStaffId: string | undefined = undefined;
    let canViewAllBranches = false;

    // Business Owner can view all branches
    if (user.role === "Business Owner") {
      canViewAllBranches = true;
    }
    // Manager locked to their branch
    else if (user.role === "Manager") {
      defaultBranchId = user.branchId || undefined;
    }
    // Staff/Cashier see only their own data
    else if (user.role === "Cashier" || user.role === "Staff") {
      defaultStaffId = user.id;
      defaultBranchId = user.branchId || undefined;
    }
    // Accountant can view all branches
    else if (user.role === "Accountant") {
      canViewAllBranches = true;
    }
    
    return { businessId, defaultBranchId, defaultStaffId, canViewAllBranches };
  }, [user, business]);

  // ═══════════════════════════════════════════════════════════════════
  // COMPUTED DATE RANGE
  // ═══════════════════════════════════════════════════════════════════
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    let start = new Date();

    switch (dateRange) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "7days":
        start.setDate(start.getDate() - 7);
        break;
      case "30days":
        start.setDate(start.getDate() - 30);
        break;
      case "90days":
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return { startDate: start, endDate: end };
  }, [dateRange]);

  // ═══════════════════════════════════════════════════════════════════
  // APPLY FILTERS
  // ════════════��══════════════════════════════════════════════════════
  const activeBranchId = defaultBranchId || (filterBranchId !== "ALL_BRANCHES" ? filterBranchId : undefined);
  const activeStaffId = defaultStaffId || (filterStaffId !== "ALL_STAFF" ? filterStaffId : undefined);

  // ═══════════════════════════════════════════════════════════════════
  // FILTERED DATA
  // ═══════════════════════════════════════════════════════════════════
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Business filter
      if (businessId && sale.businessId !== businessId) return false;
      
      // Branch filter
      if (activeBranchId && sale.branchId !== activeBranchId) return false;
      
      // Staff filter
      if (activeStaffId && sale.staffId !== activeStaffId) return false;
      
      // Date range filter
      const saleDate = new Date(sale.timestamp);
      if (saleDate < startDate || saleDate > endDate) return false;
      
      return true;
    });
  }, [sales, businessId, activeBranchId, activeStaffId, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Business filter
      if (businessId && expense.businessId !== businessId) return false;
      
      // Branch filter
      if (activeBranchId && expense.branchId !== activeBranchId) return false;
      
      // Staff filter (for expenses created by staff)
      if (activeStaffId && expense.createdByStaffId !== activeStaffId) return false;
      
      // Date range filter
      const expenseDate = new Date(expense.date);
      if (expenseDate < startDate || expenseDate > endDate) return false;
      
      return true;
    });
  }, [expenses, businessId, activeBranchId, activeStaffId, startDate, endDate]);

  // ═══════════════════════════════════════════════════════════════════
  // ANALYTICS CALCULATIONS
  // ══════════════════════════════════════════════════════════════════
  const analytics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate COGS (Cost of Goods Sold) from product purchase prices
    const totalCOGS = filteredSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
      }, 0);
    }, 0);
    
    // Calculate profits properly
    const grossProfit = totalRevenue - totalCOGS; // Revenue - COGS
    const netProfit = grossProfit - totalExpenses; // Gross Profit - Expenses
    
    const totalOrders = filteredSales.length;
    const totalCustomers = filteredSales.reduce((sum, sale) => sum + sale.customerCount, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Daily sales with expenses
    const dailyData = new Map<string, { revenue: number; expenses: number; cogs: number; profit: number }>();
    
    filteredSales.forEach(sale => {
      const dateKey = new Date(sale.timestamp).toDateString();
      const existing = dailyData.get(dateKey) || { revenue: 0, expenses: 0, cogs: 0, profit: 0 };
      existing.revenue += sale.total;
      
      // Calculate COGS for this sale
      const saleCOGS = sale.items.reduce((itemSum, item) => {
        return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
      }, 0);
      existing.cogs += saleCOGS;
      
      dailyData.set(dateKey, existing);
    });
    
    filteredExpenses.forEach(expense => {
      const dateKey = new Date(expense.date).toDateString();
      const existing = dailyData.get(dateKey) || { revenue: 0, expenses: 0, cogs: 0, profit: 0 };
      existing.expenses += expense.amount;
      dailyData.set(dateKey, existing);
    });
    
    // Calculate profit for each day: Revenue - COGS - Expenses
    dailyData.forEach((data) => {
      data.profit = data.revenue - data.cogs - data.expenses;
    });

    const dailySalesData = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.profit
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Last 14 days max

    return {
      totalRevenue,
      totalCOGS,
      totalExpenses,
      grossProfit,
      netProfit,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      dailySalesData
    };
  }, [filteredSales, filteredExpenses]);

  // ═══════════════════════════════════════════════════════════════════
  // BRANCH PERFORMANCE (Business Owner Only)
  // ═══════════════════════════════════════════════════════════════════
  const branchPerformance = useMemo(() => {
    if (!canViewAllBranches || !businessId) return [];

    const branchMap = new Map<string, {
      branchId: string;
      branchName: string;
      revenue: number;
      cogs: number;
      expenses: number;
      profit: number;
      salesCount: number;
      customersCount: number;
    }>();

    // Calculate sales by branch
    filteredSales.forEach(sale => {
      const branch = getBranchById(sale.branchId);
      if (!branch) return;

      const existing = branchMap.get(sale.branchId) || {
        branchId: sale.branchId,
        branchName: branch.name,
        revenue: 0,
        cogs: 0,
        expenses: 0,
        profit: 0,
        salesCount: 0,
        customersCount: 0
      };

      existing.revenue += sale.total;
      existing.salesCount += 1;
      existing.customersCount += sale.customerCount;
      
      // Calculate COGS for this sale
      const saleCOGS = sale.items.reduce((itemSum, item) => {
        return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
      }, 0);
      existing.cogs += saleCOGS;
      
      branchMap.set(sale.branchId, existing);
    });

    // Add expenses by branch
    filteredExpenses.forEach(expense => {
      const branch = getBranchById(expense.branchId);
      if (!branch) return;

      const existing = branchMap.get(expense.branchId) || {
        branchId: expense.branchId,
        branchName: branch.name,
        revenue: 0,
        cogs: 0,
        expenses: 0,
        profit: 0,
        salesCount: 0,
        customersCount: 0
      };

      existing.expenses += expense.amount;
      branchMap.set(expense.branchId, existing);
    });

    // Calculate profit: Revenue - COGS - Expenses
    branchMap.forEach((data) => {
      data.profit = data.revenue - data.cogs - data.expenses;
    });

    return Array.from(branchMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, filteredExpenses, canViewAllBranches, businessId, getBranchById]);

  // ════════════════════════��═════════════════════════════════════════
  // STAFF PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════
  const staffPerformance = useMemo(() => {
    const staffMap = new Map<string, {
      staffId: string;
      staffName: string;
      role: string;
      branchName: string;
      salesCount: number;
      revenue: number;
      customersCount: number;
      avgSaleValue: number;
      expensesCreated: number;
    }>();

    const staffMembers = getStaffMembers();

    filteredSales.forEach(sale => {
      const staff = staffMembers.find(s => s.id === sale.staffId);
      if (!staff) return;

      const branch = getBranchById(sale.branchId);

      const existing = staffMap.get(sale.staffId) || {
        staffId: sale.staffId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        role: staff.role,
        branchName: branch?.name || "Unknown",
        salesCount: 0,
        revenue: 0,
        customersCount: 0,
        avgSaleValue: 0,
        expensesCreated: 0
      };

      existing.salesCount += 1;
      existing.revenue += sale.total;
      existing.customersCount += sale.customerCount;
      staffMap.set(sale.staffId, existing);
    });

    // Add expense creation count
    filteredExpenses.forEach(expense => {
      const staff = staffMembers.find(s => s.id === expense.createdByStaffId);
      if (!staff) return;

      const branch = getBranchById(expense.branchId);

      const existing = staffMap.get(expense.createdByStaffId) || {
        staffId: expense.createdByStaffId,
        staffName: expense.createdByStaffName,
        role: expense.createdByRole,
        branchName: branch?.name || "Unknown",
        salesCount: 0,
        revenue: 0,
        customersCount: 0,
        avgSaleValue: 0,
        expensesCreated: 0
      };

      existing.expensesCreated += 1;
      staffMap.set(expense.createdByStaffId, existing);
    });

    // Calculate avg sale value
    staffMap.forEach((data) => {
      data.avgSaleValue = data.salesCount > 0 ? data.revenue / data.salesCount : 0;
    });

    return Array.from(staffMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, filteredExpenses, getStaffMembers, getBranchById]);

  // ══════════════════════════════════════════════════════════════════
  // EXPENSE CATEGORY BREAKDOWN
  // ══════════════════════════════════════════════════════════════════
  const expenseCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();

    filteredExpenses.forEach(expense => {
      const existing = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, existing + expense.amount);
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // ══════════════════════════════════════════════════════════════════
  // EXPORT TO PDF
  // ═══════════════════════════════════════════════════════════════════
  const exportToPDF = () => {
    if (!hasFeature("exportData")) {
      toast.error("Feature Locked", {
        description: `Exporting reports is not available on your ${plan.name} plan.`,
        action: {
          label: "Upgrade",
          onClick: () => navigate("/app/subscription")
        }
      });
      return;
    }

    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text(business?.name || "Business Report", 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Report Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 14, 30);
      
      if (activeBranchId) {
        const branch = getBranchById(activeBranchId);
        doc.text(`Branch: ${branch?.name || "Unknown"}`, 14, 37);
      }

      // KPI Summary
      doc.setFontSize(14);
      doc.text("Financial Summary", 14, 50);
      
      const kpiData = [
        ["Metric", "Value"],
        ["Total Revenue", formatCurrency(analytics.totalRevenue)],
        ["Total Expenses", formatCurrency(analytics.totalExpenses)],
        ["Net Profit", formatCurrency(analytics.netProfit)],
        ["Total Orders", analytics.totalOrders.toString()],
        ["Total Customers", analytics.totalCustomers.toString()],
        ["Avg Order Value", formatCurrency(analytics.avgOrderValue)]
      ];

      autoTable(doc, {
        startY: 55,
        head: [kpiData[0]],
        body: kpiData.slice(1),
        theme: 'grid'
      });

      // Branch Performance (if applicable)
      if (canViewAllBranches && branchPerformance.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Branch Performance", 14, 20);

        const branchData = [
          ["Branch", "Revenue", "Expenses", "Profit", "Sales"],
          ...branchPerformance.map(b => [
            b.branchName,
            formatCurrency(b.revenue),
            formatCurrency(b.expenses),
            formatCurrency(b.profit),
            b.salesCount.toString()
          ])
        ];

        autoTable(doc, {
          startY: 25,
          head: [branchData[0]],
          body: branchData.slice(1),
          theme: 'grid'
        });
      }

      // Save
      doc.save(`${business?.name || 'Business'}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // EXPORT TO EXCEL
  // ═══════════════════════════════════════════════════════════════════
  const exportToExcel = () => {
    if (!hasFeature("exportData")) {
      toast.error("Feature Locked", {
        description: `Exporting reports is not available on your ${plan.name} plan.`,
        action: {
          label: "Upgrade",
          onClick: () => navigate("/app/subscription")
        }
      });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Sales Transactions
      const salesData = filteredSales.map(sale => ({
        "Sale ID": sale.id,
        "Date": new Date(sale.timestamp).toLocaleString(),
        "Customer Name": sale.customerName || "Walk-in",
        "Sold By": sale.staffName,
        "Branch": getBranchById(sale.branchId)?.name || "Unknown",
        "Customers": sale.customerCount,
        "Total Amount": sale.total,
        "Payment Method": sale.paymentMethod
      }));
      const ws1 = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, ws1, "Sales Transactions");

      // Sheet 2: Expense Transactions
      const expenseData = filteredExpenses.map(expense => ({
        "Expense ID": expense.id,
        "Date": new Date(expense.date).toLocaleDateString(),
        "Title": expense.title,
        "Category": expense.category,
        "Amount": expense.amount,
        "Branch": getBranchById(expense.branchId)?.name || "Unknown",
        "Created By": expense.createdByStaffName,
        "Description": expense.description || ""
      }));
      const ws2 = XLSX.utils.json_to_sheet(expenseData);
      XLSX.utils.book_append_sheet(wb, ws2, "Expense Transactions");

      // Sheet 3: Branch Performance
      if (canViewAllBranches && branchPerformance.length > 0) {
        const branchData = branchPerformance.map(b => ({
          "Branch": b.branchName,
          "Revenue": b.revenue,
          "Expenses": b.expenses,
          "Net Profit": b.profit,
          "Sales Count": b.salesCount,
          "Customers": b.customersCount
        }));
        const ws3 = XLSX.utils.json_to_sheet(branchData);
        XLSX.utils.book_append_sheet(wb, ws3, "Branch Performance");
      }

      // Sheet 4: Staff Performance
      const staffData = staffPerformance.map(s => ({
        "Staff Name": s.staffName,
        "Role": s.role,
        "Branch": s.branchName,
        "Sales Count": s.salesCount,
        "Revenue": s.revenue,
        "Customers": s.customersCount,
        "Avg Sale Value": s.avgSaleValue,
        "Expenses Created": s.expensesCreated
      }));
      const ws4 = XLSX.utils.json_to_sheet(staffData);
      XLSX.utils.book_append_sheet(wb, ws4, "Staff Performance");

      // Save
      XLSX.writeFile(wb, `${business?.name || 'Business'}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Excel exported successfully");
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export Excel");
    }
  };

  const clearFilters = () => {
    setDateRange("7days");
    setFilterBranchId("ALL_BRANCHES");
    setFilterStaffId("ALL_STAFF");
  };

  const hasActiveFilters = dateRange !== "7days" || filterBranchId !== "ALL_BRANCHES" || filterStaffId !== "ALL_STAFF";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-1">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights and performance metrics
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToPDF} className="gap-2">
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={exportToExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle>Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Branch Filter */}
            {canViewAllBranches && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_BRANCHES">All Branches</SelectItem>
                    {branches
                      .filter(b => b.businessId === businessId && b.status === "active")
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Staff Filter */}
            {!defaultStaffId && (
              <div className="space-y-2">
                <Label>Staff Member</Label>
                <Select value={filterStaffId} onValueChange={setFilterStaffId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_STAFF">All Staff</SelectItem>
                    {getStaffMembers()
                      .filter(s => !activeBranchId || s.branchId === activeBranchId)
                      .map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.firstName} {staff.lastName} ({staff.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="font-semibold text-green-600 text-[24px]">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">COGS</p>
                <p className="font-semibold text-orange-600 text-[24px]">{formatCurrency(analytics.totalCOGS)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className={`font-semibold ${analytics.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'} text-[24px]`}>
                  {formatCurrency(analytics.grossProfit)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${analytics.grossProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'} flex items-center justify-center`}>
                {analytics.grossProfit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="font-semibold text-red-600 text-[24px]">{formatCurrency(analytics.totalExpenses)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`font-semibold ${analytics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'} text-[24px]`}>
                  {formatCurrency(analytics.netProfit)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${analytics.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'} flex items-center justify-center`}>
                {analytics.netProfit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          {canViewAllBranches && <TabsTrigger value="branches">Branch Performance</TabsTrigger>}
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="expenses">Expense Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Revenue vs Expenses Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses Trend</CardTitle>
              <CardDescription>Daily comparison over selected period</CardDescription>
            </CardHeader>
            <CardContent style={{ minHeight: '450px' }}>
              <div className="h-[400px] min-h-[400px] w-full" style={{ minHeight: '400px', height: '400px', minWidth: '100%', width: '100%' }}>
                <ResponsiveContainer width="100%" height={400} minHeight={400}>
                  <LineChart data={analytics.dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="Profit" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab - CUSTOMER NAME VISIBILITY */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                Complete transaction history with customer and staff information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSales.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Sold By</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-mono text-xs">
                              {sale.readableId 
                                ? `#${sale.readableId.toString().padStart(5, '0')}` 
                                : sale.id.substring(0, 8)}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>{new Date(sale.timestamp).toLocaleDateString()}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(sale.timestamp).toLocaleTimeString()}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {/* ═══════════════════════════════════════════════════════════════════
                                  CUSTOMER NAME - ALWAYS VISIBLE (Frontend-First Display)
                                  ═══════════════════════════════════════════════════════════════════ */}
                              {sale.customerName || (
                                <span className="text-muted-foreground">Walk-in Customer</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{sale.staffName}</div>
                              <div className="text-xs text-muted-foreground">{sale.staffRole}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {getBranchById(sale.branchId)?.name || "Unknown"}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="space-y-1">
                                {sale.items.map((item, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="font-medium">{item.productName}</span>
                                    <span className="text-muted-foreground"> × {item.quantity}</span>
                                    <span className="text-muted-foreground ml-1">
                                      ({formatCurrency(item.unitPrice)})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(sale.total)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                                Completed
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions found for selected filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branch Performance Tab */}
        {canViewAllBranches && (
          <TabsContent value="branches" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue by Branch */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Branch</CardTitle>
                </CardHeader>
                <CardContent style={{ minHeight: '350px' }}>
                  <div className="h-[300px] min-h-[300px] w-full" style={{ minHeight: '300px', height: '300px', minWidth: '100%', width: '100%' }}>
                    <ResponsiveContainer width="100%" height={300} minHeight={300}>
                      <BarChart data={branchPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="branchName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Profit by Branch */}
              <Card>
                <CardHeader>
                  <CardTitle>Profit by Branch</CardTitle>
                </CardHeader>
                <CardContent style={{ minHeight: '350px' }}>
                  <div className="h-[300px] min-h-[300px] w-full" style={{ minHeight: '300px', height: '300px', minWidth: '100%', width: '100%' }}>
                    <ResponsiveContainer width="100%" height={300} minHeight={300}>
                      <BarChart data={branchPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="branchName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="profit" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Branch Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Branch Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Customers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchPerformance.map((branch) => (
                      <TableRow key={branch.branchId}>
                        <TableCell className="font-medium">{branch.branchName}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(branch.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(branch.expenses)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${branch.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(branch.profit)}
                        </TableCell>
                        <TableCell className="text-right">{branch.salesCount}</TableCell>
                        <TableCell className="text-right">{branch.customersCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Staff Performance Tab */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance Metrics</CardTitle>
              <CardDescription>Sales and performance by team member</CardDescription>
            </CardHeader>
            <CardContent>
              {staffPerformance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Sale</TableHead>
                      <TableHead className="text-right">Expenses Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffPerformance.map((staff) => (
                      <TableRow key={staff.staffId}>
                        <TableCell className="font-medium">{staff.staffName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{staff.role}</Badge>
                        </TableCell>
                        <TableCell>{staff.branchName}</TableCell>
                        <TableCell className="text-right">{staff.salesCount}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(staff.revenue)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(staff.avgSaleValue)}</TableCell>
                        <TableCell className="text-right">{staff.expensesCreated}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No staff performance data available for selected filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Analytics Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent style={{ minHeight: '350px' }}>
                <div className="h-[300px] min-h-[300px] w-full" style={{ minHeight: '300px', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <PieChart>
                      <Pie
                        data={expenseCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expense Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenseCategoryData.map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className="text-red-600 font-semibold">{formatCurrency(category.value)}</span>
                    </div>
                  ))}
                  {expenseCategoryData.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No expense data available for selected filters</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}