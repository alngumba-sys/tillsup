import { createBrowserRouter, Navigate, Outlet } from "react-router";

console.log("🗺️ AppRoutes.tsx loaded - Router configuration starting...");

// App Pages
import { Dashboard } from "./pages/Dashboard";
import { POSTerminal } from "./pages/POSTerminal";
import { Inventory } from "./pages/Inventory";
import { Staff } from "./pages/Staff";
import { Reports } from "./pages/Reports";
import { ReportsEnhanced } from "./pages/ReportsEnhanced";
import { Expenses } from "./pages/Expenses";
import { Suppliers } from "./pages/Suppliers";
import { SupplierManagement } from "./pages/SupplierManagement";
import { SupplierRequests } from "./pages/SupplierRequests";
import { PurchaseOrders } from "./pages/PurchaseOrders";
import { GoodsReceived } from "./pages/GoodsReceived";
import { SubscriptionBilling } from "./pages/SubscriptionBilling";
import { BusinessSettings } from "./pages/BusinessSettings";
import { BranchManagement } from "./pages/BranchManagement";
import { Onboarding } from "./pages/Onboarding";
import { ReorderForecasting } from "./pages/ReorderForecasting";
import { AIInsights } from "./pages/AIInsights";
import { AdminDashboard } from "./pages/AdminDashboard";
import { LocationManagement } from "./pages/LocationManagement";
import { StockTransferHistory } from "./pages/StockTransferHistory";
import { SubscriptionExpired } from "./pages/SubscriptionExpired";
import { SubscriptionSuspended } from "./pages/SubscriptionSuspended";
import { SubscriptionCancelled } from "./pages/SubscriptionCancelled";
import { SubscriptionPastDue } from "./pages/SubscriptionPastDue";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { Unauthorized } from "./pages/Unauthorized";

// Auth Pages
import { Login } from "./pages/Login";
import { BusinessRegistration } from "./pages/BusinessRegistration";
import RecoveryRegistration from "./pages/RecoveryRegistration";
import { ChangePassword } from "./pages/ChangePassword";
import { DebugAuth } from "./pages/DebugAuth";
import { AdminLogin } from "./pages/AdminLogin";

// Public Pages
import { Landing } from "./pages/Landing";
import { LandingSimple } from "./pages/LandingSimple";
import { DiagnosticLanding } from "./pages/DiagnosticLanding";
import { DiagnosticSimple } from "./pages/DiagnosticSimple";
import { UltraSimpleLanding } from "./pages/UltraSimpleLanding";
import { SimpleLandingDirect } from "./pages/SimpleLandingDirect";
import { PublicRouteTest } from "./pages/PublicRouteTest";
import { WhoWeAre } from "./pages/WhoWeAre";
import { Pricing } from "./pages/Pricing";
import { BranchClosed } from "./pages/BranchClosed";
import { SimpleTest } from "./pages/SimpleTest";
import { SimpleTestBasic } from "./pages/SimpleTestBasic";
import { RenderTest } from "./pages/RenderTest";
import { AppStatusCheck } from "./pages/AppStatusCheck";

// Components
import { BranchGuard } from "./components/BranchGuard";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BusinessProviders } from "./components/BusinessProviders";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthenticatedLayout } from "./components/AuthenticatedLayout";
import { PermissionGuard } from "./components/PermissionGuard";
import { Permission } from "./types/permissions";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingSimple />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/diagnostic",
    element: <DiagnosticSimple />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/landing",
    element: <LandingSimple />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/landing-original",
    element: <Landing />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/simple-test",
    element: <SimpleTest />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/test",
    element: <SimpleTestBasic />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/render-test",
    element: <RenderTest />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/status-check",
    element: <AppStatusCheck />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/public-test",
    element: <PublicRouteTest />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/who-we-are",
    element: <WhoWeAre />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/pricing",
    element: <Pricing />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/register",
    element: <BusinessRegistration />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/recovery",
    element: <RecoveryRegistration />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/branch-closed",
    element: <BranchClosed />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/subscription-expired",
    element: <SubscriptionExpired />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/subscription-suspended",
    element: <SubscriptionSuspended />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/subscription-cancelled",
    element: <SubscriptionCancelled />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/subscription-past-due",
    element: <SubscriptionPastDue />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/payment-success",
    element: <PaymentSuccess />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/change-password",
    element: (
      <ProtectedRoute>
        <ChangePassword />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin-hidden",
    element: <AdminDashboard />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/debug-auth",
    element: <DebugAuth />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin-login",
    element: <AdminLogin />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/app",
    element: <AuthenticatedLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "pos",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Cashier", "Staff"]}
            requiredPermission={"pos.access" as Permission}
          >
            <POSTerminal />
          </PermissionGuard>
        ),
      },
      {
        path: "inventory",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager"]}
            requiredPermission={"inventory.view" as Permission}
          >
            <Inventory />
          </PermissionGuard>
        ),
      },
      {
        path: "staff",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Cashier", "Accountant", "Staff"]}
            requiredPermission={"staff.view" as Permission}
          >
            <Staff />
          </PermissionGuard>
        ),
      },
      {
        path: "reports",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Accountant"]}
            requiredPermission={"reports.view_sales" as Permission}
          >
            <Reports />
          </PermissionGuard>
        ),
      },
      {
        path: "reports-enhanced",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Accountant"]}
            requiredPermission={"reports.view_sales" as Permission}
          >
            <ReportsEnhanced />
          </PermissionGuard>
        ),
      },
      {
        path: "expenses",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Accountant"]}
            requiredPermission={"expenses.view" as Permission}
          >
            <Expenses />
          </PermissionGuard>
        ),
      },
      {
        path: "suppliers",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Staff"]}
            requiredPermission={"suppliers.view" as Permission}
          >
            <Suppliers />
          </PermissionGuard>
        ),
      },
      {
        path: "supplier-management",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Staff"]}
            requiredPermission={"suppliers.view" as Permission}
          >
            <SupplierManagement />
          </PermissionGuard>
        ),
      },
      {
        path: "supplier-requests",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Staff"]}
            requiredPermission={"suppliers.view" as Permission}
          >
            <SupplierRequests />
          </PermissionGuard>
        ),
      },
      {
        path: "purchase-orders",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Staff"]}
            requiredPermission={"suppliers.manage_orders" as Permission}
          >
            <PurchaseOrders />
          </PermissionGuard>
        ),
      },
      {
        path: "goods-received",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager", "Staff"]}
            requiredPermission={"suppliers.manage_orders" as Permission}
          >
            <GoodsReceived />
          </PermissionGuard>
        ),
      },
      {
        path: "subscription",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner"]}
          >
            <SubscriptionBilling />
          </PermissionGuard>
        ),
      },
      {
        path: "business-settings",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner"]}
            requiredPermission={"settings.view" as Permission}
          >
            <BusinessSettings />
          </PermissionGuard>
        ),
      },
      {
        path: "branch-management",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner"]}
            requiredPermission={"settings.manage_branches" as Permission}
          >
            <BranchManagement />
          </PermissionGuard>
        ),
      },
      {
        path: "onboarding",
        element: <Onboarding />,
      },
      {
        path: "forecasting",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager"]}
            requiredPermission={"inventory.view" as Permission}
          >
            <ReorderForecasting />
          </PermissionGuard>
        ),
      },
      {
        path: "ai-insights",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager"]}
            requiredPermission={"reports.view_sales" as Permission}
          >
            <AIInsights />
          </PermissionGuard>
        ),
      },
      {
        path: "location-management",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner"]}
          >
            <LocationManagement />
          </PermissionGuard>
        ),
      },
      {
        path: "stock-transfer-history",
        element: (
          <PermissionGuard
            requiredRoles={["Business Owner", "Manager"]}
            requiredPermission={"inventory.view" as Permission}
          >
            <StockTransferHistory />
          </PermissionGuard>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

console.log("✅ Router configured successfully with", router.routes.length, "routes");