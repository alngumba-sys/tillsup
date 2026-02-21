import { useEffect } from "react";
import { useSales } from "../contexts/SalesContext";
import { useKPI } from "../contexts/KPIContext";
import { useAuth } from "../contexts/AuthContext";

/**
 * KPI Synchronizer Component
 * 
 * This component ensures KPIs in the top navbar always reflect
 * the real-time data from the Sales store.
 * 
 * It runs automatically and updates KPIs whenever sales change.
 * 
 * RBAC: Shows business-scoped data with role-based filtering:
 * - Business Owner/Accountant: See all business sales
 * - Manager: See only their assigned branch sales
 * - Staff/Cashier: See only their own sales
 */
export function KPISynchronizer() {
  const { sales, getTotalRevenueToday, getTotalCustomersToday } = useSales();
  const { setKPIData } = useKPI();
  const { user, business } = useAuth();

  useEffect(() => {
    if (!user || !business) return;

    // Determine filtering based on role
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
    
    const customers = getTotalCustomersToday(businessId, staffId, branchId);
    const revenue = getTotalRevenueToday(businessId, staffId, branchId);

    setKPIData({
      todayCustomers: customers,
      todaySales: revenue,
    });
  }, [sales, user, business, getTotalCustomersToday, getTotalRevenueToday, setKPIData]);

  return null; // This is a logic-only component
}