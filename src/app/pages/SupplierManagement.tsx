import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Truck, FileText, PackageSearch, ClipboardCheck, DollarSign, TrendingUp } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Suppliers } from "./Suppliers";
import { SupplierRequests } from "./SupplierRequests";
import { PurchaseOrders } from "./PurchaseOrders";
import { GoodsReceived } from "./GoodsReceived";
import { SupplierInvoices } from "./SupplierInvoices";
import { ReorderForecasting } from "./ReorderForecasting";
import { useState } from "react";
import { SupplierRequest } from "../contexts/SupplierRequestContext";
import { SupplierManagementContext } from "../contexts/SupplierManagementContext";
import { useSubscription } from "../hooks/useSubscription";
import { AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router";

export function SupplierManagement() {
  const { user } = useAuth();
  const { hasFeature } = useSubscription();
  const navigate = useNavigate();

  // Check if user exists
  if (!user) {
    return (
      <div className="p-4 lg:p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Authentication required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Only Business Owner and Manager can access supplier management
  const canAccessSuppliers = user.role === "Business Owner" || user.role === "Manager";
  const canAccessGoodsReceived = user.role === "Business Owner" || user.role === "Manager" || user.role === "Staff";

  if (!canAccessSuppliers && !canAccessGoodsReceived) {
    return (
      <div className="p-4 lg:p-6">
        <Alert variant="destructive">
          <AlertDescription>
            You don't have permission to access supplier management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isFeatureEnabled = hasFeature("supplierManagement");

  if (!isFeatureEnabled) {
    return (
      <div className="p-4 lg:p-6">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Supplier Management is not available on your current plan.
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

  // Determine default tab based on permissions
  const defaultTab = canAccessSuppliers ? "suppliers" : "goods-received";

  // State to manage tab switching
  const [currentTab, setCurrentTab] = useState(defaultTab);

  // State to manage PO conversion data
  const [poConversionData, setPOConversionData] = useState<{ mode: string; sourceRequest: SupplierRequest } | null>(null);

  // Function to switch tabs
  const switchTab = (tab: string) => {
    setCurrentTab(tab);
  };

  return (
    <SupplierManagementContext.Provider value={{ switchTab, setPOConversionData, poConversionData }}>
      <div className="space-y-6">
        {/* Tabbed Interface - Pages handle their own padding and headers */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <div className="p-4 lg:p-6 pb-0">
            <TabsList>
              {canAccessSuppliers && (
                <TabsTrigger value="suppliers" className="gap-2">
                  <Truck className="w-4 h-4" />
                  Suppliers
                </TabsTrigger>
              )}
              {canAccessSuppliers && (
                <TabsTrigger value="requests" className="gap-2">
                  <PackageSearch className="w-4 h-4" />
                  Supplier Requests
                </TabsTrigger>
              )}
              {canAccessSuppliers && (
                <TabsTrigger value="purchase-orders" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Purchase Orders
                </TabsTrigger>
              )}
              {canAccessGoodsReceived && (
                <TabsTrigger value="goods-received" className="gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Goods Received
                </TabsTrigger>
              )}
              {canAccessSuppliers && (
                <TabsTrigger value="invoices" className="gap-2">
                  <DollarSign className="w-4 h-4" />
                  Supplier Invoices
                </TabsTrigger>
              )}
              {canAccessSuppliers && (
                <TabsTrigger value="reorder" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Reorder Forecasting
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {canAccessSuppliers && (
            <TabsContent value="suppliers">
              <Suppliers />
            </TabsContent>
          )}

          {canAccessSuppliers && (
            <TabsContent value="requests">
              <SupplierRequests />
            </TabsContent>
          )}

          {canAccessSuppliers && (
            <TabsContent value="purchase-orders">
              <PurchaseOrders />
            </TabsContent>
          )}

          {canAccessGoodsReceived && (
            <TabsContent value="goods-received">
              <GoodsReceived />
            </TabsContent>
          )}

          {canAccessSuppliers && (
            <TabsContent value="invoices">
              <SupplierInvoices />
            </TabsContent>
          )}

          {canAccessSuppliers && (
            <TabsContent value="reorder">
              <ReorderForecasting />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </SupplierManagementContext.Provider>
  );
}
