import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
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
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Package, AlertTriangle, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useSales } from "../contexts/SalesContext";
import { useInventory } from "../contexts/InventoryContext";
import { useAuth } from "../contexts/AuthContext";
import { useCategory } from "../contexts/CategoryContext";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { formatCurrency } from "../utils/currency";

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
  // RBAC: Determine filtering based on role
  // ═══════════════════════════════════════════════════════════════════
  const { businessId, staffId } = useMemo(() => {
    if (!user || !business) return { businessId: undefined, staffId: undefined };
    
    let businessId = business.id;
    let staffId: string | undefined = undefined;

    // Staff and Cashiers see only their own sales
    if (user.role === "Cashier" || user.role === "Staff") {
      staffId = user.id;
    }
    // Business Owner, Manager, and Accountant see all business sales
    
    return { businessId, staffId };
  }, [user, business]);

  // ═══════════════════════════════════════════════════════════════════
  // REAL-TIME ANALYTICS - Computed from Actual Data (with RBAC filtering)
  // ═════════════════════════════════════════���═════════════════════════
  const analytics = useMemo(() => {
    // KPIs
    const totalRevenue = getTotalRevenue(businessId, staffId);
    const todayRevenue = getTotalRevenueToday(businessId, staffId);
    const todayCustomers = getTotalCustomersToday(businessId, staffId);
    
    // Profit Metrics
    const totalCOGS = getTotalCOGS(businessId, staffId);
    const totalGrossProfit = getTotalGrossProfit(businessId, staffId);
    const grossProfitMargin = getGrossProfitMargin(businessId, staffId);
    
    // Filter sales based on business and staff
    const filteredSales = sales.filter(sale => {
      if (businessId && sale.businessId !== businessId) return false;
      if (staffId && sale.staffId !== staffId) return false;
      return true;
    });
    
    const totalOrders = filteredSales.length;
    const todayOrders = filteredSales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      const today = new Date();
      return saleDate.toDateString() === today.toDateString();
    }).length;
    
    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Daily sales data (last 7 days)
    const dailySalesData = getDailySales(7, businessId, staffId);

    // Best selling products
    const bestSellers = getBestSellingProducts(5, businessId, staffId);

    // Calculate sold quantities by product
    const soldByProduct = getSalesByProduct(businessId, staffId);
    
    // Inventory with sold quantities
    const inventoryWithSold = inventory.map(item => {
      const soldData = soldByProduct.get(item.id);
      const categoryObj = categories.find(c => c.id === item.category);
      const categoryName = categoryObj ? categoryObj.name : (item.category || "Uncategorized");

      return {
        ...item,
        categoryName,
        soldQuantity: soldData?.quantity || 0,
        soldRevenue: soldData?.revenue || 0
      };
    });

    // Low stock items (stock < 10)
    const lowStockItems = inventoryWithSold.filter(item => item.stock < 10 && item.stock > 0);

    // Out of stock items
    const outOfStockItems = inventoryWithSold.filter(item => item.stock === 0);

    // Category data
    const categoryMap = new Map<string, { sales: number; revenue: number; value: number }>();
    
    inventoryWithSold.forEach(item => {
      const catName = item.categoryName;
      const existing = categoryMap.get(catName);
      if (existing) {
        existing.sales += item.soldRevenue;
        existing.value += item.soldQuantity;
      } else {
        categoryMap.set(catName, {
          sales: item.soldRevenue,
          value: item.soldQuantity,
          revenue: item.soldRevenue
        });
      }
    });

    const categoryData = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      ...data
    }));

    // Calculate trends (compare today vs yesterday if data exists)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayRevenue = filteredSales
      .filter(sale => new Date(sale.timestamp).toDateString() === yesterday.toDateString())
      .reduce((sum, sale) => sum + sale.total, 0);
    
    const revenueTrend = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0;

    return {
      totalRevenue,
      todayRevenue,
      todayCustomers,
      totalOrders,
      todayOrders,
      avgOrderValue,
      dailySalesData,
      bestSellers,
      inventoryWithSold,
      lowStockItems,
      outOfStockItems,
      categoryData,
      revenueTrend,
      totalCOGS,
      totalGrossProfit,
      grossProfitMargin,
      filteredSales // ═══════ ADD FILTERED SALES TO ANALYTICS ═══════
    };
  }, [sales, inventory, categories, businessId, staffId, getTotalRevenue, getTotalRevenueToday, getTotalCustomersToday, getDailySales, getBestSellingProducts, getSalesByProduct, getTotalCOGS, getTotalGrossProfit, getGrossProfitMargin]);

  // ═══════════════════════════════════════════════════════════════════
  // EMPTY STATE - Show when no sales data exists
  // ═══════════════════════════════════════════════════════════════════
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
        <Select defaultValue="all-time">
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

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-semibold">{formatCurrency(analytics.totalRevenue, currencyCode)}</p>
                {analytics.revenueTrend !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${analytics.revenueTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.revenueTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{Math.abs(analytics.revenueTrend).toFixed(1)}% vs yesterday</span>
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
                <p className="text-3xl font-semibold">{formatCurrency(analytics.totalCOGS, currencyCode)}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>Purchase costs</span>
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
                <p className="text-3xl font-semibold">{formatCurrency(analytics.totalGrossProfit, currencyCode)}</p>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <span className="font-medium">{analytics.grossProfitMargin.toFixed(1)}% margin</span>
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
                <p className="text-3xl font-semibold">{analytics.totalOrders}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{analytics.todayOrders} today</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-3xl font-semibold">{analytics.todayCustomers}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>Served today</span>
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
                <p className="text-3xl font-semibold">{formatCurrency(analytics.avgOrderValue, currencyCode)}</p>
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
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>View detailed transaction records with customer information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
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
                              CUSTOMER NAME DISPLAY - Show name if provided, otherwise "Walk-in"
                              ═══════════════════════════════════════════════════════════════════ */}
                          {sale.customerName || <span className="text-muted-foreground">Walk-in</span>}
                        </TableCell>
                        <TableCell className="font-medium">
                          {/* ═══════════════════════════════════════════════════════════════════
                              SOLD BY (CASHIER/STAFF) - Display who processed the sale
                              ═══════════════════════════════════════════════════════════════════ */}
                          <div>{sale.staffName}</div>
                          <div className="text-xs text-muted-foreground">{sale.staffRole}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          {/* ═══════════════════════════════════════════════════════════════════
                              PRODUCTS PURCHASED - Show product names with quantities
                              ═══════════════════════════════════════════════════════════════════ */}
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
              </div>
              {analytics.filteredSales.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No transactions found</p>
              )}
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