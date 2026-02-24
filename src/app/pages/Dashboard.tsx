import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ShoppingCart, DollarSign, TrendingUp, Users, Database, Info, Crown, AlertCircle, TrendingDown, Receipt } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useKPI } from "../contexts/KPIContext";
import { useSales } from "../contexts/SalesContext";
import { useInventory } from "../contexts/InventoryContext";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { useBranch } from "../contexts/BranchContext";
import { useExpense } from "../contexts/ExpenseContext";
import { Button } from "../components/ui/button";
import { seedDemoSales } from "../utils/seedDemoSales";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useCurrency } from "../hooks/useCurrency";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Package } from "lucide-react";
import { Building2 } from "lucide-react";
import { SchemaError } from "../components/inventory/SchemaError";

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
    getDailySales,
    getTotalCOGS
  } = useSales();
  const { inventory } = useInventory();
  const { user, business, schemaError } = useAuth();
  const { usage } = useSubscription();
  const { branches, error: branchError } = useBranch();
  const { expenses } = useExpense();
  const navigate = useNavigate();
  const [isDemoDataLoaded, setIsDemoDataLoaded] = useState(false);

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

    // ══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
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
  // ROLE-BASED SALES CHART DATA
  // ═══════════════════════════════════════════════════════════════════
  const weekSalesData = useMemo(() => {
    const dailySales = getDailySales(7, businessId, staffId, branchId);
    // Filter out days with zero sales and map to chart format
    const chartData = dailySales
      .filter(day => day.revenue > 0) // Only include days with actual sales
      .map(day => ({
        name: day.dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        date: day.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: day.revenue
      }));
    
    console.log('📈 Chart Data:', chartData);
    
    return chartData;
  }, [getDailySales, businessId, staffId, branchId]);

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
      bgColor: "bg-blue-50"
    },
    {
      title: user?.role === "Cashier" || user?.role === "Staff" 
        ? "Your Total Sales" 
        : "Today's Total Sales",
      value: formatCurrency(roleBasedKPIs.todayRevenue),
      change: baselineMetrics?.revenueChange ?? null,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Average Transaction",
      value: formatCurrency(roleBasedKPIs.averageTransaction),
      change: baselineMetrics?.avgTransactionChange ?? null,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: user?.role === "Cashier" || user?.role === "Staff" 
        ? "Products You Sold" 
        : "Products Sold",
      value: roleBasedKPIs.productsSoldToday.toString(),
      change: baselineMetrics?.productsSoldChange ?? null,
      icon: ShoppingCart,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

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
                <span title="Branches Used">
                  <span className="font-medium text-foreground">{branches?.length || 0}</span>/{business.maxBranches} Branches
                </span>
                <span className="w-px h-3 bg-border" />
                <span title="Staff Members">
                  <span className="font-medium text-foreground">{usage.staff}</span>/{business.maxStaff} Staff
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          
          // ══════════════════════════════════════════════════════════════════
          // BASELINE VISUAL RULES - Apply neutral styling when no baseline
          // ═══════════════════════════════════════════════════════════════════
          const showNeutralStyle = baselineMetrics && !baselineMetrics.hasBaseline;
          const displayBgColor = showNeutralStyle ? "bg-gray-50" : kpi.bgColor;
          const displayColor = showNeutralStyle ? "text-gray-600" : kpi.color;
          
          return (
            <Card key={kpi.title}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground leading-tight truncate">{kpi.title}</p>
                    <p className="font-semibold text-lg leading-tight break-words">{kpi.value}</p>
                    {/* Only show change text if it exists (not null) */}
                    {kpi.change && (
                      <p className={`text-[10px] leading-tight ${showNeutralStyle ? 'text-muted-foreground/80' : 'text-muted-foreground'}`}>
                        {kpi.change}
                      </p>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${displayBgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${displayColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Expense & Profit KPI Cards - Business Owner & Manager Only */}
        {user && !staffId && (user.role === "Business Owner" || user.role === "Manager" || user.role === "Accountant") && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground leading-tight truncate">Today's Expenses</p>
                    <p className="font-semibold text-red-600 text-lg leading-tight break-words">{formatCurrency(roleBasedKPIs.todayExpenses)}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Total expenses recorded</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground leading-tight truncate">Net Profit Today</p>
                    <p className={`font-semibold ${roleBasedKPIs.todayNetProfit >= 0 ? 'text-green-600' : 'text-red-600'} text-lg leading-tight break-words`}>
                      {formatCurrency(roleBasedKPIs.todayNetProfit)}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Revenue - COGS - Expenses</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${roleBasedKPIs.todayNetProfit >= 0 ? 'bg-green-50' : 'bg-red-50'} flex items-center justify-center flex-shrink-0`}>
                    {roleBasedKPIs.todayNetProfit >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

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
              <ResponsiveContainer width="100%" height={300} minHeight={300}>
                <LineChart data={weekSalesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    label={{ value: 'Day of Week', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return `${payload[0].payload.name} (${payload[0].payload.date})`;
                      }
                      return label;
                    }}
                  />
                  <Line 
                    type="natural" 
                    dataKey="sales" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 5, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Daily sales trend analysis</CardDescription>
          </CardHeader>
          <CardContent style={{ minHeight: '350px' }}>
            <div className="h-[300px] min-h-[300px] w-full" style={{ minHeight: '300px', height: '300px', minWidth: '100%', width: '100%' }}>
              <ResponsiveContainer width="100%" height={300} minHeight={300}>
                <LineChart data={weekSalesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    label={{ value: 'Day of Week', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return `${payload[0].payload.name} (${payload[0].payload.date})`;
                      }
                      return label;
                    }}
                  />
                  <Line 
                    type="natural" 
                    dataKey="sales" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 5, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest customer transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium">{transaction.customer}</p>
                  <p className="text-sm text-muted-foreground">{transaction.displayId} • {transaction.time}</p>
                  {/* ═══════════════════════════════════════════════════════════════════
                      SOLD BY (STAFF/CASHIER) - Display who processed the transaction
                      ═══════════════════════════════════════════════════════════════════ */}
                  <p className="text-xs text-muted-foreground mt-0.5">Sold by: {transaction.staffName}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{transaction.amount}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-50 text-green-700">
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


    </div>
  );
}