import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Menu,
  X,
  LogOut,
  Store,
  Truck,
  Settings,
  Building2,
  Receipt,
  Crown,
  Sparkles
} from "lucide-react";
import { Badge } from "./ui/badge";
import { TopNavbar } from "./TopNavbar";
import { KPISync } from "./KPISync";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { useBranch } from "../contexts/BranchContext";
import { Toaster } from "./ui/sonner";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { GlobalErrorHandler } from "./GlobalErrorHandler";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app/dashboard", roles: ["Business Owner", "Manager", "Cashier", "Accountant", "Staff"] },
  { icon: ShoppingCart, label: "POS Terminal", path: "/app/pos", roles: ["Business Owner", "Manager", "Cashier", "Staff"] },
  { icon: Package, label: "Inventory", path: "/app/inventory", roles: ["Business Owner", "Manager"] },
  { icon: Truck, label: "Supplier Management", path: "/app/supplier-management", roles: ["Business Owner", "Manager", "Staff"], feature: "supplierManagement" },
  { icon: Users, label: "Staff", path: "/app/staff", roles: ["Business Owner", "Manager", "Cashier", "Accountant", "Staff"] },
  { icon: Building2, label: "Branch Management", path: "/app/branch-management", roles: ["Business Owner"] },
  { icon: BarChart3, label: "Reports", path: "/app/reports", roles: ["Business Owner", "Manager", "Accountant"] },
  { icon: Sparkles, label: "AI Insights", path: "/app/ai-insights", roles: ["Business Owner", "Manager"], feature: "aiInsights" },
  { icon: Receipt, label: "Expenses", path: "/app/expenses", roles: ["Business Owner", "Manager", "Accountant"], feature: "expenseTracking" },
  { icon: Crown, label: "Subscription & Billing", path: "/app/subscription", roles: ["Business Owner"] },
  { icon: Settings, label: "Business Settings", path: "/app/business-settings", roles: ["Business Owner"] }
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hasFeature } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  // Access Contexts directly (no try-catch)
  const { user, business, isAuthenticated, logout, hasPermission, loading: authLoading } = useAuth();
  
  // Safe branch context access
  let getBranchById: (id: string) => any | undefined = () => undefined;
  try {
    const branchContext = useBranch();
    getBranchById = branchContext.getBranchById;
  } catch (e) {
    console.warn("Layout: BranchContext not available", e);
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const hasAccess = (roles: string[]) => {
    return hasPermission(roles as any);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // If loading, show spinner (or just return null if AuthGuard handles it, but better safe)
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Fallback if somehow not authenticated but rendered (AuthGuard should prevent this)
  if (!isAuthenticated || !user) {
    return null; 
  }

  // Fallback if business is missing (e.g. during registration/onboarding transition)
  // Instead of null, render a minimal layout or loading
  if (!business) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-500">Loading business data...</p>
        </div>
      </div>
    );
  }

  // Get the current branch for display
  const currentBranch = user.branchId ? getBranchById(user.branchId) : null;

  return (
    <>
      <KPISync />
      <GlobalErrorHandler />
      <Toaster richColors position="top-right" />
      <div className="min-h-screen bg-background">
        {/* Global Top Navbar */}
        <TopNavbar />

        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col fixed left-0 top-16 bottom-0 w-64 bg-[#0479a1] border-r border-[#036080] z-30">
          {/* Business Info - FIXED TOP */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-[#036080]">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white" title={business.name}>{business.name}</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu - SCROLLABLE MIDDLE */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <nav className="px-3 py-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const accessible = hasAccess(item.roles);
                const active = isActive(item.path);
                
                // Check feature access
                // @ts-ignore
                const isFeatureLocked = item.feature ? !hasFeature(item.feature) : false;

                const handleClick = () => {
                  if (isFeatureLocked) {
                    toast.error(`Feature Locked: ${item.label}`, {
                      description: `This feature requires a higher plan. Please upgrade to access.`,
                      action: {
                        label: "View Plans",
                        onClick: () => navigate("/app/subscription")
                      }
                    });
                    return;
                  }
                  if (accessible) {
                    navigate(item.path);
                  }
                };

                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 relative group transition-all duration-200",
                      !accessible && "opacity-50 cursor-not-allowed",
                      
                      // Active State: Bright white, distinct background
                      active && "bg-white/20 text-white font-semibold shadow-sm",
                      
                      // Normal Inactive State (Accessible, Not Locked, Not Active): Clear white text (70%)
                      !active && !isFeatureLocked && "text-white/70 hover:text-white hover:bg-white/10",
                      
                      // Locked State: Dimmer text (30%)
                      isFeatureLocked && "text-white/30 hover:text-white/50 hover:bg-white/5"
                    )}
                    onClick={handleClick}
                    disabled={!accessible && !isFeatureLocked}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <span className="flex-1 text-left">
                      {item.label}
                    </span>
                    
                    {isFeatureLocked && (
                      <Lock className="w-3.5 h-3.5 ml-auto" />
                    )}
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User Info & Logout - FIXED BOTTOM */}
          <div className="flex-shrink-0 p-4 border-t border-[#036080] bg-[#0479a1]">
            <div className="mb-3 px-2">
              <p className="text-xs text-white/70 mb-1">Your Role</p>
              <Badge variant="outline" className="text-xs text-white border-white/20">
                {user.role}
              </Badge>
              {currentBranch && (
                <div className="mt-2">
                  <p className="text-xs text-white/70 mb-1">Assigned Branch</p>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-white" />
                    <span className="text-xs font-medium text-white">{currentBranch.name}</span>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent text-white/70 border-white/20 hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-64 bg-[#0479a1] border-r border-[#036080] z-50 lg:hidden flex flex-col">
              <div className="h-16 flex items-center justify-between px-6 border-b border-[#036080]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-semibold text-sm truncate text-white">{business.name}</h1>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-3 py-4">
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const accessible = hasAccess(item.roles);
                    const active = isActive(item.path);
                    
                    // Check feature access
                    // @ts-ignore
                    const isFeatureLocked = item.feature ? !hasFeature(item.feature) : false;

                    const handleClick = () => {
                      if (isFeatureLocked) {
                        toast.error(`Feature Locked: ${item.label}`, {
                          description: `This feature requires a higher plan. Please upgrade to access.`,
                          action: {
                            label: "View Plans",
                            onClick: () => {
                              navigate("/app/subscription");
                              setSidebarOpen(false);
                            }
                          }
                        });
                        return;
                      }
                      if (accessible) {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }
                    };

                    return (
                      <Button
                        key={item.path}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 relative group transition-all duration-200",
                          !accessible && "opacity-50 cursor-not-allowed",
                          
                          // Active State
                          active && "bg-white/20 text-white font-semibold shadow-sm",
                          
                          // Normal Inactive State
                          !active && !isFeatureLocked && "text-white/70 hover:text-white hover:bg-white/10",
                          
                          // Locked State
                          isFeatureLocked && "text-white/30 hover:text-white/50 hover:bg-white/5"
                        )}
                        onClick={handleClick}
                        disabled={!accessible && !isFeatureLocked}
                      >
                        <div className="relative">
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <span className="flex-1 text-left">
                          {item.label}
                        </span>
                        
                        {isFeatureLocked && (
                          <Lock className="w-3.5 h-3.5 ml-auto" />
                        )}
                      </Button>
                    );
                  })}
                </nav>
              </ScrollArea>

              <div className="p-4 border-t border-[#036080]">
                <div className="mb-3 px-2">
                  <p className="text-xs text-white/70 mb-1">Your Role</p>
                  <Badge variant="outline" className="text-xs text-white border-white/20">
                    {user.role}
                  </Badge>
                  {currentBranch && (
                    <div className="mt-2">
                      <p className="text-xs text-white/70 mb-1">Assigned Branch</p>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-white" />
                        <span className="text-xs font-medium text-white">{currentBranch.name}</span>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 bg-transparent text-white/70 border-white/20 hover:bg-white/10 hover:text-white"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden mt-16 lg:ml-64">
          {/* Header - Mobile Menu Button */}
          <header className="h-12 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {user.role}
              </Badge>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
