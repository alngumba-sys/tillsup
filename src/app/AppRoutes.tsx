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
        element: <POSTerminal />,
      },
      {
        path: "inventory",
        element: <Inventory />,
      },
      {
        path: "staff",
        element: <Staff />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "reports-enhanced",
        element: <ReportsEnhanced />,
      },
      {
        path: "expenses",
        element: <Expenses />,
      },
      {
        path: "suppliers",
        element: <Suppliers />,
      },
      {
        path: "supplier-management",
        element: <SupplierManagement />,
      },
      {
        path: "supplier-requests",
        element: <SupplierRequests />,
      },
      {
        path: "purchase-orders",
        element: <PurchaseOrders />,
      },
      {
        path: "goods-received",
        element: <GoodsReceived />,
      },
      {
        path: "subscription",
        element: <SubscriptionBilling />,
      },
      {
        path: "business-settings",
        element: <BusinessSettings />,
      },
      {
        path: "branch-management",
        element: <BranchManagement />,
      },
      {
        path: "onboarding",
        element: <Onboarding />,
      },
      {
        path: "forecasting",
        element: <ReorderForecasting />,
      },
      {
        path: "ai-insights",
        element: <AIInsights />,
      },
      {
        path: "location-management",
        element: <LocationManagement />,
      },
      {
        path: "stock-transfer-history",
        element: <StockTransferHistory />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

console.log("✅ Router configured successfully with", router.routes.length, "routes");