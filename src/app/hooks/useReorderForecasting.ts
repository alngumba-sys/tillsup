import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSales } from "../contexts/SalesContext";
import { useInventory } from "../contexts/InventoryContext";
import { useForecasting, ProductForecast } from "../contexts/ForecastingContext";
import { useSupplier } from "../contexts/SupplierContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REORDER FORECASTING HOOK
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Combines sales data, inventory data, and forecasting logic to generate
 * intelligent reorder recommendations per product per branch.
 * 
 * READ-ONLY: Does not modify any data
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export function useReorderForecasting(branchId?: string, periodDays: number = 30) {
  const { business } = useAuth();
  const { sales } = useSales();
  const { inventory } = useInventory();
  const { suppliers } = useSupplier();
  const { calculateProductForecast, forecastingConfig } = useForecasting();

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATE AVERAGE DAILY SALES FOR A PRODUCT IN A BRANCH
  // ═══════════════════════════════════════════════════════════════════
  const calculateAverageDailySales = useMemo(() => {
    return (productId: string, targetBranchId: string, days: number): number => {
      if (!business) return 0;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Filter sales for this product, branch, and date range
      const relevantSales = sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return (
          sale.businessId === business.id &&
          sale.branchId === targetBranchId &&
          saleDate >= startDate &&
          saleDate <= endDate
        );
      });

      // Sum quantities sold for this product
      let totalQuantitySold = 0;
      relevantSales.forEach(sale => {
        sale.items.forEach(item => {
          if (item.productId === productId) {
            totalQuantitySold += item.quantity;
          }
        });
      });

      // Calculate average
      const averageDailySales = days > 0 ? totalQuantitySold / days : 0;
      
      return Math.round(averageDailySales * 100) / 100; // Round to 2 decimals
    };
  }, [sales, business]);

  // ═══════════════════════════════════════════════════════════════════
  // GENERATE FORECASTS FOR ALL PRODUCTS
  // ═══════════════════════════════════════════════════════════════════
  const forecasts = useMemo((): ProductForecast[] => {
    if (!business) return [];

    // Filter inventory by branch if specified
    let inventoryItems = inventory.filter(item => item.businessId === business.id);
    
    if (branchId) {
      inventoryItems = inventoryItems.filter(item => item.branchId === branchId);
    }

    // Generate forecast for each inventory item
    const productForecasts = inventoryItems.map(item => {
      // Calculate average daily sales
      const averageDailySales = calculateAverageDailySales(
        item.productId,
        item.branchId,
        periodDays
      );

      // Find supplier (if exists)
      const supplier = suppliers.find(s => s.id === item.supplierId);

      // Generate forecast using the context function
      const forecast = calculateProductForecast(
        item.productId,
        item.productName,
        item.sku,
        item.branchId,
        item.branchName,
        item.stock,
        item.costPrice || 0,
        periodDays,
        item.supplierId,
        supplier?.name
      );

      // Override ADS with calculated value
      return {
        ...forecast,
        averageDailySales
      };
    });

    return productForecasts;
  }, [
    business,
    inventory,
    branchId,
    periodDays,
    calculateAverageDailySales,
    calculateProductForecast,
    suppliers
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // FILTER & SORT FORECASTS
  // ═══════════════════════════════════════════════════════════════════
  const urgentForecasts = useMemo(() => {
    return forecasts.filter(f => f.status === "Urgent").sort((a, b) => {
      // Sort by days until stockout (ascending)
      if (a.daysUntilStockout === null) return 1;
      if (b.daysUntilStockout === null) return -1;
      return a.daysUntilStockout - b.daysUntilStockout;
    });
  }, [forecasts]);

  const reorderSoonForecasts = useMemo(() => {
    return forecasts.filter(f => f.status === "Reorder Soon");
  }, [forecasts]);

  const okForecasts = useMemo(() => {
    return forecasts.filter(f => f.status === "OK");
  }, [forecasts]);

  // ═══════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════
  const stats = useMemo(() => {
    return {
      totalProducts: forecasts.length,
      urgentCount: urgentForecasts.length,
      reorderSoonCount: reorderSoonForecasts.length,
      okCount: okForecasts.length,
      totalReorderQuantity: forecasts
        .filter(f => f.status === "Urgent" || f.status === "Reorder Soon")
        .reduce((sum, f) => sum + f.suggestedReorderQuantity, 0),
      totalReorderCost: forecasts
        .filter(f => f.status === "Urgent" || f.status === "Reorder Soon")
        .reduce((sum, f) => sum + (f.estimatedReorderCost || 0), 0)
    };
  }, [forecasts, urgentForecasts, reorderSoonForecasts, okForecasts]);

  // ═══════════════════════════════════════════════════════════════════
  // HIGH-VELOCITY PRODUCTS (fastest sellers)
  // ═══════════════════════════════════════════════════════════════════
  const highVelocityProducts = useMemo(() => {
    return [...forecasts]
      .filter(f => f.averageDailySales > 0)
      .sort((a, b) => b.averageDailySales - a.averageDailySales)
      .slice(0, 10);
  }, [forecasts]);

  // ═══════════════════════════════════════════════════════════════════
  // SLOW-MOVING INVENTORY (low sales but high stock)
  // ═══════════════════════════════════════════════════════════════════
  const slowMovingProducts = useMemo(() => {
    return forecasts
      .filter(f => f.averageDailySales < 0.5 && f.currentStock > 10)
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 10);
  }, [forecasts]);

  return {
    forecasts,
    urgentForecasts,
    reorderSoonForecasts,
    okForecasts,
    stats,
    highVelocityProducts,
    slowMovingProducts,
    periodDays
  };
}
