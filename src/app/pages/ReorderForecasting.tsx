import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  ShoppingCart,
  BarChart3,
  Info,
  FileText,
  Zap,
  Snail,
  Target,
  DollarSign
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useForecasting, ProductForecast, StockStatus } from "../contexts/ForecastingContext";
import { useReorderForecasting } from "../hooks/useReorderForecasting";
import { useCurrency } from "../hooks/useCurrency";
import { useSubscription } from "../hooks/useSubscription";
import { toast } from "sonner";
import { Alert, AlertDescription } from "../components/ui/alert";

export function ReorderForecasting() {
  const navigate = useNavigate();
  const { user, business } = useAuth();
  const { branches } = useBranch();
  const { formatCurrency } = useCurrency();
  const { hasFeature } = useSubscription();
  const { forecastingConfig, updateForecastingConfig, setLeadTime, getLeadTime } = useForecasting();

  // ═══════════════════════════════════════════════════════════════════
  // VIEW STATE
  // ═══════════════════════════════════════════════════════════════════
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [salesPeriodDays, setSalesPeriodDays] = useState<number>(
    forecastingConfig?.defaultSalesPeriodDays || 30
  );

  const isFeatureEnabled = hasFeature("forecasting");

  if (!isFeatureEnabled) {
    return (
      <div className="p-4 lg:p-6">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Reorder Forecasting is not available on your current plan.
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
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showLeadTimeDialog, setShowLeadTimeDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductForecast | null>(null);
  const [leadTimeInput, setLeadTimeInput] = useState("");

  // ═══════════════════════════════════════════════════════════════════
  // RBAC: Determine user's branch access
  // ═══════════════════════════════════════════════════════════════════
  const { canAccessAllBranches, lockedBranchId } = useMemo(() => {
    if (!user) return { canAccessAllBranches: false, lockedBranchId: undefined };

    const canAccessAllBranches = user.role === "Business Owner";
    const lockedBranchId = user.role === "Manager" ? user.branchId : undefined;

    return { canAccessAllBranches, lockedBranchId };
  }, [user]);

  // Set branch filter based on permissions
  useMemo(() => {
    if (lockedBranchId) {
      setSelectedBranch(lockedBranchId);
    }
  }, [lockedBranchId]);

  // ═══════════════════════════════════════════════════════════════════
  // LOAD FORECASTING DATA
  // ═══════════════════════════════════════════════════════════════════
  const {
    forecasts,
    urgentForecasts,
    reorderSoonForecasts,
    okForecasts,
    stats,
    highVelocityProducts,
    slowMovingProducts
  } = useReorderForecasting(
    selectedBranch === "ALL" ? undefined : selectedBranch,
    salesPeriodDays
  );

  // ═══════════════════════════════════════════════════════════════════
  // STATUS BADGE HELPERS
  // ═══════════════════════════════════════════════════════════════════
  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case "OK":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            OK
          </Badge>
        );
      case "Reorder Soon":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Reorder Soon
          </Badge>
        );
      case "Urgent":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgent
          </Badge>
        );
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE SALES PERIOD
  // ═══════════════════════════════════════════════════════════════════
  const handleUpdateSalesPeriod = (days: number) => {
    setSalesPeriodDays(days);
    
    if (user?.role === "Business Owner") {
      updateForecastingConfig({ defaultSalesPeriodDays: days });
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // SET LEAD TIME
  // ═══════════════════════════════════════════════════════════════════
  const handleSetLeadTime = () => {
    if (!selectedProduct) return;

    const days = parseInt(leadTimeInput);
    if (isNaN(days) || days <= 0) {
      toast.error("Please enter a valid lead time in days");
      return;
    }

    setLeadTime("product", selectedProduct.productId, days);
    
    toast.success("Lead Time Updated", {
      description: `${selectedProduct.productName}: ${days} days`
    });

    setShowLeadTimeDialog(false);
    setSelectedProduct(null);
    setLeadTimeInput("");
  };

  // ═══════════════════════════════════════════════════════════════════
  // CREATE PURCHASE ORDER FROM FORECAST
  // ═══════════════════════════════════════════════════════════════════
  const handleCreatePO = (forecast: ProductForecast) => {
    if (!forecast.supplierId) {
      toast.error("No supplier assigned to this product");
      return;
    }

    // Navigate to PO page with pre-filled data
    navigate(
      `/app/purchase-orders?create=true&supplier=${forecast.supplierId}&product=${forecast.productId}&quantity=${forecast.suggestedReorderQuantity}&branch=${forecast.branchId}`
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // PERMISSION CHECKS
  // ═══════════════════════════════════════════════════════════════════
  const canConfigureLeadTime = user?.role === "Business Owner";
  const canCreatePO = user?.role === "Business Owner" || user?.role === "Manager";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-1">Reorder Forecasting</h1>
          <p className="text-muted-foreground">
            Intelligent inventory reorder recommendations based on sales history
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">How Forecasting Works</p>
              <ul className="space-y-1 text-xs list-disc list-inside">
                <li><strong>Average Daily Sales:</strong> Total quantity sold ÷ Days in period</li>
                <li><strong>Reorder Point:</strong> Average Daily Sales × Lead Time</li>
                <li><strong>Suggested Quantity:</strong> (Avg Daily Sales × Reorder Cycle) - Current Stock</li>
                <li><strong>Status:</strong> Green = OK, Yellow = Reorder Soon, Red = Urgent</li>
              </ul>
              <p className="mt-2 text-xs italic">
                This is a recommendation system only. No automatic actions will be taken.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reorder Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalReorderCost)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Urgent Reorder</p>
                <p className="text-2xl font-bold text-red-900">{stats.urgentCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Reorder Soon</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.reorderSoonCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Stock OK</p>
                <p className="text-2xl font-bold text-green-900">{stats.okCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {canAccessAllBranches && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Branches</SelectItem>
                    {branches
                      .filter(b => b.businessId === business?.id)
                      .map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Sales History Period</Label>
              <Select
                value={salesPeriodDays.toString()}
                onValueChange={(v) => handleUpdateSalesPeriod(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="14">Last 14 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="60">Last 60 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="urgent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="urgent" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Urgent ({stats.urgentCount})
          </TabsTrigger>
          <TabsTrigger value="reorder-soon" className="gap-2">
            <Clock className="w-4 h-4" />
            Reorder Soon ({stats.reorderSoonCount})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Products
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Urgent Tab */}
        <TabsContent value="urgent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Urgent Reorder Required
              </CardTitle>
              <CardDescription>
                Products below reorder point - immediate action recommended
              </CardDescription>
            </CardHeader>
            <CardContent>
              {urgentForecasts.length > 0 ? (
                <ForecastTable
                  forecasts={urgentForecasts}
                  onSetLeadTime={(forecast) => {
                    setSelectedProduct(forecast);
                    setLeadTimeInput(forecast.leadTimeDays.toString());
                    setShowLeadTimeDialog(true);
                  }}
                  onCreatePO={handleCreatePO}
                  canConfigureLeadTime={canConfigureLeadTime}
                  canCreatePO={canCreatePO}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50 text-green-600" />
                  <p>No urgent reorders needed</p>
                  <p className="text-sm mt-1">All products have sufficient stock</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reorder Soon Tab */}
        <TabsContent value="reorder-soon">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <Clock className="w-5 h-5" />
                Reorder Soon
              </CardTitle>
              <CardDescription>
                Products approaching reorder point - plan procurement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reorderSoonForecasts.length > 0 ? (
                <ForecastTable
                  forecasts={reorderSoonForecasts}
                  onSetLeadTime={(forecast) => {
                    setSelectedProduct(forecast);
                    setLeadTimeInput(forecast.leadTimeDays.toString());
                    setShowLeadTimeDialog(true);
                  }}
                  onCreatePO={handleCreatePO}
                  canConfigureLeadTime={canConfigureLeadTime}
                  canCreatePO={canCreatePO}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No products in "Reorder Soon" status</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Products Tab */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Products</CardTitle>
              <CardDescription>
                Complete inventory forecast overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forecasts.length > 0 ? (
                <ForecastTable
                  forecasts={forecasts}
                  onSetLeadTime={(forecast) => {
                    setSelectedProduct(forecast);
                    setLeadTimeInput(forecast.leadTimeDays.toString());
                    setShowLeadTimeDialog(true);
                  }}
                  onCreatePO={handleCreatePO}
                  canConfigureLeadTime={canConfigureLeadTime}
                  canCreatePO={canCreatePO}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No inventory data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {/* High Velocity Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-600" />
                High-Velocity Products
              </CardTitle>
              <CardDescription>
                Top 10 fastest-selling products (based on average daily sales)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {highVelocityProducts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Avg Daily Sales</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Days Until Stockout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {highVelocityProducts.map((forecast, index) => (
                      <TableRow key={`${forecast.productId}-${forecast.branchId}`}>
                        <TableCell className="font-semibold">#{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{forecast.productName}</p>
                            <p className="text-xs text-muted-foreground">{forecast.productSKU}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{forecast.branchName}</TableCell>
                        <TableCell className="text-right font-semibold text-orange-700">
                          {forecast.averageDailySales.toFixed(2)} units/day
                        </TableCell>
                        <TableCell className="text-right">{forecast.currentStock}</TableCell>
                        <TableCell className="text-right">
                          {forecast.daysUntilStockout !== null ? (
                            <Badge variant="outline" className={
                              forecast.daysUntilStockout <= 7 ? "bg-red-100 text-red-700" : "bg-gray-100"
                            }>
                              {forecast.daysUntilStockout} days
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  No sales data available for analysis
                </p>
              )}
            </CardContent>
          </Card>

          {/* Slow-Moving Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Snail className="w-5 h-5 text-gray-600" />
                Slow-Moving Inventory
              </CardTitle>
              <CardDescription>
                Products with low sales but high stock (overstocking risk)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {slowMovingProducts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Avg Daily Sales</TableHead>
                      <TableHead className="text-right">Days of Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowMovingProducts.map((forecast) => (
                      <TableRow key={`${forecast.productId}-${forecast.branchId}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{forecast.productName}</p>
                            <p className="text-xs text-muted-foreground">{forecast.productSKU}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{forecast.branchName}</TableCell>
                        <TableCell className="text-right font-semibold">{forecast.currentStock}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {forecast.averageDailySales.toFixed(2)} units/day
                        </TableCell>
                        <TableCell className="text-right">
                          {forecast.daysUntilStockout !== null ? (
                            <Badge variant="outline" className="bg-gray-100">
                              {forecast.daysUntilStockout} days
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">∞</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  No slow-moving products identified
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lead Time Configuration Dialog */}
      <Dialog open={showLeadTimeDialog} onOpenChange={setShowLeadTimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Lead Time</DialogTitle>
            <DialogDescription>
              Set the number of days it takes for the supplier to deliver this product
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-semibold">{selectedProduct.productName}</p>
                    <p className="text-xs text-muted-foreground">{selectedProduct.productSKU}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Lead Time (Days) *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g., 7"
                  value={leadTimeInput}
                  onChange={(e) => setLeadTimeInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  How many days does it typically take for the supplier to deliver after ordering?
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeadTimeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetLeadTime}>
              Save Lead Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FORECAST TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════
interface ForecastTableProps {
  forecasts: ProductForecast[];
  onSetLeadTime: (forecast: ProductForecast) => void;
  onCreatePO: (forecast: ProductForecast) => void;
  canConfigureLeadTime: boolean;
  canCreatePO: boolean;
}

function ForecastTable({
  forecasts,
  onSetLeadTime,
  onCreatePO,
  canConfigureLeadTime,
  canCreatePO
}: ForecastTableProps) {
  const { formatCurrency } = useCurrency();
  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case "OK":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            OK
          </Badge>
        );
      case "Reorder Soon":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Reorder Soon
          </Badge>
        );
      case "Urgent":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgent
          </Badge>
        );
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead className="text-right">Current Stock</TableHead>
          <TableHead className="text-right">Avg Daily Sales</TableHead>
          <TableHead className="text-right">Lead Time</TableHead>
          <TableHead className="text-right">Reorder Point</TableHead>
          <TableHead className="text-right">Suggested Qty</TableHead>
          <TableHead className="text-right">Estimated Cost</TableHead>
          <TableHead className="text-right">Days Left</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {forecasts.map((forecast) => (
          <TableRow key={`${forecast.productId}-${forecast.branchId}`}>
            <TableCell>
              <div>
                <p className="font-medium">{forecast.productName}</p>
                <p className="text-xs text-muted-foreground">{forecast.productSKU}</p>
              </div>
            </TableCell>
            <TableCell className="text-sm">{forecast.branchName}</TableCell>
            <TableCell className="text-right font-semibold">{forecast.currentStock}</TableCell>
            <TableCell className="text-right text-sm">
              {forecast.averageDailySales.toFixed(2)}
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="outline" className="text-xs">
                {forecast.leadTimeDays}d
              </Badge>
            </TableCell>
            <TableCell className="text-right font-semibold">
              {Math.ceil(forecast.reorderPoint)}
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="outline" className="font-semibold text-blue-700">
                {forecast.suggestedReorderQuantity}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(forecast.estimatedReorderCost || 0)}
            </TableCell>
            <TableCell className="text-right">
              {forecast.daysUntilStockout !== null ? (
                <Badge variant="outline" className={
                  forecast.daysUntilStockout <= 3
                    ? "bg-red-100 text-red-700"
                    : forecast.daysUntilStockout <= 7
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100"
                }>
                  {forecast.daysUntilStockout}d
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">N/A</span>
              )}
            </TableCell>
            <TableCell>{getStatusBadge(forecast.status)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                {canConfigureLeadTime && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSetLeadTime(forecast)}
                    title="Configure lead time"
                  >
                    <Target className="w-4 h-4" />
                  </Button>
                )}
                
                {canCreatePO && forecast.status !== "OK" && forecast.supplierId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600"
                    onClick={() => onCreatePO(forecast)}
                    title="Create Purchase Order"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
