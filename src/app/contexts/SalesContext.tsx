import { createContext, useContext, useState, ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════
// SALES DATA MODEL - Immutable Historical Record with Multi-Tenant Support
// ═══════════════════════════════════════════════════════════════════

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // ═══════════════════════════════════════════════════════════════════
  // PRICING EXTENSION - Track which price tier was used
  // ═══════════════════════════════════════════════════════════════════
  priceType?: "retail" | "wholesale"; // Which price tier was selected (default: retail)
  costPrice?: number; // Purchase/cost price per unit for profit calculation
}

export interface Sale {
  id: string;
  timestamp: Date;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  customerCount: number; // Number of customers in this transaction
  // Multi-tenant fields
  businessId: string; // Which business this sale belongs to
  branchId: string; // Which branch this sale was made at
  staffId: string; // Who made the sale
  staffRole: string; // Role of the staff member
  staffName: string; // Name of the staff member
  // ═══════════════════════════════════════════════════════════════════
  // CUSTOMER NAME - First-class display field for sales tracking
  // ═══════════════════════════════════════════════════════════════════
  customerName?: string; // Optional customer name captured during sale
}

interface SalesContextType {
  sales: Sale[];
  recordSale: (sale: Omit<Sale, "id" | "timestamp">) => void;
  addSaleDirectly: (sale: Sale) => void; // For seeding historical data
  // Filtered queries based on current user context
  getSalesForBusiness: (businessId: string) => Sale[];
  getSalesForStaff: (staffId: string) => Sale[];
  getSalesToday: (businessId?: string, staffId?: string, branchId?: string) => Sale[];
  getTotalRevenue: (businessId?: string, staffId?: string, branchId?: string) => number;
  getTotalRevenueToday: (businessId?: string, staffId?: string, branchId?: string) => number;
  getTotalCustomersToday: (businessId?: string, staffId?: string, branchId?: string) => number;
  getSalesByProduct: (businessId?: string, staffId?: string) => Map<string, { name: string; quantity: number; revenue: number }>;
  getSalesByDate: (startDate: Date, endDate: Date, businessId?: string, staffId?: string) => Sale[];
  getDailySales: (days: number, businessId?: string, staffId?: string) => Array<{ date: string; sales: number; revenue: number; customers: number }>;
  getBestSellingProducts: (limit?: number, businessId?: string, staffId?: string) => Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  // ═══════════════════════════════════════════════════════════════════
  // ENTERPRISE ANALYTICS - Branch & Staff Performance
  // ═══════════════════════════════════════════════════════════════════
  getSalesByBranch: (businessId: string) => Map<string, { branchId: string; salesCount: number; revenue: number; customers: number; productsSold: number }>;
  getSalesByStaff: (businessId: string, branchId?: string) => Map<string, { staffId: string; staffName: string; staffRole: string; salesCount: number; revenue: number; customers: number; averageSale: number }>;
  getBranchPerformance: (businessId: string, days?: number) => Array<{ branchId: string; salesCount: number; revenue: number; customers: number; productsSold: number; revenueShare: number }>;
  getStaffPerformance: (businessId: string, branchId?: string, days?: number) => Array<{ staffId: string; staffName: string; staffRole: string; branchId: string; salesCount: number; revenue: number; customers: number; averageSale: number }>;
  getTopPerformers: (businessId: string, limit?: number) => { branches: Array<{ branchId: string; revenue: number; salesCount: number }>; staff: Array<{ staffId: string; staffName: string; revenue: number; salesCount: number }> };
  // ═══════════════════════════════════════════════════════════════════
  // PROFIT ANALYTICS - COGS & Gross Profit Calculation
  // ═══════════════════════════════════════════════════════════════════
  getTotalCOGS: (businessId?: string, staffId?: string) => number;
  getTotalGrossProfit: (businessId?: string, staffId?: string) => number;
  getGrossProfitMargin: (businessId?: string, staffId?: string) => number;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════
// SALES PROVIDER - Single Source of Truth for All Sales Data
// ══════════════════════════════════════════════════════════════════

const STORAGE_KEY = "pos_sales_history";

export function SalesProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<Sale[]>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((s: Sale) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }));
      }
    } catch (error) {
      console.error("Failed to load sales from localStorage:", error);
    }
    return [];
  });

  // Persist to localStorage whenever sales change
  const updateSales = (newSales: Sale[]) => {
    setSales(newSales);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSales));
    } catch (error) {
      console.error("Failed to save sales to localStorage:", error);
    }
  };

  // ───────────────────────────────────────────────────────────────
  // CORE: Record New Sale (Called from POS Checkout)
  // ───────────────────────────────────────────────────────────────
  const recordSale = (saleData: Omit<Sale, "id" | "timestamp">) => {
    const newSale: Sale = {
      ...saleData,
      id: `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    updateSales([...sales, newSale]);
  };

  // ───────────────────────────────────────────────────────────────
  // CORE: Add Sale Directly (For Seeding Historical Data)
  // ───────────────────────────────────────────────────────────────
  const addSaleDirectly = (sale: Sale) => {
    updateSales([...sales, sale]);
  };

  // ───────────────────────────────────────────────────────────────
  // FILTER: Get Sales for a Specific Business
  // ───────────────────────────────────────────────────────────────
  const getSalesForBusiness = (businessId: string): Sale[] => {
    return sales.filter((sale) => sale.businessId === businessId);
  };

  // ───────────────────────────────────────────────────────────────
  // FILTER: Get Sales for a Specific Staff Member
  // ───────────────────────────────────────────────────────────────
  const getSalesForStaff = (staffId: string): Sale[] => {
    return sales.filter((sale) => sale.staffId === staffId);
  };

  // ───────────────────────────────────────────────────────────────
  // HELPER: Filter sales by business and staff
  // ───────────────────────────────────────────────────────────────
  const filterSales = (businessId?: string, staffId?: string, branchId?: string): Sale[] => {
    let filtered = sales;
    
    if (businessId) {
      filtered = filtered.filter((sale) => sale.businessId === businessId);
    }
    
    if (staffId) {
      filtered = filtered.filter((sale) => sale.staffId === staffId);
    }
    
    if (branchId) {
      filtered = filtered.filter((sale) => sale.branchId === branchId);
    }
    
    return filtered;
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Get Today's Sales
  // ───────────────────────────────────────────────────────────────
  const getSalesToday = (businessId?: string, staffId?: string, branchId?: string): Sale[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return filterSales(businessId, staffId, branchId).filter((sale) => {
      const saleDate = new Date(sale.timestamp);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime();
    });
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Total Revenue (All Time)
  // ──────────────────────────────────────────────────────────────
  const getTotalRevenue = (businessId?: string, staffId?: string, branchId?: string): number => {
    return filterSales(businessId, staffId, branchId).reduce((sum, sale) => sum + sale.total, 0);
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Total Revenue Today
  // ───────────────────────────────────────────────────────────────
  const getTotalRevenueToday = (businessId?: string, staffId?: string, branchId?: string): number => {
    const todaySales = getSalesToday(businessId, staffId, branchId);
    return todaySales.reduce((sum, sale) => sum + sale.total, 0);
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Total Customers Today
  // ───────────────────────────────────────────────────────────────
  const getTotalCustomersToday = (businessId?: string, staffId?: string, branchId?: string): number => {
    const todaySales = getSalesToday(businessId, staffId, branchId);
    return todaySales.reduce((sum, sale) => sum + sale.customerCount, 0);
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Sales Grouped by Product
  // ───────────────────────────────────────────────────────────────
  const getSalesByProduct = (businessId?: string, staffId?: string): Map<string, { name: string; quantity: number; revenue: number }> => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    filterSales(businessId, staffId).forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.totalPrice;
        } else {
          productMap.set(item.productId, {
            name: item.productName,
            quantity: item.quantity,
            revenue: item.totalPrice,
          });
        }
      });
    });

    return productMap;
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Sales by Date Range
  // ───────────────────────────────────────────────────────────────
  const getSalesByDate = (startDate: Date, endDate: Date, businessId?: string, staffId?: string): Sale[] => {
    return filterSales(businessId, staffId).filter((sale) => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= startDate && saleDate <= endDate;
    });
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Daily Sales Summary (Last N Days)
  // ───────────────────────────────────────────────────────────────
  const getDailySales = (days: number, businessId?: string, staffId?: string): Array<{ date: string; sales: number; revenue: number; customers: number }> => {
    const result: Array<{ date: string; sales: number; revenue: number; customers: number }> = [];
    const today = new Date();
    const filteredSales = filterSales(businessId, staffId);

    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);

      const daySales = filteredSales.filter((sale) => {
        const saleDate = new Date(sale.timestamp);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === targetDate.getTime();
      });

      result.push({
        date: targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sales: daySales.length,
        revenue: daySales.reduce((sum, sale) => sum + sale.total, 0),
        customers: daySales.reduce((sum, sale) => sum + sale.customerCount, 0),
      });
    }

    return result;
  };

  // ───────────────────────────────────────────────────────────────
  // ANALYTICS: Best Selling Products
  // ───────────────────────────────────────────────────────────────
  const getBestSellingProducts = (limit = 10, businessId?: string, staffId?: string): Array<{ productId: string; name: string; quantity: number; revenue: number }> => {
    const productMap = getSalesByProduct(businessId, staffId);
    const products = Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      ...data,
    }));

    return products
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  };

  // ───────────────────────────────────────────────────────────────
  // ENTERPRISE ANALYTICS: Sales by Branch
  // ───────────────────────────────────────────────────────────────
  const getSalesByBranch = (businessId: string): Map<string, { branchId: string; salesCount: number; revenue: number; customers: number; productsSold: number }> => {
    const branchMap = new Map<string, { branchId: string; salesCount: number; revenue: number; customers: number; productsSold: number }>();

    filterSales(businessId).forEach((sale) => {
      const existing = branchMap.get(sale.branchId);
      if (existing) {
        existing.salesCount += 1;
        existing.revenue += sale.total;
        existing.customers += sale.customerCount;
        existing.productsSold += sale.items.reduce((sum, item) => sum + item.quantity, 0);
      } else {
        branchMap.set(sale.branchId, {
          branchId: sale.branchId,
          salesCount: 1,
          revenue: sale.total,
          customers: sale.customerCount,
          productsSold: sale.items.reduce((sum, item) => sum + item.quantity, 0),
        });
      }
    });

    return branchMap;
  };

  // ───────────────────────────────────────────────────────────────
  // ENTERPRISE ANALYTICS: Sales by Staff
  // ───────────────────────────────────────────────────────────────
  const getSalesByStaff = (businessId: string, branchId?: string): Map<string, { staffId: string; staffName: string; staffRole: string; salesCount: number; revenue: number; customers: number; averageSale: number }> => {
    const staffMap = new Map<string, { staffId: string; staffName: string; staffRole: string; salesCount: number; revenue: number; customers: number; averageSale: number }>();

    filterSales(businessId, undefined, branchId).forEach((sale) => {
      const existing = staffMap.get(sale.staffId);
      if (existing) {
        existing.salesCount += 1;
        existing.revenue += sale.total;
        existing.customers += sale.customerCount;
        existing.averageSale = existing.revenue / existing.salesCount;
      } else {
        staffMap.set(sale.staffId, {
          staffId: sale.staffId,
          staffName: sale.staffName,
          staffRole: sale.staffRole,
          salesCount: 1,
          revenue: sale.total,
          customers: sale.customerCount,
          averageSale: sale.total,
        });
      }
    });

    return staffMap;
  };

  // ───────────────────────────────────────────────────────────────
  // ENTERPRISE ANALYTICS: Branch Performance
  // ───────────────────────────────────────────────────────────────
  const getBranchPerformance = (businessId: string, days?: number): Array<{ branchId: string; salesCount: number; revenue: number; customers: number; productsSold: number; revenueShare: number }> => {
    let salesToAnalyze = filterSales(businessId);
    
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      salesToAnalyze = salesToAnalyze.filter(sale => new Date(sale.timestamp) >= cutoffDate);
    }
    
    const branchMap = new Map<string, { branchId: string; salesCount: number; revenue: number; customers: number; productsSold: number }>();
    
    salesToAnalyze.forEach((sale) => {
      const existing = branchMap.get(sale.branchId);
      if (existing) {
        existing.salesCount += 1;
        existing.revenue += sale.total;
        existing.customers += sale.customerCount;
        existing.productsSold += sale.items.reduce((sum, item) => sum + item.quantity, 0);
      } else {
        branchMap.set(sale.branchId, {
          branchId: sale.branchId,
          salesCount: 1,
          revenue: sale.total,
          customers: sale.customerCount,
          productsSold: sale.items.reduce((sum, item) => sum + item.quantity, 0),
        });
      }
    });
    
    const totalRevenue = Array.from(branchMap.values()).reduce((sum, data) => sum + data.revenue, 0);
    
    return Array.from(branchMap.values()).map(data => ({
      ...data,
      revenueShare: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  };

  // ───────────────────────────────────────────────────────────────
  // ENTERPRISE ANALYTICS: Staff Performance
  // ──────────────────────────────────────────────────────────────
  const getStaffPerformance = (businessId: string, branchId?: string, days?: number): Array<{ staffId: string; staffName: string; staffRole: string; branchId: string; salesCount: number; revenue: number; customers: number; averageSale: number }> => {
    let salesToAnalyze = filterSales(businessId, undefined, branchId);
    
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      salesToAnalyze = salesToAnalyze.filter(sale => new Date(sale.timestamp) >= cutoffDate);
    }
    
    const staffMap = new Map<string, { staffId: string; staffName: string; staffRole: string; branchId: string; salesCount: number; revenue: number; customers: number; averageSale: number }>();

    salesToAnalyze.forEach((sale) => {
      const existing = staffMap.get(sale.staffId);
      if (existing) {
        existing.salesCount += 1;
        existing.revenue += sale.total;
        existing.customers += sale.customerCount;
        existing.averageSale = existing.revenue / existing.salesCount;
      } else {
        staffMap.set(sale.staffId, {
          staffId: sale.staffId,
          staffName: sale.staffName,
          staffRole: sale.staffRole,
          branchId: sale.branchId,
          salesCount: 1,
          revenue: sale.total,
          customers: sale.customerCount,
          averageSale: sale.total,
        });
      }
    });

    return Array.from(staffMap.values()).sort((a, b) => b.revenue - a.revenue);
  };

  // ──────────────────────────────────────────────────────────────
  // ENTERPRISE ANALYTICS: Top Performers
  // ───────────────────────────────────────────────────────────────
  const getTopPerformers = (businessId: string, limit?: number): { branches: Array<{ branchId: string; revenue: number; salesCount: number }>; staff: Array<{ staffId: string; staffName: string; revenue: number; salesCount: number }> } => {
    const branchPerformance = getBranchPerformance(businessId);
    const staffPerformance = getStaffPerformance(businessId);

    const topBranches = branchPerformance
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    const topStaff = staffPerformance
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return {
      branches: topBranches.map((branch) => ({
        branchId: branch.branchId,
        revenue: branch.revenue,
        salesCount: branch.salesCount,
      })),
      staff: topStaff.map((staff) => ({
        staffId: staff.staffId,
        staffName: staff.staffName,
        revenue: staff.revenue,
        salesCount: staff.salesCount,
      })),
    };
  };

  // ───────────────────────────────────────────────────────────────
  // PROFIT ANALYTICS: Total COGS (Cost of Goods Sold)
  // ───────────────────────────────────────────────────────────────
  const getTotalCOGS = (businessId?: string, staffId?: string): number => {
    return filterSales(businessId, staffId).reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
      }, 0);
    }, 0);
  };

  // ───────────────────────────────────────────────────────────────
  // PROFIT ANALYTICS: Total Gross Profit
  // ───────────────────────────────────────────────────────────────
  const getTotalGrossProfit = (businessId?: string, staffId?: string): number => {
    const totalRevenue = getTotalRevenue(businessId, staffId);
    const totalCOGS = getTotalCOGS(businessId, staffId);
    return totalRevenue - totalCOGS;
  };

  // ───────────────────────────────────────────────────────────────
  // PROFIT ANALYTICS: Gross Profit Margin
  // ───────────────────────────────────────────────────────────────
  const getGrossProfitMargin = (businessId?: string, staffId?: string): number => {
    const totalRevenue = getTotalRevenue(businessId, staffId);
    const totalGrossProfit = getTotalGrossProfit(businessId, staffId);
    return totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  };

  return (
    <SalesContext.Provider
      value={{
        sales,
        recordSale,
        addSaleDirectly,
        getSalesForBusiness,
        getSalesForStaff,
        getSalesToday,
        getTotalRevenue,
        getTotalRevenueToday,
        getTotalCustomersToday,
        getSalesByProduct,
        getSalesByDate,
        getDailySales,
        getBestSellingProducts,
        getSalesByBranch,
        getSalesByStaff,
        getBranchPerformance,
        getStaffPerformance,
        getTopPerformers,
        getTotalCOGS,
        getTotalGrossProfit,
        getGrossProfitMargin,
      }}
    >
      {children}
    </SalesContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOOK: Use Sales Context
// ═══════════════════════════════════════════════════════════════════

export function useSales() {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error("useSales must be used within a SalesProvider");
  }
  return context;
}