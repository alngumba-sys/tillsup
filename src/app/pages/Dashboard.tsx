import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ShoppingCart, DollarSign, TrendingUp, Users, Database, Info, Crown, AlertCircle, TrendingDown, Receipt, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { useKPI } from "../contexts/KPIContext";
import { useSales } from "../contexts/SalesContext";
import { useInventory } from "../contexts/InventoryContext";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { useBranch } from "../contexts/BranchContext";
import { useExpense } from "../contexts/ExpenseContext";
import { useCategory } from "../contexts/CategoryContext";
import { Button } from "../components/ui/button";
import { seedDemoSales } from "../utils/seedDemoSales";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useCurrency } from "../hooks/useCurrency";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "../components/ui/dialog";
import { Package } from "lucide-react";
import { Building2 } from "lucide-react";
import { SchemaError } from "../components/inventory/SchemaError";
import { isPreviewMode } from "../utils/previewMode";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../components/ui/table";
import { Input } from "../components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../components/ui/select";

const salesData = [
  { name: "Mon", sales: 4200 },
  { name: "Tue", sales: 5100 },
  { name: "Wed", sales: 4800 },
  { name: "Thu", sales: 6200 },
  { name: "Fri", sales: 7100 },
  { name: "Sat", sales: 8500 },
  { name: "Sun", sales: 6800 }
];

export function Dashboard() {
  const { kpiData } = useKPI();
  const { formatCurrency } = useCurrency();
  const { 
    sales,
    recordSale, 
    addSaleDirectly,
    getTotalRevenueToday,
    getTotalCustomersToday,
    getTotalCOGS
  } = useSales();
  const { inventory } = useInventory();
  const { user, business, schemaError, staffMembers } = useAuth();
  const { usage } = useSubscription();
  const { branches, error: branchError } = useBranch();
  const { expenses } = useExpense();
  const { categories } = useCategory();
  const navigate = useNavigate();
  const [isDemoDataLoaded, setIsDemoDataLoaded] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════
  // RECENT TRANSACTIONS - Pagination & Search State
  // ═══════════════════════════════════════════════════════════════════
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionPage, setTransactionPage] = useState(1);
  const transactionsPerPage = 10;

  // ═══════════════════════════════════════════════════════════════════
  // RBAC: Determine filtering based on role
  // ═══════════════════════════════════════════════════════════════════
  const { businessId, staffId, branchId, displayName } = useMemo(() => {
    if (!user || !business) return { businessId: undefined, staffId: undefined, branchId: undefined, displayName: "" };
    
    let businessId = business.id;
    let staffId: string | undefined = undefined;
    let branchId: string | undefined = undefined;
    let displayName = "";

    // Cashiers and Staff see only their own sales
    if (user.role === "Cashier" || user.role === "Staff") {
      staffId = user.id;
      branchId = user.branchId || undefined;
      displayName = `${user.firstName} ${user.lastName}`;
    }
    // Managers see only their branch data
    else if (user.role === "Manager") {
      branchId = user.branchId || undefined;
      displayName = "Your Branch";
    }
    // Business Owner and Accountant see all business data
    
    return { businessId, staffId, branchId, displayName };
  }, [user, business]);

  // ═══════════════════════════════════════════════════════════════════
  // ROLE-BASED KPI CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════
  const roleBasedKPIs = useMemo(() => {
    const todayRevenue = getTotalRevenueToday(businessId, staffId, branchId);
    const todayCustomers = getTotalCustomersToday(businessId, staffId, branchId);
    
    // Get today's sales filtered by role
    const todayDate = new Date().toDateString();
    const todaySales = sales.filter(sale => {
      const saleDate = new Date(sale.timestamp).toDateString();
      if (saleDate !== todayDate) return false;
      
      // Apply business and staff filtering
      if (businessId && sale.businessId !== businessId) return false;
      if (staffId && sale.staffId !== staffId) return false;
      
      // ═══════════════════════════════════════════════════════════════════
      // MANAGER BRANCH FILTER - Frontend enforcement
      // ═══════════════════════════════════════════════════════════════════
      if (branchId && sale.branchId !== branchId) return false;
      
      return true;
    });

    // Calculate total products sold today
    const productsSoldToday = todaySales.reduce((total, sale) => {
      return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);

    // ════════════════════��═════════════════════════════════════════════
    // EXPENSE & PROFIT CALCULATIONS (Business Owner & Manager only)
    // ═══════════════════════════════════════════════════════════════════
    let todayExpenses = 0;
    let todayCOGS = 0;
    let todayGrossProfit = 0;
    let todayNetProfit = 0;
    
    if (businessId && !staffId) {
      // Calculate today's COGS (Cost of Goods Sold) from product purchase prices
      todayCOGS = todaySales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => {
          return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
        }, 0);
      }, 0);
      
      // Calculate Gross Profit (Revenue - COGS)
      todayGrossProfit = todayRevenue - todayCOGS;
      
      // Filter today's expenses based on role
      const todayExpenseRecords = expenses.filter(expense => {
        const expenseDate = new Date(expense.date).toDateString();
        if (expenseDate !== todayDate) return false;
        
        // Apply business filtering
        if (expense.businessId !== businessId) return false;
        
        // Manager sees only their branch expenses
        if (user?.role === "Manager" && user.branchId) {
          return expense.branchId === user.branchId;
        }
        
        return true;
      });
      
      todayExpenses = todayExpenseRecords.reduce((sum, expense) => sum + expense.amount, 0);
      todayNetProfit = todayGrossProfit - todayExpenses;
    }

    return {
      todayRevenue,
      todayCustomers,
      productsSoldToday,
      averageTransaction: todayCustomers > 0 ? todayRevenue / todayCustomers : 0,
      todayExpenses,
      todayCOGS,
      todayGrossProfit,
      todayNetProfit
    };
  }, [sales, expenses, businessId, staffId, getTotalRevenueToday, getTotalCustomersToday, user]);

  // ═══════════════════════════════════════════════════════════════════
  // TODAY'S SALES / CUSTOMERS / PRODUCTS - used by KPI detail dialog
  // ═══════════════════════════════════════════════════════════════════
  const todaySalesList = useMemo(() => {
    const todayDate = new Date().toDateString();
    return sales.filter(sale => {
      const saleDate = new Date(sale.timestamp).toDateString();
      if (saleDate !== todayDate) return false;
      if (businessId && sale.businessId !== businessId) return false;
      if (staffId && sale.staffId !== staffId) return false;
      if (branchId && sale.branchId !== branchId) return false;
      return true;
    });
  }, [sales, businessId, staffId, branchId]);

  const customersSummary = useMemo(() => {
    const map = new Map();
    todaySalesList.forEach(sale => {
      const name = sale.customerName || 'Walk-in';
      const key = name;
      const entry = map.get(key) || { name, count: 0, total: 0 };
      entry.count += 1;
      entry.total += (sale.total || 0);
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [todaySalesList]);

  const productsSummary = useMemo(() => {
    const map = new Map();
    todaySalesList.forEach(sale => {
      (sale.items || []).forEach(item => {
        const name = item.name || item.productName || `Product ${item.productId || item.id || ''}`;
        const key = name;
        const entry = map.get(key) || { name, qty: 0, amount: 0 };
        const qty = (item.quantity || 0);
        entry.qty += qty;
        // Prefer explicit totalPrice, then unitPrice * qty, then legacy fields
        const itemAmount = (item.totalPrice !== undefined && item.totalPrice !== null)
          ? item.totalPrice
          : (item.unitPrice !== undefined && item.unitPrice !== null)
            ? (item.unitPrice * qty)
            : (item.total || item.price)
              ? ((item.total || item.price) * qty)
              : 0;
        entry.amount += itemAmount;
        map.set(key, entry);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [todaySalesList]);

  // ═══════════════════════════════════════════════════════════════════
  // UNIVERSAL BASELINE & DATE LOGIC - Prevent fake growth percentages
  // Applies to ALL roles: Business Owner, Manager, Accountant, Staff, Cashier
  // ══════════════════════════════════════════════════════════════════
  const baselineMetrics = useMemo(() => {
    // Get sales filtered by current user's role and access level
    let filteredSales = sales.filter(sale => {
      if (businessId && sale.businessId !== businessId) return false;
      if (staffId && sale.staffId !== staffId) return false;
      if (branchId && sale.branchId !== branchId) return false;
      return true;
    });

    // No sales at all - first time user/business
    if (filteredSales.length === 0) {
      return {
        hasBaseline: false,
        isFirstSaleDay: true,
        firstSaleTimestamp: null,
        customersChange: null,
        revenueChange: null,
        avgTransactionChange: null,
        productsSoldChange: null,
        showTrend: false
      };
    }

    // Determine first sale timestamp for this scope
    const firstSaleTimestamp = Math.min(...filteredSales.map(s => new Date(s.timestamp).getTime()));
    const firstSaleDate = new Date(firstSaleTimestamp).toDateString();
    
    // Get today's date
    const todayDate = new Date().toDateString();
    
    // CASE 1: Today is the first sale day
    if (todayDate === firstSaleDate) {
      return {
        hasBaseline: false,
        isFirstSaleDay: true,
        firstSaleTimestamp,
        customersChange: "First sales day",
        revenueChange: "First sales day",
        avgTransactionChange: "First sales day",
        productsSoldChange: "First sales day",
        showTrend: false
      };
    }

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toDateString();
    
    // Filter yesterday's sales
    const yesterdaySales = filteredSales.filter(sale => {
      return new Date(sale.timestamp).toDateString() === yesterdayDate;
    });

    // Get today's sales
    const todaySales = filteredSales.filter(sale => {
      return new Date(sale.timestamp).toDateString() === todayDate;
    });

    // CASE 2: Yesterday is before first sale date - no valid comparison
    if (new Date(yesterdayDate).getTime() < firstSaleTimestamp) {
      return {
        hasBaseline: false,
        isFirstSaleDay: false,
        firstSaleTimestamp,
        customersChange: "No previous data",
        revenueChange: "No previous data",
        avgTransactionChange: "No previous data",
        productsSoldChange: "No previous data",
        showTrend: false
      };
    }

    // CASE 3: Valid comparison exists
    // Calculate yesterday's metrics
    const yesterdayCustomers = yesterdaySales.length;
    const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + sale.total, 0);
    const yesterdayProducts = yesterdaySales.reduce((total, sale) => {
      return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
    const yesterdayAvgTransaction = yesterdayCustomers > 0 ? yesterdayRevenue / yesterdayCustomers : 0;

    // Today's metrics
    const todayCustomers = todaySales.length;
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const todayProducts = todaySales.reduce((total, sale) => {
      return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
    const todayAvgTransaction = todayCustomers > 0 ? todayRevenue / todayCustomers : 0;

    // Calculate percentage changes
    const calculateChange = (today: number, yesterday: number): string => {
      if (yesterday === 0 && today === 0) return "No change";
      if (yesterday === 0 && today > 0) return "No previous data";
      
      const percentChange = ((today - yesterday) / yesterday) * 100;
      const sign = percentChange > 0 ? "+" : "";
      return `${sign}${percentChange.toFixed(1)}% from yesterday`;
    };

    return {
      hasBaseline: true,
      isFirstSaleDay: false,
      firstSaleTimestamp,
      customersChange: calculateChange(todayCustomers, yesterdayCustomers),
      revenueChange: calculateChange(todayRevenue, yesterdayRevenue),
      avgTransactionChange: calculateChange(todayAvgTransaction, yesterdayAvgTransaction),
      productsSoldChange: calculateChange(todayProducts, yesterdayProducts),
      showTrend: true
    };
  }, [sales, businessId, staffId, branchId]);

  // ════════════════════════════════════��══════════════════════════════
  // ROLE-BASED RECENT TRANSACTIONS
  // ══════════════════════════════════════════════════════════════════
  const recentTransactions = useMemo(() => {
    // Filter sales by role
    let filteredSales = sales.filter(sale => {
      if (businessId && sale.businessId !== businessId) return false;
      if (staffId && sale.staffId !== staffId) return false;
      // ═══════════════════════════════════════════════════════════════════
      // MANAGER BRANCH FILTER - Frontend enforcement
      // ═══════════════════════════════════════════════════════════════════
      if (branchId && sale.branchId !== branchId) return false;
      return true;
    });

    // Sort by timestamp (newest first) and take top 5
    return filteredSales
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
      .map(sale => {
        const timeAgo = getTimeAgo(new Date(sale.timestamp));
        // Use readable ID if available, otherwise fallback to short UUID
        const displayId = sale.readableId 
          ? `Order #${sale.readableId.toString().padStart(5, '0')}`
          : `Order #${sale.id.substring(0, 8).toUpperCase()}`;
          
        return {
          id: sale.id,
          displayId,
          // ═══════════════════════════════════════════════════════════════════
          // CUSTOMER NAME VISIBILITY - Display customer name if provided
          // ═══════════════════════════════════════════════════════════════════
          customer: sale.customerName || "Walk-in",
          amount: formatCurrency(sale.total),
          time: timeAgo,
          status: "completed",
          staffName: sale.staffName
        };
      });
  }, [sales, businessId, staffId, branchId]);

  // ═══════════════════════════════════════════════════════════════════
  // ALL TRANSACTIONS WITH SEARCH, FILTER & PAGINATION
  // ═══════════════════════════════════════════════════════════════════
  const allTransactions = useMemo(() => {
    // Filter sales by role
    let filteredSales = sales.filter(sale => {
      if (businessId && sale.businessId !== businessId) return false;
      if (staffId && sale.staffId !== staffId) return false;
      if (branchId && sale.branchId !== branchId) return false;
      return true;
    });

    // Sort by timestamp (newest first)
    return filteredSales
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(sale => {
        const timeAgo = getTimeAgo(new Date(sale.timestamp));
        const displayId = sale.readableId 
          ? `Order #${sale.readableId.toString().padStart(5, '0')}`
          : `Order #${sale.id.substring(0, 8).toUpperCase()}`;
          
        return {
          id: sale.id,
          displayId,
          customer: sale.customerName || "Walk-in",
          amount: formatCurrency(sale.total),
          rawAmount: sale.total,
          time: timeAgo,
          paymentMethod: sale.paymentMethod || "Cash",
          staffName: sale.staffName,
          timestamp: sale.timestamp
        };
      });
  }, [sales, businessId, staffId, branchId, formatCurrency]);

  // Filtered and paginated transactions
  const { filteredTransactions, paginatedTransactions, totalPages } = useMemo(() => {
    // Apply search filter
    let filtered = allTransactions;
    
    if (transactionSearch) {
      const searchLower = transactionSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.customer.toLowerCase().includes(searchLower) ||
        t.displayId.toLowerCase().includes(searchLower) ||
        t.staffName.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const total = Math.ceil(filtered.length / transactionsPerPage);
    const startIndex = (transactionPage - 1) * transactionsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + transactionsPerPage);

    return {
      filteredTransactions: filtered,
      paginatedTransactions: paginated,
      totalPages: total
    };
  }, [allTransactions, transactionSearch, transactionPage, transactionsPerPage]);

  // ═══════════════════════════════════════════════════════════════════
  // ROLE-BASED SALES CHART DATA
  // ═══════════════════════════════════════════════════════════════════
  // Prepare chart data - use single data source with absolutely minimal structure
  const weekSalesData = useMemo(() => {
    const safeDate = (value: unknown): Date | null => {
      const date = value instanceof Date ? new Date(value.getTime()) : new Date(value as any);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const toDayKey = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      // Use local calendar day key (not UTC ISO date) to avoid timezone day-shift bugs.
      const y = normalized.getFullYear();
      const m = String(normalized.getMonth() + 1).padStart(2, "0");
      const d = String(normalized.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const createEmptyBuckets = () => {
      const buckets: Array<{ dateObj: Date; revenue: number }> = [];
      const bucketIndexByKey = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const dateObj = new Date(today);
        dateObj.setDate(today.getDate() - i);
        const key = toDayKey(dateObj);
        bucketIndexByKey.set(key, buckets.length);
        buckets.push({ dateObj, revenue: 0 });
      }
      return { buckets, bucketIndexByKey };
    };

    const fillBuckets = (
      buckets: Array<{ dateObj: Date; revenue: number }>,
      bucketIndexByKey: Map<string, number>
    ) => {
      sales.forEach((sale) => {
        const saleDate = safeDate(sale.timestamp);
        if (!saleDate) return;

        const idx = bucketIndexByKey.get(toDayKey(saleDate));
        if (idx === undefined) return;

        buckets[idx].revenue += Number(sale.total) || 0;
      });
    };

    let { buckets, bucketIndexByKey } = createEmptyBuckets();
    fillBuckets(buckets, bucketIndexByKey);

    const hasAnyRecentSale = sales.some((sale) => {
      const d = safeDate(sale.timestamp);
      if (!d) return false;
      const diffMs = today.getTime() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays < 7;
    });

    const allZero = buckets.every((b) => b.revenue === 0);

    // Safety net: if we know there are recent sales but everything is zero
    // (e.g. due to unexpected timestamp formats), reset buckets and try again.
    if (hasAnyRecentSale && allZero) {
      const reset = createEmptyBuckets();
      buckets = reset.buckets;
      bucketIndexByKey = reset.bucketIndexByKey;
      fillBuckets(buckets, bucketIndexByKey);
    }

    return buckets.map((day, idx) => ({
      // Use simple index-based name to avoid any duplicate key issues
      name: `Day ${idx}`,
      // Display label for X-axis
      label: `${day.dateObj.toLocaleDateString('en-US', { weekday: 'short' })} ${day.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      // Revenue value for the day
      sales: day.revenue,
    }));
  }, [sales, businessId, staffId, branchId]);

  // ═══════════════════════════════════════════════════════════════════
  // 7-DAY SPARKLINE DATA — Per-metric daily values for KPI cards
  // ═══════════════════════════════════════════════════════════════════
  const sparklineData = useMemo(() => {
    const safeDate = (value: unknown): Date | null => {
      const date = value instanceof Date ? new Date(value.getTime()) : new Date(value as any);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const toDayKey = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      const y = normalized.getFullYear();
      const m = String(normalized.getMonth() + 1).padStart(2, "0");
      const d = String(normalized.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: Array<{ dateObj: Date; revenue: number; customers: number; products: number }> = [];
    const dayIndex = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toDayKey(d);
      dayIndex.set(key, days.length);
      days.push({ dateObj: d, revenue: 0, customers: 0, products: 0 });
    }

    const scopeSales = sales.filter(sale => {
      if (businessId && sale.businessId !== businessId) return false;
      if (staffId && sale.staffId !== staffId) return false;
      if (branchId && sale.branchId !== branchId) return false;
      return true;
    });

    scopeSales.forEach(sale => {
      const sd = safeDate(sale.timestamp);
      if (!sd) return;
      const idx = dayIndex.get(toDayKey(sd));
      if (idx === undefined) return;
      days[idx].revenue += Number(sale.total) || 0;
      days[idx].customers += 1;
      days[idx].products += (sale.items || []).reduce((s: number, item: any) => s + (item.quantity || 0), 0);
    });

    return days.map(d => ({
      label: d.dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: d.revenue,
      customers: d.customers,
      avgTransaction: d.customers > 0 ? d.revenue / d.customers : 0,
      products: d.products,
    }));
  }, [sales, businessId, staffId, branchId]);

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY AGGREGATION (for Categories chart)
  // ═══════════════════════════════════════════════════════════════════
  const categoriesData = useMemo(() => {
    // Aggregate revenue by category for the last 7 days (respecting role filters)
    const now = Date.now();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const map = new Map();

    sales.forEach((sale) => {
      // Role & scope filters
      if (businessId && sale.businessId !== businessId) return;
      if (staffId && sale.staffId !== staffId) return;
      if (branchId && sale.branchId !== branchId) return;

      const saleTime = new Date(sale.timestamp).getTime();
      if (saleTime < sevenDaysAgo.getTime()) return;

      (sale.items || []).forEach((item: any) => {
        // ═══════════════════════════════════════════════════════════════════
        // FIX: Map category IDs to names and handle fallbacks
        // ══════════════════════════════════════════════════════════════════
        let categoryId = item.category || item.categoryId;
        let categoryName = item.categoryName;

        // Fallback 1: If no category info in sale item, check current inventory
        if (!categoryId && !categoryName && inventory) {
          const product = inventory.find(p => p.id === item.productId);
          if (product) categoryId = product.category;
        }

        // Fallback 2: Map Category ID (UUID) to human-readable Name
        let displayName = categoryName;
        if (!displayName && categoryId && categories) {
          const catObj = categories.find(c => c.id === categoryId);
          if (catObj) displayName = catObj.name;
        }

        const categoryLabel = displayName || categoryId || 'Uncategorized';
        
        const revenue = (item.totalPrice !== undefined && item.totalPrice !== null)
          ? Number(item.totalPrice)
          : (item.unitPrice !== undefined && item.unitPrice !== null)
            ? Number(item.unitPrice) * Number(item.quantity || 0)
            : 0;

        map.set(categoryLabel, (map.get(categoryLabel) || 0) + revenue);
      });
    });

    const arr = Array.from(map.entries()).map(([category, revenue]) => ({ category, revenue }));
    arr.sort((a, b) => b.revenue - a.revenue);
    // Limit to top 8 categories for display
    return arr.slice(0, 8);
  }, [sales, businessId, staffId, branchId, categories, inventory]);

  // Helper function to calculate time ago
  function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  const kpiCards = [
    {
      title: user?.role === "Cashier" || user?.role === "Staff" 
        ? "Your Customers Today" 
        : "Today's Customers",
      value: roleBasedKPIs.todayCustomers.toString(),
      change: baselineMetrics?.customersChange ?? null,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      sparklineKey: "customers" as const,
    },
    {
      title: user?.role === "Cashier" || user?.role === "Staff" 
        ? "Your Total Sales" 
        : "Today's Total Sales",
      value: formatCurrency(roleBasedKPIs.todayRevenue),
      change: baselineMetrics?.revenueChange ?? null,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      sparklineKey: "revenue" as const,
    },
    {
      title: "Average Transaction",
      value: formatCurrency(roleBasedKPIs.averageTransaction),
      change: baselineMetrics?.avgTransactionChange ?? null,
      icon: TrendingUp,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      sparklineKey: "avgTransaction" as const,
    },
    {
      title: user?.role === "Cashier" || user?.role === "Staff" 
        ? "Products You Sold" 
        : "Products Sold",
      value: roleBasedKPIs.productsSoldToday.toString(),
      change: baselineMetrics?.productsSoldChange ?? null,
      icon: ShoppingCart,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      sparklineKey: "products" as const,
    }
  ];

  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const [isKpiDialogOpen, setIsKpiDialogOpen] = useState(false);

  const kpiDetails: Record<string, { description: string; insights: string; nextSteps: string }> = {
    "Today's Customers": {
      description: 'Total unique customers served today.',
      insights: "This metric reflects today's footfall and purchase activity.",
      nextSteps: 'Consider offering targeted promotions to retain frequent customers.'
    },
    "Your Customers Today": {
      description: 'Total customers you served today (staff/cashier view).',
      insights: 'Track personal performance and comparing volumes helps with shift planning.',
      nextSteps: 'Use this insight to balance staff allocation for peak periods.'
    },
    "Today's Total Sales": {
      description: 'Total sales amount today across all transactions.',
      insights: 'Revenue trends give a quick signal of business momentum.',
      nextSteps: 'Evaluate item-level performance and adjust pricing or placement accordingly.'
    },
    "Your Total Sales": {
      description: 'Total sales amount you processed today (staff/cashier view).',
      insights: 'Helps gauge individual contribution to daily revenue.',
      nextSteps: 'Use this data to incentivize high-performing staff.'
    },
    "Average Transaction": {
      description: 'Average ticket value for today.',
      insights: 'Higher values may indicate successful upselling or product mix improvements.',
      nextSteps: 'Focus on cross-sell bundles and add-on offers to boost this value.'
    },
    "Products Sold": {
      description: 'Total quantity of products sold today.',
      insights: 'Volume-focused metric to measure sales throughput and inventory velocity.',
      nextSteps: 'Ensure high inventory availability for fast-moving products.'
    },
    "Products You Sold": {
      description: 'Quantity of products you sold today (staff/cashier view).',
      insights: 'Useful for performance reviews and commission tracking.',
      nextSteps: 'Review your sales interactions to identify coaching points.'
    },
    "Today's Expenses": {
      description: 'Total expenses recorded today.',
      insights: 'Understand the outgoing costs that impact daily profitability.',
      nextSteps: 'Monitor expense categories and cut non-essential spending where possible.'
    },
    "Net Profit Today": {
      description: 'Revenue minus COGS and expenses for today.',
      insights: 'A key health metric for daily financial performance.',
      nextSteps: 'If profit is low, examine pricing, inventory cost, and expense leaks.'
    }
  };

  // Calculate trial days remaining
  const getTrialDaysRemaining = () => {
    if (!business || business.subscriptionStatus !== "trial") return 0;
    const now = new Date();
    const trialEnd = new Date(business.trialEndsAt);
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const trialDays = getTrialDaysRemaining();

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Schema Error Display */}
      {(branchError || schemaError) && <SchemaError error={branchError || schemaError} />}

      {/* Preview Mode Banner */}
      {isPreviewMode() && (
        <Alert className="border-[#00719C] bg-[#00719C]/10">
          <Info className="h-5 w-5 text-[#00719C]" />
          <AlertDescription className="text-sm">
            <span className="font-semibold">Preview Mode Active</span> - You're viewing this app with demo data in Figma Make. 
            All features are functional with mock data. Deploy to Vercel or run locally for full Supabase integration.
          </AlertDescription>
        </Alert>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-3xl mb-1">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Business Owner: Subscription Status Banner - Compact Version */}
      {user?.role === "Business Owner" && business && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm border-primary/20 bg-primary/5">
          <div className="px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            
            {/* Left: Plan & Status */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Plan:</span>
                <Badge variant={business.subscriptionPlan === "Enterprise" ? "default" : "secondary"} className="h-5 px-2 text-xs gap-1">
                  <Crown className="w-3 h-3" />
                  {business.subscriptionPlan}
                </Badge>
              </div>

              {business.subscriptionStatus === "trial" && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/60 border border-border/50 text-xs">
                  {trialDays <= 7 ? (
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                  ) : (
                    <Info className="w-3 h-3 text-blue-600" />
                  )}
                  <span className={trialDays <= 7 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                    {trialDays} days left
                  </span>
                </div>
              )}
            </div>

            {/* Right: Usage & Action */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-end">
              <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                <span title="Active Branches / Total Branches">
                  <span className="font-medium text-foreground">
                    {branches?.filter(b => b.status === "active").length || 0}
                  </span>/{branches?.length || 0} Branches
                </span>
                <span className="w-px h-3 bg-border" />
                <span title="Active Staff / Total Staff">
                  <span className="font-medium text-foreground">{staffMembers?.length || 0}</span>/{usage.staff} Staff
                </span>
              </div>

              <Button 
                onClick={() => navigate("/app/subscription")}
                variant="outline"
                size="sm"
                className="h-7 text-xs px-3 gap-1.5 bg-background hover:bg-background/90"
              >
                Manage
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Role-Based Info Banner for Managers */}
      {user?.role === "Manager" && user.branchId && (
        <Alert className="border-purple-200 bg-purple-50">
          <Building2 className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-purple-800">
            You're viewing <strong>{branches.find(b => b.id === user.branchId)?.name || "your branch"} data</strong>. All metrics shown reflect only this branch's sales, inventory, and expenses.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className={`grid gap-3 ${
        user && !staffId && (user.role === "Business Owner" || user.role === "Manager" || user.role === "Accountant")
          ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6" 
          : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
      }`}>
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          
          const showNeutralStyle = baselineMetrics && !baselineMetrics.hasBaseline;
          const displayColor = showNeutralStyle ? "text-gray-600" : kpi.color;
          
          // ═══════════════════════════════════════════════════════════════
          // TREND CALCULATION — ((current - previous) / previous) * 100
          // Uses sparkline data: last element = today, second-to-last = yesterday
          // ═══════════════════════════════════════════════════════════════
          const sparkSeries = sparklineData.map(d => d[kpi.sparklineKey]);
          const currentVal = sparkSeries[sparkSeries.length - 1] ?? 0;
          const previousVal = sparkSeries[sparkSeries.length - 2] ?? 0;
          
          let trendPct: number = 0;
          let trendDirection: "up" | "down" | "flat" = "flat";
          
          if (previousVal > 0) {
            trendPct = Math.round(((currentVal - previousVal) / previousVal) * 100);
            if (trendPct > 0) trendDirection = "up";
            else if (trendPct < 0) trendDirection = "down";
          } else if (previousVal === 0 && currentVal > 0) {
            trendPct = 100;
            trendDirection = "up";
          } else if (previousVal === 0 && currentVal === 0) {
            trendPct = 0;
            trendDirection = "flat";
          }
          
          const absTrend = Math.abs(trendPct);
          
          // Sparkline stroke color matches trend direction
          const sparkStroke = trendDirection === "up"
            ? "#10b981"
            : trendDirection === "down"
              ? "#f43f5e"
              : "#94a3b8"; // slate-400 for flat
          
          // Trend pill styles
          const trendPillClass = trendDirection === "up"
            ? "bg-emerald-50 text-emerald-700"
            : trendDirection === "down"
              ? "bg-rose-50 text-rose-700"
              : "bg-slate-100 text-slate-500";
          
          const trendArrow = trendDirection === "up" ? "↑" : trendDirection === "down" ? "↓" : "—";
          
          return (
            <button
              key={kpi.title}
              type="button"
              className="text-left h-full"
              onClick={() => {
                setSelectedKpi(kpi.title);
                setIsKpiDialogOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedKpi(kpi.title);
                  setIsKpiDialogOpen(true);
                }
              }}
            >
              <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-3 h-full flex flex-col justify-center">
                  {/* Header row: title left, icon right */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-500 truncate">{kpi.title}</span>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                      showNeutralStyle ? "bg-gray-100" : kpi.bgColor
                    }`}>
                      <Icon className={`w-2.5 h-2.5 ${displayColor}`} />
                    </div>
                  </div>
                  
                  {/* Main row: metric value + trend pill */}
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-lg font-bold text-slate-900 leading-none truncate">{kpi.value}</span>
                    {!showNeutralStyle && (
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[8px] font-semibold flex-shrink-0 ${trendPillClass}`}>
                        {trendArrow} {absTrend}%
                      </span>
                    )}
                  </div>
                  
                  {/* Micro-copy: comparison period */}
                  <p className="text-[9px] text-slate-400">
                    {showNeutralStyle
                      ? "No previous data"
                      : trendDirection === "flat" && previousVal === 0 && currentVal === 0
                        ? "No sales yet today"
                        : "vs yesterday"
                    }
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}

        {/* Expense & Profit KPI Cards - Business Owner & Manager Only */}
        {user && !staffId && (user.role === "Business Owner" || user.role === "Manager" || user.role === "Accountant") && (
          <>
            <button
              type="button"
              className="text-left h-full"
              onClick={() => {
                setSelectedKpi("Today's Expenses");
                setIsKpiDialogOpen(true);
              }}
            >
              <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-3 h-full flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-500 truncate">Today's Expenses</span>
                    <div className="w-5 h-5 rounded-md bg-rose-50 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-2.5 h-2.5 text-rose-600" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-lg font-bold text-slate-900 leading-none truncate">{formatCurrency(roleBasedKPIs.todayExpenses)}</span>
                  </div>
                  <p className="text-[9px] text-slate-400">vs yesterday</p>
                </CardContent>
              </Card>
            </button>

            <button
              type="button"
              className="text-left h-full"
              onClick={() => {
                setSelectedKpi("Net Profit Today");
                setIsKpiDialogOpen(true);
              }}
            >
              <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-3 h-full flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-500 truncate">Net Profit Today</span>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${roleBasedKPIs.todayNetProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      {roleBasedKPIs.todayNetProfit >= 0 ? (
                        <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5 text-rose-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-lg font-bold leading-none truncate ${roleBasedKPIs.todayNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrency(roleBasedKPIs.todayNetProfit)}
                    </span>
                    {roleBasedKPIs.todayNetProfit >= 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[8px] font-semibold bg-emerald-50 text-emerald-700 flex-shrink-0">
                        ↑ Profitable
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400">Revenue - COGS - Expenses</p>
                </CardContent>
              </Card>
            </button>
          </>
        )}
      </div>

      <Dialog open={isKpiDialogOpen} onOpenChange={(open) => {
        setIsKpiDialogOpen(open);
        if (!open) setSelectedKpi(null);
      }}>
        <DialogContent className="sm:max-w-lg bg-white text-slate-900 border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{selectedKpi || 'Metric Details'}</DialogTitle>
            <DialogDescription className="text-slate-500">
              Deep-dive insights for the selected KPI card.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-slate-700">
              {selectedKpi ? kpiDetails[selectedKpi]?.description : 'Click a card to see details.'}
            </p>
            <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key Insight</h4>
              <p className="text-sm text-slate-700 mt-1">{selectedKpi ? kpiDetails[selectedKpi]?.insights : '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested Next Steps</h4>
              <p className="text-sm text-slate-700 mt-1">{selectedKpi ? kpiDetails[selectedKpi]?.nextSteps : '-'}</p>
            </div>

            {/* Additional detailed lists for certain KPIs */}
            {selectedKpi && (selectedKpi === "Today's Customers" || selectedKpi === 'Your Customers Today') && (
              <div className="bg-white rounded-md p-3 border border-slate-200">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customers (Today)</h4>
                {customersSummary.length === 0 ? (
                  <p className="text-sm text-slate-600 mt-2">No customers recorded today.</p>
                ) : (
                  <div className="mt-2 max-h-[168px] overflow-auto">
                    {customersSummary.map((c: any, idx: number) => (
                      <div key={c.name + idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Visits: {c.count}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(c.total || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedKpi && (selectedKpi === "Products Sold" || selectedKpi === 'Products You Sold') && (
              <div className="bg-white rounded-md p-3 border border-slate-200">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Products Sold (Today)</h4>
                {productsSummary.length === 0 ? (
                  <p className="text-sm text-slate-600 mt-2">No products sold today.</p>
                ) : (
                  <div className="mt-2 max-h-[168px] overflow-auto">
                    {productsSummary.map((p: any, idx: number) => (
                      <div key={p.name + idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Qty: {p.qty}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(p.amount || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedKpi && (selectedKpi === "Today's Total Sales" || selectedKpi === 'Your Total Sales') && (
              <div className="bg-white rounded-md p-3 border border-slate-200">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transactions (Today)</h4>
                {todaySalesList.length === 0 ? (
                  <p className="text-sm text-slate-600 mt-2">No transactions recorded today.</p>
                ) : (
                  <div className="mt-2 max-h-[168px] overflow-auto">
                    {todaySalesList.map((sale: any) => {
                      const timeAgo = getTimeAgo(new Date(sale.timestamp));
                      const displayId = sale.readableId ? `Order #${sale.readableId.toString().padStart(5, '0')}` : `Order #${sale.id.substring(0, 8).toUpperCase()}`;
                      return (
                        <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium text-sm">{sale.customerName || 'Walk-in'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{displayId} • {timeAgo}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(sale.total || 0)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button className="w-full" onClick={() => setSelectedKpi(null)}>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Sales</CardTitle>
            <CardDescription>Sales performance over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent style={{ minHeight: '350px' }}>
            <div className="h-[300px] min-h-[300px] w-full" style={{ minHeight: '300px', height: '300px', minWidth: '100%', width: '100%' }}>
              <ResponsiveContainer width="100%" height={300} minHeight={300} key="sales-chart-container">
                <LineChart 
                  data={weekSalesData} 
                  margin={{ bottom: 20 }}
                  id="weekly-sales-chart"
                  key="weekly-sales-line-chart"
                >
                  <CartesianGrid 
                    key="grid" 
                    strokeDasharray="3 3" 
                    className="stroke-muted" 
                  />
                  <XAxis 
                    key="x-axis"
                    dataKey="label"
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    key="y-axis"
                    className="text-xs" 
                  />
                  <Tooltip 
                    key="tooltip"
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Line 
                    key="sales-line"
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: "#1d4ed8", stroke: "#ffffff", strokeWidth: 1 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Categories Chart (placed to the right of Weekly Sales on lg screens) */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Top categories by revenue (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent style={{ minHeight: '350px' }}>
            <div className="h-[300px] min-h-[300px] w-full flex items-center justify-center" style={{ minHeight: '300px', height: '300px', minWidth: '100%', width: '100%' }}>
              {categoriesData.length === 0 ? (
                <div className="text-sm text-muted-foreground">No category data available for the selected period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300} minHeight={300} key="categories-chart-container">
                  <BarChart data={categoriesData} margin={{ left: 10, right: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                    {/* Use light pastel colors so bars don't look overly dark/black in the UI */}
                    <Bar dataKey="revenue" isAnimationActive={false}>
                      {categoriesData.map((_, index) => (
                        <Cell
                          key={`category-bar-${index}`}
                          fill={[
                            "#93c5fd", // light blue
                            "#a7f3d0", // light green
                            "#fbcfe8", // light pink
                            "#fde68a", // light yellow
                            "#c4b5fd", // light purple
                            "#99f6e4", // light teal
                            "#fecaca", // light red
                            "#fdba74", // light orange
                          ][index % 8]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest customer transactions</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={transactionSearch}
                  onChange={(e) => {
                    setTransactionSearch(e.target.value);
                    setTransactionPage(1);
                  }}
                  className="pl-8 w-full sm:w-[250px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Customer</TableHead>
                      <TableHead className="w-[140px]">Order #</TableHead>
                      <TableHead className="w-[120px]">Time</TableHead>
                      <TableHead className="w-[150px]">Sold By</TableHead>
                      <TableHead className="w-[100px] text-right">Amount</TableHead>
                      <TableHead className="w-[120px]">Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium truncate max-w-[180px]">{transaction.customer}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{transaction.displayId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{transaction.time}</TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]">{transaction.staffName}</TableCell>
                        <TableCell className="font-semibold text-right">{transaction.amount}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            transaction.paymentMethod === 'MPesa' || transaction.paymentMethod === 'M-Pesa' || transaction.paymentMethod === 'Mpesa'
                              ? 'bg-emerald-100 text-emerald-700'
                              : transaction.paymentMethod === 'Credit'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                          }`}>
                            {transaction.paymentMethod}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((transactionPage - 1) * transactionsPerPage) + 1} to {Math.min(transactionPage * transactionsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                      disabled={transactionPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {transactionPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransactionPage(p => Math.min(totalPages, p + 1))}
                      disabled={transactionPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>


    </div>
  );
}