import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface KPIData {
  todayCustomers: number;
  todaySales: number;
}

interface KPIContextType {
  kpiData: KPIData;
  updateKPIs: (customers: number, sales: number) => void;
  setKPIData: (data: KPIData) => void;
  triggerKPIUpdate: () => void;
  kpiUpdated: boolean;
}

export const KPIContext = createContext<KPIContextType | undefined>(undefined);

export function KPIProvider({ children }: { children: ReactNode }) {
  const [kpiData, setKpiData] = useState<KPIData>({
    todayCustomers: 0,
    todaySales: 0
  });
  const [kpiUpdated, setKpiUpdated] = useState(false);

  const triggerKPIUpdate = useCallback(() => {
    setKpiUpdated(true);
    setTimeout(() => setKpiUpdated(false), 1200);
  }, []);

  const updateKPIs = useCallback((customers: number, sales: number) => {
    setKpiData(prev => ({
      todayCustomers: prev.todayCustomers + customers,
      todaySales: prev.todaySales + sales
    }));
    triggerKPIUpdate();
  }, [triggerKPIUpdate]);

  const setKPIDataCallback = useCallback((data: KPIData) => {
    setKpiData(data);
    triggerKPIUpdate();
  }, [triggerKPIUpdate]);

  return (
    <KPIContext.Provider value={{ kpiData, updateKPIs, setKPIData: setKPIDataCallback, triggerKPIUpdate, kpiUpdated }}>
      {children}
    </KPIContext.Provider>
  );
}

export function useKPI() {
  const context = useContext(KPIContext);
  if (context === undefined) {
    throw new Error("useKPI must be used within a KPIProvider");
  }
  return context;
}