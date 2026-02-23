import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════
// SALES DATA MODEL
// ═══════════════════════════════════════════════════════════════════

export interface SaleItem {
  id?: string; // Optional for new items
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  priceType?: "retail" | "wholesale";
  costPrice?: number;
}

export interface Sale {
  id: string;
  timestamp: Date;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  customerCount: number;
  businessId: string;
  branchId: string;
  staffId: string;
  staffRole: string;
  staffName: string;
  customerName?: string;
  paymentMethod?: string;
  readableId?: number; // Sequential ID
}

interface SalesContextType {
  sales: Sale[];
  loading: boolean;
  recordSale: (sale: Omit<Sale, "id" | "timestamp">) => Promise<{ success: boolean; error?: string; saleId?: string; readableId?: number }>;
  addSaleDirectly: (sale: Sale) => Promise<void>; // Kept for interface compatibility
  
  // Filtered queries
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
  
  // Analytics
  getSalesByBranch: (businessId: string) => Map<string, { branchId: string; salesCount: number; revenue: number; customers: number; productsSold: number }>;
  getSalesByStaff: (businessId: string, branchId?: string) => Map<string, { staffId: string; staffName: string; staffRole: string; salesCount: number; revenue: number; customers: number; averageSale: number }>;
  getBranchPerformance: (businessId: string, days?: number) => Array<{ branchId: string; salesCount: number; revenue: number; customers: number; productsSold: number; revenueShare: number }>;
  getStaffPerformance: (businessId: string, branchId?: string, days?: number) => Array<{ staffId: string; staffName: string; staffRole: string; branchId: string; salesCount: number; revenue: number; customers: number; averageSale: number }>;
  getTopPerformers: (businessId: string, limit?: number) => { branches: Array<{ branchId: string; revenue: number; salesCount: number }>; staff: Array<{ staffId: string; staffName: string; revenue: number; salesCount: number }> };
  
  // Profit
  getTotalCOGS: (businessId?: string, staffId?: string) => number;
  getTotalGrossProfit: (businessId?: string, staffId?: string) => number;
  getGrossProfitMargin: (businessId?: string, staffId?: string) => number;
  
  refreshSales: () => Promise<void>;
  error: any;
}

export const SalesContext = createContext<SalesContextType | undefined>(undefined);

export function SalesProvider({ children }: { children: ReactNode }) {
  // Safe context access
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn("SalesProvider: AuthContext not available", e);
  }
  
  const business = authContext?.business || null;
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH SALES FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  const refreshSales = async () => {
    if (!business) {
      setSales([]);
      setLoading(false);
      return;
    }

    // Guard: Prevent query if ID is not a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(business.id);
    if (!isUuid) {
      setSales([]);
      setLoading(false);
      return;
    }

    setError(null);

    try {
      // 1. Fetch Sales Header
      // Explicitly select readable_id to trigger SchemaError if missing
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*, readable_id')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // 2. Fetch Sales Items
      // Optimization: In a real app, we might use a join query or load items on demand, 
      // but for this dashboard we need them for analytics.
      const { data: itemsData, error: itemsError } = await supabase
        .from('sales_items')
        .select('*')
        .eq('business_id', business.id);

      if (itemsError) throw itemsError;

      if (salesData && itemsData) {
        // Map items by sale_id for faster lookup
        const itemsMap = new Map<string, SaleItem[]>();
        
        itemsData.forEach((item: any) => {
          const saleId = item.sale_id;
          const mappedItem: SaleItem = {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            totalPrice: Number(item.total_price),
            priceType: item.price_type,
            costPrice: item.cost_price ? Number(item.cost_price) : undefined
          };
          
          if (!itemsMap.has(saleId)) {
            itemsMap.set(saleId, []);
          }
          itemsMap.get(saleId)?.push(mappedItem);
        });

        // Map sales
        const mappedSales: Sale[] = salesData.map((s: any) => ({
          id: s.id,
          timestamp: new Date(s.created_at),
          items: itemsMap.get(s.id) || [],
          subtotal: Number(s.subtotal),
          tax: Number(s.tax),
          total: Number(s.total),
          customerCount: Number(s.customer_count || 1),
          businessId: s.business_id,
          branchId: s.branch_id,
          staffId: s.staff_id,
          staffRole: s.staff_role,
          staffName: s.staff_name,
          customerName: s.customer_name,
          paymentMethod: s.payment_method,
          readableId: s.readable_id
        }));

        setSales(mappedSales);
      }
    } catch (err: any) {
      console.error("Error fetching sales:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business) {
      refreshSales();
    } else {
      setSales([]);
    }
  }, [business?.id]);

  // ───────────────────────────────────────────────────────────────
  // RECORD NEW SALE
  // ───────────────────────────────────────────────────────────────
  const recordSale = async (saleData: Omit<Sale, "id" | "timestamp">): Promise<{ success: boolean; error?: string; saleId?: string }> => {
    if (!business) return { success: false, error: "Not authenticated" };

    try {
      // 1. Insert Sale Header
      const saleRecord = {
        business_id: business.id,
        branch_id: saleData.branchId,
        staff_id: saleData.staffId,
        staff_role: saleData.staffRole,
        staff_name: saleData.staffName,
        customer_name: saleData.customerName,
        customer_count: saleData.customerCount,
        subtotal: saleData.subtotal,
        tax: saleData.tax,
        total: saleData.total,
        payment_method: saleData.paymentMethod || "Cash",
        created_at: new Date().toISOString()
      };

      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert(saleRecord)
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Insert Sale Items
      if (saleData.items.length > 0) {
        const itemsRecords = saleData.items.map(item => ({
          sale_id: newSale.id,
          business_id: business.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          price_type: item.priceType,
          cost_price: item.costPrice
        }));

        const { error: itemsError } = await supabase
          .from('sales_items')
          .insert(itemsRecords);

        if (itemsError) {
          // Compensating transaction: Delete the sale if items fail?
          // For now, just log and throw. 
          // Ideally we use RPC for transaction, but client-side is fine for MVP.
          console.error("Failed to insert items:", itemsError);
          throw itemsError;
        }
      }

      // 3. Update Inventory (Deduct Stock)
      // This is handled via InventoryContext or trigger? 
      // Ideally trigger, but if not present, we should update here?
      // InventoryContext logic typically handles stock deduction.
      // Assuming InventoryContext.deductMultipleStock is called by the component *before* or *after* recording sale?
      // Usually, the POS component calls both. 
      // We will assume this context just records the sale history.

      await refreshSales();
      return { success: true, saleId: newSale.id, readableId: newSale.readable_id };

    } catch (err: any) {
      console.error("Error recording sale:", err);
      // Check for schema errors
       if (['PGRST205', 'PGRST204', '42703', '23502', '22P02', '42P01'].includes(err.code)) {
          setError(err);
      }
      return { success: false, error: err.message };
    }
  };

  const addSaleDirectly = async (sale: Sale) => {
    // Only for compatibility, delegates to recordSale
    await recordSale(sale);
  };

  // ═══════════════════════════════════════════════════════════════════
  // ANALYTICS & HELPERS (Same logic as before, but on fetched data)
  // ═══════════════════════════════════════════════════════════════════
  
  const filterSales = (businessId?: string, staffId?: string, branchId?: string): Sale[] => {
    let filtered = sales;
    if (businessId) filtered = filtered.filter((sale) => sale.businessId === businessId);
    if (staffId) filtered = filtered.filter((sale) => sale.staffId === staffId);
    if (branchId) filtered = filtered.filter((sale) => sale.branchId === branchId);
    return filtered;
  };

  const getSalesForBusiness = (businessId: string) => sales.filter((s) => s.businessId === businessId);
  const getSalesForStaff = (staffId: string) => sales.filter((s) => s.staffId === staffId);

  const getSalesToday = (businessId?: string, staffId?: string, branchId?: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filterSales(businessId, staffId, branchId).filter((sale) => {
      const saleDate = new Date(sale.timestamp);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime();
    });
  };

  const getTotalRevenue = (businessId?: string, staffId?: string, branchId?: string) => 
    filterSales(businessId, staffId, branchId).reduce((sum, sale) => sum + sale.total, 0);

  const getTotalRevenueToday = (businessId?: string, staffId?: string, branchId?: string) => 
    getSalesToday(businessId, staffId, branchId).reduce((sum, sale) => sum + sale.total, 0);

  const getTotalCustomersToday = (businessId?: string, staffId?: string, branchId?: string) => 
    getSalesToday(businessId, staffId, branchId).reduce((sum, sale) => sum + sale.customerCount, 0);

  const getSalesByProduct = (businessId?: string, staffId?: string) => {
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

  const getSalesByDate = (startDate: Date, endDate: Date, businessId?: string, staffId?: string) => {
    return filterSales(businessId, staffId).filter((sale) => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= startDate && saleDate <= endDate;
    });
  };

  const getDailySales = (days: number, businessId?: string, staffId?: string) => {
    const result = [];
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

  const getBestSellingProducts = (limit = 10, businessId?: string, staffId?: string) => {
    const productMap = getSalesByProduct(businessId, staffId);
    return Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  };

  const getSalesByBranch = (businessId: string) => {
    const branchMap = new Map<string, { branchId: string; salesCount: number; revenue: number; customers: number; productsSold: number }>();
    filterSales(businessId).forEach((sale) => {
      // ═══════════════════════════════════════════════════════════════════
      // FIX: Guard against undefined/null branchId
      // ═══════════════════════════════════════════════════════════════════
      // Skip sales that somehow have no branchId (legacy data or error)
      if (!sale.branchId) return;

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

  const getSalesByStaff = (businessId: string, branchId?: string) => {
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

  const getBranchPerformance = (businessId: string, days?: number) => {
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

  const getStaffPerformance = (businessId: string, branchId?: string, days?: number) => {
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

  const getTopPerformers = (businessId: string, limit?: number) => {
    const branchPerformance = getBranchPerformance(businessId);
    const staffPerformance = getStaffPerformance(businessId);
    return {
      branches: branchPerformance.sort((a, b) => b.revenue - a.revenue).slice(0, limit).map(b => ({ branchId: b.branchId, revenue: b.revenue, salesCount: b.salesCount })),
      staff: staffPerformance.sort((a, b) => b.revenue - a.revenue).slice(0, limit).map(s => ({ staffId: s.staffId, staffName: s.staffName, revenue: s.revenue, salesCount: s.salesCount })),
    };
  };

  const getTotalCOGS = (businessId?: string, staffId?: string) => {
    return filterSales(businessId, staffId).reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
      }, 0);
    }, 0);
  };

  const getTotalGrossProfit = (businessId?: string, staffId?: string) => {
    const totalRevenue = getTotalRevenue(businessId, staffId);
    const totalCOGS = getTotalCOGS(businessId, staffId);
    return totalRevenue - totalCOGS;
  };

  const getGrossProfitMargin = (businessId?: string, staffId?: string) => {
    const totalRevenue = getTotalRevenue(businessId, staffId);
    const totalGrossProfit = getTotalGrossProfit(businessId, staffId);
    return totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  };

  return (
    <SalesContext.Provider
      value={{
        sales,
        loading,
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
        refreshSales,
        error
      }}
    >
      {children}
    </SalesContext.Provider>
  );
}

export function useSales() {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error("useSales must be used within a SalesProvider");
  }
  return context;
}
