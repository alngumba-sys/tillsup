import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORECASTING CONTEXT - INVENTORY INTELLIGENCE & REORDER PREDICTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Predict WHEN and HOW MUCH to reorder per product per branch
 * - Calculate reorder points based on historical sales
 * - Provide intelligent procurement recommendations
 * - Support data-driven inventory decisions
 * 
 * CRITICAL PRINCIPLE:
 * FORECASTING = SUGGESTION, NOT ACTION
 * 
 * This system provides READ-ONLY intelligence.
 * It does NOT:
 * - Modify inventory stock
 * - Auto-create purchase orders
 * - Affect POS or sales
 * - Send automatic supplier requests
 * 
 * CALCULATION METHODOLOGY:
 * 
 * 1. Average Daily Sales (ADS):
 *    ADS = Total Qty Sold in Period ÷ Days in Period
 * 
 * 2. Reorder Point (ROP):
 *    ROP = Average Daily Sales × Lead Time (days)
 * 
 * 3. Suggested Reorder Quantity:
 *    ROQ = (ADS × Reorder Cycle Days) - Current Stock
 * 
 * 4. Stock Status:
 *    - OK: Current Stock > ROP × 1.5
 *    - Reorder Soon: ROP < Current Stock ≤ ROP × 1.5
 *    - Urgent: Current Stock ≤ ROP
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface LeadTimeConfig {
  id: string;
  businessId: string;
  type: "product" | "supplier"; // Lead time per product or supplier
  productId?: string; // If type = "product"
  supplierId?: string; // If type = "supplier"
  leadTimeDays: number; // How many days supplier takes to deliver
  createdByStaffId: string;
  createdByStaffName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForecastingConfig {
  businessId: string;
  defaultSalesPeriodDays: number; // Default: 30 days
  defaultReorderCycleDays: number; // Default: 14 days
  updatedAt: string;
}

export type StockStatus = "OK" | "Reorder Soon" | "Urgent";

export interface ProductForecast {
  productId: string;
  productName: string;
  productSKU: string;
  branchId: string;
  branchName: string;
  currentStock: number;
  averageDailySales: number; // Calculated from sales history
  leadTimeDays: number;
  reorderPoint: number; // ADS × Lead Time
  suggestedReorderQuantity: number; // (ADS × cycle) - current stock
  estimatedReorderCost: number; // suggestedReorderQuantity * costPrice
  status: StockStatus;
  daysUntilStockout: number | null; // Current stock ÷ ADS (if > 0)
  supplierId?: string;
  supplierName?: string;
  costPrice: number;
}

interface ForecastingContextType {
  leadTimeConfigs: LeadTimeConfig[];
  forecastingConfig: ForecastingConfig | null;
  setLeadTime: (type: "product" | "supplier", id: string, leadTimeDays: number) => void;
  getLeadTime: (productId: string, supplierId?: string) => number;
  updateForecastingConfig: (config: Partial<ForecastingConfig>) => void;
  calculateAverageDailySales: (productId: string, branchId: string, periodDays: number) => number;
  calculateProductForecast: (
    productId: string,
    productName: string,
    productSKU: string,
    branchId: string,
    branchName: string,
    currentStock: number,
    costPrice: number,
    periodDays: number,
    supplierId?: string,
    supplierName?: string
  ) => ProductForecast;
  getStockStatus: (currentStock: number, reorderPoint: number) => StockStatus;
}

const ForecastingContext = createContext<ForecastingContextType | undefined>(undefined);

const LEAD_TIME_STORAGE_KEY = "pos_lead_time_configs";
const FORECASTING_CONFIG_STORAGE_KEY = "pos_forecasting_config";

// Default lead time if not configured
const DEFAULT_LEAD_TIME_DAYS = 7;

export function ForecastingProvider({ children }: { children: ReactNode }) {
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    console.warn("ForecastingProvider: AuthContext not available", e);
  }
  const business = auth?.business || null;
  const user = auth?.user || null;

  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  const [leadTimeConfigs, setLeadTimeConfigs] = useState<LeadTimeConfig[]>(() => {
    try {
      const stored = localStorage.getItem(LEAD_TIME_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load lead time configs:", error);
      return [];
    }
  });

  const [forecastingConfig, setForecastingConfigState] = useState<ForecastingConfig | null>(() => {
    try {
      const stored = localStorage.getItem(FORECASTING_CONFIG_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Create default config
      if (business) {
        const defaultConfig: ForecastingConfig = {
          businessId: business.id,
          defaultSalesPeriodDays: 30,
          defaultReorderCycleDays: 14,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(FORECASTING_CONFIG_STORAGE_KEY, JSON.stringify(defaultConfig));
        return defaultConfig;
      }
      
      return null;
    } catch (error) {
      console.error("Failed to load forecasting config:", error);
      return null;
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // PERSIST TO LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      localStorage.setItem(LEAD_TIME_STORAGE_KEY, JSON.stringify(leadTimeConfigs));
    } catch (error) {
      console.error("Failed to save lead time configs:", error);
    }
  }, [leadTimeConfigs]);

  useEffect(() => {
    if (forecastingConfig) {
      try {
        localStorage.setItem(FORECASTING_CONFIG_STORAGE_KEY, JSON.stringify(forecastingConfig));
      } catch (error) {
        console.error("Failed to save forecasting config:", error);
      }
    }
  }, [forecastingConfig]);

  // ═══════════════════════════════════════════════════════════════════
  // SET LEAD TIME (Business Owner only)
  // ═══════════════════════════════════════════════════════════════════
  const setLeadTime = (type: "product" | "supplier", id: string, leadTimeDays: number) => {
    if (!business || !user) {
      console.error("Cannot set lead time: No business or user context");
      return;
    }

    if (user.role !== "Business Owner") {
      console.error("Only Business Owner can configure lead times");
      return;
    }

    const timestamp = new Date().toISOString();

    // Check if config exists
    const existingIndex = leadTimeConfigs.findIndex(config =>
      config.businessId === business.id &&
      config.type === type &&
      (type === "product" ? config.productId === id : config.supplierId === id)
    );

    if (existingIndex >= 0) {
      // Update existing
      const updated = [...leadTimeConfigs];
      updated[existingIndex] = {
        ...updated[existingIndex],
        leadTimeDays,
        updatedAt: timestamp
      };
      setLeadTimeConfigs(updated);
    } else {
      // Create new
      const newConfig: LeadTimeConfig = {
        id: `LT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        businessId: business.id,
        type,
        productId: type === "product" ? id : undefined,
        supplierId: type === "supplier" ? id : undefined,
        leadTimeDays,
        createdByStaffId: user.id,
        createdByStaffName: `${user.firstName} ${user.lastName}`,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      setLeadTimeConfigs([...leadTimeConfigs, newConfig]);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // GET LEAD TIME (product-specific takes precedence over supplier)
  // ═══════════════════════════════════════════════════════════════════
  const getLeadTime = (productId: string, supplierId?: string): number => {
    if (!business) return DEFAULT_LEAD_TIME_DAYS;

    // Try product-specific first
    const productConfig = leadTimeConfigs.find(config =>
      config.businessId === business.id &&
      config.type === "product" &&
      config.productId === productId
    );

    if (productConfig) {
      return productConfig.leadTimeDays;
    }

    // Fallback to supplier-level
    if (supplierId) {
      const supplierConfig = leadTimeConfigs.find(config =>
        config.businessId === business.id &&
        config.type === "supplier" &&
        config.supplierId === supplierId
      );

      if (supplierConfig) {
        return supplierConfig.leadTimeDays;
      }
    }

    return DEFAULT_LEAD_TIME_DAYS;
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE FORECASTING CONFIG
  // ═══════════════════════════════════════════════════════════════════
  const updateForecastingConfig = (updates: Partial<ForecastingConfig>) => {
    if (!business) return;

    if (user?.role !== "Business Owner") {
      console.error("Only Business Owner can update forecasting config");
      return;
    }

    const updated: ForecastingConfig = {
      ...(forecastingConfig || {
        businessId: business.id,
        defaultSalesPeriodDays: 30,
        defaultReorderCycleDays: 14,
        updatedAt: new Date().toISOString()
      }),
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setForecastingConfigState(updated);
  };

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATE AVERAGE DAILY SALES
  // Uses sales data from SalesContext (will be injected via hook)
  // ═══════════════════════════════════════════════════════════════════
  const calculateAverageDailySales = (
    productId: string,
    branchId: string,
    periodDays: number
  ): number => {
    // This will be implemented by a custom hook that has access to sales data
    // For now, return 0 as placeholder
    return 0;
  };

  // ═══════════════════════════════════════════════════════════════════
  // GET STOCK STATUS
  // ═══════════════════════════════════════════════════════════════════
  const getStockStatus = (currentStock: number, reorderPoint: number): StockStatus => {
    if (currentStock > reorderPoint * 1.5) {
      return "OK";
    } else if (currentStock > reorderPoint) {
      return "Reorder Soon";
    } else {
      return "Urgent";
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATE PRODUCT FORECAST
  // ═══════════════════════════════════════════════════════════════════
  const calculateProductForecast = (
    productId: string,
    productName: string,
    productSKU: string,
    branchId: string,
    branchName: string,
    currentStock: number,
    costPrice: number,
    periodDays: number,
    supplierId?: string,
    supplierName?: string
  ): ProductForecast => {
    const config = forecastingConfig || {
      businessId: business?.id || "",
      defaultSalesPeriodDays: 30,
      defaultReorderCycleDays: 14,
      updatedAt: new Date().toISOString()
    };

    // Get average daily sales (will use sales data)
    const averageDailySales = calculateAverageDailySales(productId, branchId, periodDays);

    // Get lead time
    const leadTimeDays = getLeadTime(productId, supplierId);

    // Calculate reorder point
    const reorderPoint = averageDailySales * leadTimeDays;

    // Calculate suggested reorder quantity
    const reorderCycleDays = config.defaultReorderCycleDays;
    const targetStock = averageDailySales * reorderCycleDays;
    const suggestedReorderQuantity = Math.max(0, Math.ceil(targetStock - currentStock));
    
    // Calculate estimated reorder cost
    const estimatedReorderCost = suggestedReorderQuantity * (costPrice || 0);

    // Calculate days until stockout
    const daysUntilStockout = averageDailySales > 0
      ? Math.floor(currentStock / averageDailySales)
      : null;

    // Determine status
    const status = getStockStatus(currentStock, reorderPoint);

    return {
      productId,
      productName,
      productSKU,
      branchId,
      branchName,
      currentStock,
      averageDailySales,
      leadTimeDays,
      reorderPoint,
      suggestedReorderQuantity,
      estimatedReorderCost,
      status,
      daysUntilStockout,
      supplierId,
      supplierName,
      costPrice
    };
  };

  return (
    <ForecastingContext.Provider
      value={{
        leadTimeConfigs,
        forecastingConfig,
        setLeadTime,
        getLeadTime,
        updateForecastingConfig,
        calculateAverageDailySales,
        calculateProductForecast,
        getStockStatus
      }}
    >
      {children}
    </ForecastingContext.Provider>
  );
}

export function useForecasting() {
  const context = useContext(ForecastingContext);
  if (context === undefined) {
    throw new Error("useForecasting must be used within a ForecastingProvider");
  }
  return context;
}
