import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { AuthGuard } from "./components/AuthGuard";
import { BranchGuard } from "./components/BranchGuard";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Public Pages
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { BusinessRegistration } from "./pages/BusinessRegistration";
import { WhoWeAre } from "./pages/WhoWeAre";
import { BranchClosed } from "./pages/BranchClosed";
import { ChangePassword } from "./pages/ChangePassword";

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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin-hidden",
    element: <AdminDashboard />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/who-we-are",
    element: <WhoWeAre />,
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
    path: "/branch-closed",
    element: <BranchClosed />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/change-password",
    element: (
      <AuthGuard requireAuth={true}>
        <ChangePassword />
      </AuthGuard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/app",
    element: (
      <AuthGuard requireAuth={true}>
        <Layout>
          <BranchGuard>
            <Outlet />
          </BranchGuard>
        </Layout>
      </AuthGuard>
    ),
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
        path: "settings",
        element: <BusinessSettings />,
      },
      {
        path: "branches",
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
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
