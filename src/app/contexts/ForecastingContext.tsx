import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./AuthContext";

export interface LeadTimeConfig {
  id: string;
  businessId: string;
  type: "product" | "supplier";
  productId?: string;
  supplierId?: string;
  leadTimeDays: number;
  createdByStaffId: string;
  createdByStaffName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForecastingConfig {
  id?: string;
  businessId: string;
  defaultSalesPeriodDays: number;
  defaultReorderCycleDays: number;
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
  averageDailySales: number;
  leadTimeDays: number;
  reorderPoint: number;
  suggestedReorderQuantity: number;
  estimatedReorderCost: number;
  status: StockStatus;
  daysUntilStockout: number | null;
  supplierId?: string;
  supplierName?: string;
  costPrice: number;
}

interface ForecastingContextType {
  leadTimeConfigs: LeadTimeConfig[];
  forecastingConfig: ForecastingConfig | null;
  setLeadTime: (type: "product" | "supplier", id: string, leadTimeDays: number) => Promise<void>;
  getLeadTime: (productId: string, supplierId?: string) => number;
  updateForecastingConfig: (config: Partial<ForecastingConfig>) => Promise<void>;
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
  error: any;
}

export const ForecastingContext = createContext<ForecastingContextType | undefined>(undefined);

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

  const [leadTimeConfigs, setLeadTimeConfigs] = useState<LeadTimeConfig[]>([]);
  const [forecastingConfig, setForecastingConfigState] = useState<ForecastingConfig | null>(null);
  const [error, setError] = useState<any>(null);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH DATA FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (business) {
      fetchData();
    } else {
      setLeadTimeConfigs([]);
      setForecastingConfigState(null);
    }
  }, [business?.id]);

  const fetchData = async () => {
    if (!business) return;
    setError(null);

    try {
      // Fetch Forecasting Config
      const { data: configData, error: configError } = await supabase
        .from('forecasting_configs')
        .select('*')
        .eq('business_id', business.id)
        .maybeSingle();

      if (configError) {
        // If 406/PGRST116 (Not Found) just ignore, otherwise report
        if (configError.code !== 'PGRST116' && configError.code !== '406') {
             console.error("Error fetching forecasting config:", configError);
             // Report missing table if applicable
             if (['PGRST205', '42P01'].includes(configError.code)) setError(configError);
        }
      } else if (configData) {
        setForecastingConfigState({
          id: configData.id,
          businessId: configData.business_id,
          defaultSalesPeriodDays: configData.default_sales_period_days,
          defaultReorderCycleDays: configData.default_reorder_cycle_days,
          updatedAt: configData.updated_at
        });
      } else {
        // Create default if not exists
        const defaultConfig = {
          business_id: business.id,
          default_sales_period_days: 30,
          default_reorder_cycle_days: 14,
          updated_at: new Date().toISOString()
        };
        const { data: newConfig, error: createError } = await supabase
            .from('forecasting_configs')
            .insert(defaultConfig)
            .select()
            .single();
            
        if (!createError && newConfig) {
             setForecastingConfigState({
                id: newConfig.id,
                businessId: newConfig.business_id,
                defaultSalesPeriodDays: newConfig.default_sales_period_days,
                defaultReorderCycleDays: newConfig.default_reorder_cycle_days,
                updatedAt: newConfig.updated_at
             });
        }
      }

      // Fetch Lead Time Configs
      const { data: leadData, error: leadError } = await supabase
        .from('lead_time_configs')
        .select('*')
        .eq('business_id', business.id);

      if (leadError) {
         console.error("Error fetching lead time configs:", leadError);
         if (['PGRST205', '42P01'].includes(leadError.code)) setError(leadError);
      } else if (leadData) {
        setLeadTimeConfigs(leadData.map((d: any) => ({
          id: d.id,
          businessId: d.business_id,
          type: d.type,
          productId: d.product_id,
          supplierId: d.supplier_id,
          leadTimeDays: d.lead_time_days,
          createdByStaffId: d.created_by_staff_id,
          createdByStaffName: d.created_by_staff_name,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        })));
      }

    } catch (err: any) {
      console.error("Unexpected error in forecasting context:", err);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // SET LEAD TIME (Business Owner only)
  // ═══════════════════════════════════════════════════════════════════
  const setLeadTime = async (type: "product" | "supplier", id: string, leadTimeDays: number) => {
    if (!business || !user) return;
    if (user.role !== "Business Owner") return;

    const timestamp = new Date().toISOString();

    // Upsert logic
    // We need to know if we are updating or inserting.
    // Since we don't have a unique constraint on (business_id, type, product_id/supplier_id) explicitly known here (though likely exists),
    // we will check existing state or use upsert if we had an ID.
    
    // Find existing in local state to get ID if possible
    const existing = leadTimeConfigs.find(config =>
      config.businessId === business.id &&
      config.type === type &&
      (type === "product" ? config.productId === id : config.supplierId === id)
    );

    try {
        if (existing) {
            const { error } = await supabase
                .from('lead_time_configs')
                .update({ 
                    lead_time_days: leadTimeDays,
                    updated_at: timestamp,
                    created_by_staff_id: user.id,
                    created_by_staff_name: `${user.firstName} ${user.lastName}`
                })
                .eq('id', existing.id);
                
            if (error) throw error;
        } else {
            const newConfig = {
                business_id: business.id,
                type,
                product_id: type === "product" ? id : null,
                supplier_id: type === "supplier" ? id : null,
                lead_time_days: leadTimeDays,
                created_by_staff_id: user.id,
                created_by_staff_name: `${user.firstName} ${user.lastName}`,
                created_at: timestamp,
                updated_at: timestamp
            };
            const { error } = await supabase
                .from('lead_time_configs')
                .insert(newConfig);
                
            if (error) throw error;
        }
        
        await fetchData(); // Refresh
    } catch (err) {
        console.error("Error setting lead time:", err);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // GET LEAD TIME (product-specific takes precedence over supplier)
  // ════════════════════════���══════════════════════════════════════════
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
  const updateForecastingConfig = async (updates: Partial<ForecastingConfig>) => {
    if (!business || !user) return;
    if (user.role !== "Business Owner") return;

    try {
        const dbUpdates: any = {
            updated_at: new Date().toISOString()
        };
        if (updates.defaultSalesPeriodDays !== undefined) dbUpdates.default_sales_period_days = updates.defaultSalesPeriodDays;
        if (updates.defaultReorderCycleDays !== undefined) dbUpdates.default_reorder_cycle_days = updates.defaultReorderCycleDays;

        // Check if config exists (it should, created on fetch)
        if (forecastingConfig?.id) {
             const { error } = await supabase
                .from('forecasting_configs')
                .update(dbUpdates)
                .eq('id', forecastingConfig.id);
             if (error) throw error;
        } else {
             // Fallback create
             const { error } = await supabase
                .from('forecasting_configs')
                .insert({
                    business_id: business.id,
                    ...dbUpdates
                });
             if (error) throw error;
        }
        await fetchData();
    } catch (err) {
        console.error("Error updating forecasting config:", err);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATE AVERAGE DAILY SALES
  // ═══════════════════════════════════════════════════════════════════
  const calculateAverageDailySales = (
    productId: string,
    branchId: string,
    periodDays: number
  ): number => {
    // This is a placeholder. 
    // In a real implementation, we would query the SalesContext or Supabase aggregated sales.
    // For now, we return a mock or 0, as we don't have direct access to sales here without circular dependency if we import SalesContext.
    // Ideally, this calculation should happen in a hook that composes both contexts.
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
        getStockStatus,
        error
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
