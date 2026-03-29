import { AnimatedCounter } from "./AnimatedCounter";
import { ProfileDropdown } from "./ProfileDropdown";
import { ClockInOut } from "./ClockInOut";
import { LocationSelector } from "./LocationSelector";
import { cn } from "./ui/utils";
import { useKPI } from "../contexts/KPIContext";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../hooks/useCurrency";
import { useBranding } from "../contexts/BrandingContext";
import { Store, Users, DollarSign, HelpCircle } from "lucide-react";
import { useState } from "react";
import { WalkthroughModal } from "./WalkthroughModal";
import { isPreviewMode } from "../utils/previewMode";
import { Badge } from "./ui/badge";

export function TopNavbar() {
  const { kpiData, kpiUpdated } = useKPI();
  const { business } = useAuth();
  const { currencySymbol } = useCurrency();
  const { assets } = useBranding();
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

  return (
    <div className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 fixed top-0 left-0 right-0 z-50 bg-[#f3f7ff]">
      {/* Logo and App Name */}
      <div className="flex items-center gap-3">
        {assets.logoMain && (
          <img src={assets.logoMain} alt="Logo" className="h-10 w-auto object-contain" />
        )}
        {/* Preview Mode Badge */}
        {isPreviewMode() && (
          <Badge variant="outline" className="bg-[#00719C]/10 text-[#00719C] border-[#00719C] text-xs px-2 py-0.5">
            Preview Mode
          </Badge>
        )}
      </div>

      {/* Right Section: KPI Cards + Profile */}
      <div className="flex items-center gap-2.5">
        {/* Today's Customers */}
        <div
          className={cn(
            "relative bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5 transition-all duration-500 overflow-hidden",
            kpiUpdated && "shadow-md shadow-blue-200/50"
          )}
        >
          {/* Glow effect overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-blue-400/20 transition-opacity duration-700",
              kpiUpdated ? "opacity-100 animate-shimmer" : "opacity-0"
            )}
          />
          
          <div className="relative flex items-center gap-1.5">
            <div className={cn(
              "w-6 h-6 bg-blue-100 rounded flex items-center justify-center transition-transform duration-300",
              kpiUpdated && "scale-110"
            )}>
              <Users className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-blue-600 font-medium hidden sm:block leading-tight">Today's Customers</p>
              <p className="text-[10px] text-blue-600 font-medium sm:hidden leading-tight">Customers</p>
              <p className="text-sm font-semibold text-blue-900 leading-tight">
                <AnimatedCounter value={kpiData.todayCustomers} />
              </p>
            </div>
          </div>
        </div>

        {/* Today's Sales */}
        <div
          className={cn(
            "relative bg-green-50 border border-green-200 rounded-md px-2 py-1.5 transition-all duration-500 overflow-hidden",
            kpiUpdated && "shadow-md shadow-green-200/50"
          )}
        >
          {/* Glow effect overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-green-400/20 transition-opacity duration-700",
              kpiUpdated ? "opacity-100 animate-shimmer" : "opacity-0"
            )}
          />
          
          <div className="relative flex items-center gap-1.5">
            <div className={cn(
              "w-6 h-6 bg-green-100 rounded flex items-center justify-center transition-transform duration-300",
              kpiUpdated && "scale-110"
            )}>
              <DollarSign className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-green-600 font-medium hidden sm:block leading-tight">Today's Sales</p>
              <p className="text-[10px] text-green-600 font-medium sm:hidden leading-tight">Sales</p>
              <p className="text-sm font-semibold text-green-900 leading-tight">
                <AnimatedCounter 
                  value={kpiData.todaySales} 
                  decimals={2} 
                  prefix={`${currencySymbol} `}
                />
              </p>
            </div>
          </div>
        </div>

        {/* Location Selector - Only for Business Owner and Manager */}
        {/* Temporarily disabled */}
        {/* <LocationSelector /> */}

        {/* Clock In/Out */}
        <ClockInOut />

        {/* Walkthrough Help Button */}
        <button
          onClick={() => setIsWalkthroughOpen(true)}
          className="group relative flex items-center justify-center w-10 h-8 bg-white hover:bg-gray-100 rounded-lg transition-all hover:scale-105 active:scale-95"
          aria-label="Start tutorial walkthrough"
        >
          <HelpCircle className="w-5 h-5 text-[#00719C]" strokeWidth={2.5} />
        </button>

        {/* Profile Dropdown */}
        <ProfileDropdown />
      </div>

      {/* Walkthrough Modal */}
      <WalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />
    </div>
  );
}