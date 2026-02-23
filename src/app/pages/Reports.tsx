import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
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
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Package, AlertTriangle, Info, Search, ArrowUpDown, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useSales } from "../contexts/SalesContext";
import { useInventory } from "../contexts/InventoryContext";
import { useAuth } from "../contexts/AuthContext";
import { useCategory } from "../contexts/CategoryContext";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { formatCurrency } from "../utils/currency";
import { ScrollArea } from "../components/ui/scroll-area";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export function Reports() {
  const { 
    sales, 
    getTotalRevenue, 
    getTotalRevenueToday, 
    getTotalCustomersToday,
    getDailySales,
    getBestSellingProducts,
    getSalesByProduct,
    getTotalCOGS,
    getTotalGrossProfit,
    getGrossProfitMargin
  } = useSales();
  
  const { inventory } = useInventory();
  const { user, business } = useAuth();
  const { categories } = useCategory(); // Get categories to force re-render when they load
  const currencyCode = business?.currency || "KES";

  // ═══════════════════════════════════════════════════════════════════
  // STATE - Time Filter, Transaction Search & Sort
  // ═══════════════════════════════════════════════════════════════════
  const [timeFilter, setTimeFilter] = useState<string>("all-time");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionSort, setTransactionSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  // ══════════════════════════════════════════════════════════════════
  // RBAC: Determine filtering based on role
  // ═══════════════════════════════════════════════════════════════════
  const { businessId, staffId, branchId } = useMemo(() => {
    if (!user || !business) return { businessId: undefined, staffId: undefined, branchId: undefined };
    
    let businessId = business.id;
    let staffId: string | undefined = undefined;
    let branchId: string | undefined = undefined;

    // Staff and Cashiers see only their own sales
    if (user.role === "Cashier" || user.role === "Staff") {
      staffId = user.id;
      branchId = user.branchId || undefined;
    }
    // Managers see only their branch sales
    else if (user.role === "Manager") {
      branchId = user.branchId || undefined;
    }
    // Business Owner and Accountant see all business sales
    
    return { businessId, staffId, branchId };
  }, [user, business]);

  // ═══════════════════════════════════════════════════════════════════
  // TIME FILTER HELPER - Filter sales by time period
  // ═══════════════════════════════════════════════════════════════════
  const filterSalesByTime = (salesList: typeof sales) => {
    const now = new Date();
    
    return salesList.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      
      switch (timeFilter) {
        case "today":
          return saleDate.toDateString() === now.toDateString();
        
        case "this-week":
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
          weekStart.setHours(0, 0, 0, 0);
          return saleDate >= weekStart;
        
        case "this-month":
          return (
            saleDate.getMonth() === now.getMonth() &&
            saleDate.getFullYear() === now.getFullYear()
          );
        
        case "all-time":
        default:
          return true;
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // EXPORT TRANSACTIONS TO EXCEL
  // ═══════════════════════════════════════════════════════════════════
  const exportTransactions = () => {
    const dataToExport = analytics.filteredSales.map(sale => ({
      "Order ID": sale.readableId ? `#${sale.readableId.toString().padStart(5, '0')}` : sale.id.substring(0, 8),
      "Date": new Date(sale.timestamp).toLocaleDateString(),
      "Time": new Date(sale.timestamp).toLocaleTimeString(),
      "Customer Name": sale.customerName || "Walk-in",
      "Sold By": sale.staffName,
      "Staff Role": sale.staffRole,
      "Products": sale.items.map(item => `${item.productName} (x${item.quantity})`).join(", "),
      "Total": sale.total,
      "Payment Method": sale.paymentMethod || "Cash",
      "Status": "Completed"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    // Generate filename with date
    const fileName = `Transactions_${timeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast.success(`Exported ${dataToExport.length} transactions to ${fileName}`);
  };

  // ═══════════════════════════════════════════════════════════════════
  // REAL-TIME ANALYTICS - Computed from Actual Data (with RBAC filtering)
  // ═══════════════════════════════════════════════════════════════════
  const analytics = useMemo(() => {
    // Filter sales based on business, staff, and branch
    let filteredSales = sales.filter(sale => {
      if (businessId && sale.businessId !== businessId) return false;
      if (staffId && sale.staffId !== staffId) return false;
      if (branchId && sale.branchId !== branchId) return false;
      return true;
    });

    // Apply time filter
    filteredSales = filterSalesByTime(filteredSales);

    // Calculate metrics from filtered sales
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCOGS = filteredSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        return itemSum + ((item.costPrice || 0) * item.quantity);
      }, 0);
    }, 0);
    const totalGrossProfit = totalRevenue - totalCOGS;
    const grossProfitMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    
    const today = new Date().toDateString();
    const todayRevenue = filteredSales
      .filter(sale => new Date(sale.timestamp).toDateString() === today)
      .reduce((sum, sale) => sum + sale.total, 0);
    
    const todayCustomers = filteredSales
      .filter(sale => new Date(sale.timestamp).toDateString() === today)
      .length;

    // Calculate total orders and today's orders
    const totalOrders = filteredSales.length;
    const todayOrders = filteredSales.filter(sale => 
      new Date(sale.timestamp).toDateString() === today
    ).length;

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate revenue trend (today vs yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const yesterdayRevenue = filteredSales
      .filter(sale => new Date(sale.timestamp).toDateString() === yesterdayStr)
      .reduce((sum, sale) => sum + sale.total, 0);
    const revenueTrend = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0;

    // Get daily sales data (calculate from filtered sales)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    const dailySalesData = last7Days.map(date => {
      const dateStr = date.toDateString();
      const daySales = filteredSales.filter(
        sale => new Date(sale.timestamp).toDateString() === dateStr
      );
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: daySales.reduce((sum, sale) => sum + sale.total, 0),
        sales: daySales.length,
        customers: daySales.length
      };
    });

    // Get sales by product for best sellers and category analysis
    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productSalesMap.get(item.productId) || { 
          name: item.productName, 
          quantity: 0, 
          revenue: 0 
        };
        productSalesMap.set(item.productId, {
          name: item.productName,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.subtotal
        });
      });
    });

    const bestSellers = Array.from(productSalesMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Category data aggregation
    const categoryMap = new Map<string, { sales: number; count: number; name: string }>();
    productSalesMap.forEach((productData, productId) => {
      const item = inventory.find(i => i.id === productId);
      if (item) {
        const categoryName = item.categoryName || 'Uncategorized';
        const existing = categoryMap.get(categoryName) || { sales: 0, count: 0, name: categoryName };
        categoryMap.set(categoryName, {
          sales: existing.sales + productData.revenue,
          count: existing.count + productData.quantity,
          name: categoryName
        });
      }
    });
    const categoryData = Array.from(categoryMap.values()).map(cat => ({
      name: cat.name,
      value: cat.count,
      sales: cat.sales
    }));

    // Low stock and out of stock items
    const lowStockItems = inventory.filter(item => 
      item.stock > 0 && item.stock < (item.lowStockThreshold || 10)
    );
    const outOfStockItems = inventory.filter(item => item.stock === 0);

    // Inventory with sold quantities
    const inventoryWithSold = inventory.map(item => {
      const productSales = productSalesMap.get(item.id);
      return {
        ...item,
        soldQuantity: productSales?.quantity || 0,
        soldRevenue: productSales?.revenue || 0
      };
    });

    return {
      totalRevenue,
      todayRevenue,
      todayCustomers,
      totalCOGS,
      totalGrossProfit,
      grossProfitMargin,
      totalOrders,
      todayOrders,
      avgOrderValue,
      revenueTrend,
      dailySalesData,
      bestSellers,
      categoryData,
      filteredSales,
      lowStockItems,
      outOfStockItems,
      inventoryWithSold
    };
  }, [sales, inventory, categories, businessId, staffId, branchId, timeFilter]);

  // ═══════════════════════════════════════════════════════════════════
  // EMPTY STATE - Show when no sales data exists
  // ══════════════════════════════════════════════════════════════════
  if (sales.filter(s => {
    if (businessId && s.businessId !== businessId) return false;
    if (staffId && s.staffId !== staffId) return false;
    return true;
  }).length === 0) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-3xl mb-1">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            {staffId ? "Track your sales performance" : "Track your business performance"}
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Sales Data</AlertTitle>
          <AlertDescription>
            Complete some sales transactions in the POS Terminal to see analytics and reports here.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-1">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            {staffId ? "Track your sales performance" : "Track your business performance"}
          </p>
        </div>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Role-Based Info Banner for Cashiers */}
      {(user?.role === "Cashier" || user?.role === "Staff") && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            You're viewing <strong>your personal sales reports</strong>. All analytics and data shown reflect only the transactions you've completed.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary KPIs - All in one row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="font-semibold text-[24px]">{formatCurrency(analytics.totalRevenue, currencyCode)}</p>
                {analytics.revenueTrend !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${analytics.revenueTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.revenueTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-[13px] text-[12px]">{Math.abs(analytics.revenueTrend).toFixed(1)}% vs yesterday</span>
                  </div>
                )}
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
                <p className="text-sm text-muted-foreground">Cost of Goods Sold</p>
                <p className="font-semibold text-[24px]">{formatCurrency(analytics.totalCOGS, currencyCode)}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="text-[13px] text-[12px]">Purchase costs</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className="font-semibold text-[24px]">{formatCurrency(analytics.totalGrossProfit, currencyCode)}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <span className="font-medium text-[12px]">{analytics.grossProfitMargin.toFixed(1)}% margin</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="font-semibold text-[24px]">{analytics.totalOrders}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="text-[13px] text-[12px]">{analytics.todayOrders} today</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="font-semibold text-[24px]">{analytics.todayCustomers}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="text-[13px] text-[12px]">Served today</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="font-semibold text-[24px]">{formatCurrency(analytics.avgOrderValue, currencyCode)}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>Per transaction</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue</CardTitle>
                <CardDescription>Sales revenue by date</CardDescription>
              </CardHeader>
              <CardContent style={{ minHeight: '350px' }}>
                <div className="h-[300px] w-full min-h-[300px]" style={{ minHeight: '300px', height: '300px', minWidth: '100%', width: '100%' }}>
                  <ResponsiveContainer width="100%" height={300} minHeight={300}>
                    <BarChart data={analytics.dailySalesData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar 
                        dataKey="revenue" 
                        fill="hsl(var(--primary))" 
                        radius={[8, 8, 0, 0]}
                        name={`Revenue (${currencyCode})`}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Transactions (Last 7 Days)</CardTitle>
                <CardDescription>Number of sales per day</CardDescription>
              </CardHeader>
              <CardContent style={{ minHeight: '350px' }}>
                <div className="h-[300px] w-full min-h-[300px]" style={{ minHeight: '300px', height: '300px', minWidth: '100%', width: '100%' }}>
                  <ResponsiveContainer width="100%" height={300} minHeight={300}>
                    <BarChart data={analytics.dailySalesData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="sales" fill="#00C49F" radius={[8, 8, 0, 0]} name="Transactions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue & Customers (Last 7 Days)</CardTitle>
              <CardDescription>Combined daily metrics</CardDescription>
            </CardHeader>
            <CardContent style={{ minHeight: '400px' }}>
              <div className="h-[350px] w-full min-h-[350px]" style={{ minHeight: '350px', height: '350px', minWidth: '100%', width: '100%' }}>
                <ResponsiveContainer width="100%" height={350} minHeight={350}>
                  <BarChart data={analytics.dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#0088FE" name={`Revenue (${currencyCode})`} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="customers" fill="#FF8042" name="Customers" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Transaction Details</CardTitle>
                  <CardDescription>View detailed transaction records with customer information</CardDescription>
                </div>
                <Button onClick={exportTransactions} size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              
              {/* Search and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by order ID, customer name, or staff..." 
                    value={transactionSearch}
                    onChange={(e) => setTransactionSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={transactionSort} onValueChange={(val) => setTransactionSort(val as typeof transactionSort)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Latest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="amount-desc">Highest Amount</SelectItem>
                    <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Sold By</TableHead>
                      <TableHead>Products Purchased</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.filteredSales
                      .filter(sale => {
                        if (!transactionSearch) return true;
                        const searchLower = transactionSearch.toLowerCase();
                        const orderId = sale.readableId 
                          ? `#${sale.readableId.toString().padStart(5, '0')}` 
                          : sale.id.substring(0, 8);
                        const customerName = (sale.customerName || 'walk-in').toLowerCase();
                        const staffName = (sale.staffName || '').toLowerCase();
                        
                        return (
                          orderId.toLowerCase().includes(searchLower) ||
                          customerName.includes(searchLower) ||
                          staffName.includes(searchLower)
                        );
                      })
                      .sort((a, b) => {
                        switch (transactionSort) {
                          case "date-asc":
                            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                          case "amount-desc":
                            return b.total - a.total;
                          case "amount-asc":
                            return a.total - b.total;
                          case "date-desc":
                          default:
                            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                        }
                      })
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
                          {sale.customerName || <span className="text-muted-foreground">Walk-in</span>}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>{sale.staffName}</div>
                          <div className="text-xs text-muted-foreground">{sale.staffRole}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          <div className="space-y-1">
                            {sale.items.map((item, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="font-medium">{item.productName}</span>
                                <span className="text-muted-foreground"> × {item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(sale.total, currencyCode)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                            Completed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {analytics.filteredSales.filter(sale => {
                  if (!transactionSearch) return true;
                  const searchLower = transactionSearch.toLowerCase();
                  const orderId = sale.readableId 
                    ? `#${sale.readableId.toString().padStart(5, '0')}` 
                    : sale.id.substring(0, 8);
                  const customerName = (sale.customerName || 'walk-in').toLowerCase();
                  const staffName = (sale.staffName || '').toLowerCase();
                  
                  return (
                    orderId.toLowerCase().includes(searchLower) ||
                    customerName.includes(searchLower) ||
                    staffName.includes(searchLower)
                  );
                }).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No transactions found</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          {analytics.categoryData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                  <CardDescription>Product category distribution</CardDescription>
                </CardHeader>
                <CardContent style={{ minHeight: '350px' }}>
                  <div className="h-[300px] w-full min-h-[300px]" style={{ minHeight: '300px', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                      <PieChart>
                        <Pie
                          data={analytics.categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analytics.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Revenue</CardTitle>
                  <CardDescription>Revenue breakdown by category</CardDescription>
                </CardHeader>
                <CardContent style={{ minHeight: '350px' }}>
                  <div className="h-[300px] w-full min-h-[300px]" style={{ minHeight: '300px', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                      <BarChart data={analytics.categoryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="name" type="category" className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="sales" fill="#FFBB28" radius={[0, 8, 8, 0]} name={`Revenue (${currencyCode})`} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Category Data</AlertTitle>
              <AlertDescription>
                Complete sales transactions to see category performance.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Best performing products by quantity sold</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.bestSellers.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.bestSellers.map((product, index) => (
                        <TableRow key={product.productId}>
                          <TableCell className="font-semibold">#{index + 1}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.quantity} units</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(product.revenue, currencyCode)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No sales data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Low Stock Alert */}
          {analytics.lowStockItems.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Low Stock Alert</AlertTitle>
              <AlertDescription>
                {analytics.lowStockItems.length} product(s) are running low on stock. 
                {analytics.outOfStockItems.length > 0 && ` ${analytics.outOfStockItems.length} product(s) are out of stock.`}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>Current stock levels and sales performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Current Stock</TableHead>
                      <TableHead className="text-center">Sold</TableHead>
                      <TableHead className="text-right">Sold Revenue</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.inventoryWithSold.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.categoryName}</TableCell>
                        <TableCell className="text-center font-semibold">{item.stock}</TableCell>
                        <TableCell className="text-center">{item.soldQuantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.soldRevenue)}</TableCell>
                        <TableCell>
                          {item.stock === 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : item.stock < 10 ? (
                            <Badge variant="destructive">Low Stock</Badge>
                          ) : (
                            <Badge variant="secondary">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}