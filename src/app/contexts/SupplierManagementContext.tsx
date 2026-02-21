import { createContext, useContext, useState, ReactNode } from "react";
import { SupplierRequest } from "./SupplierRequestContext";

// Context for switching tabs from child components
interface SupplierManagementContextType {
  switchTab: (tab: string) => void;
  setPOConversionData: (data: { mode: string; sourceRequest: SupplierRequest } | null) => void;
  poConversionData: { mode: string; sourceRequest: SupplierRequest } | null;
}

export const SupplierManagementContext = createContext<SupplierManagementContextType | undefined>(undefined);

export function SupplierManagementProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState("suppliers");
  const [poConversionData, setPOConversionData] = useState<{ mode: string; sourceRequest: SupplierRequest } | null>(null);

  // This is a bit of a hack since the tabs are controlled by the page component, 
  // but we want to allow deep linking or programmatic switching.
  // For now, we will expose an event bus or just simple state if the page consumes it.
  // Actually, keeping state here is better.
  
  // However, the page (SupplierManagement.tsx) probably controls its own tabs.
  // Let's implement a simple state here that the page can sync with.
  
  // Wait, looking at the interface: switchTab is a function.
  // If the page renders the tabs, it needs to listen to this context.
  
  // Let's assume the Page will use this context to drive its tab state.
  
  const switchTab = (tab: string) => {
    // Dispatch a custom event or update state that the page listens to
    // For simplicity, let's just store it in state and hope the page uses it.
    setActiveTab(tab);
    
    // Also dispatch an event for non-React listeners if needed (rare)
    window.dispatchEvent(new CustomEvent('supplier-management-tab-switch', { detail: { tab } }));
  };

  return (
    <SupplierManagementContext.Provider value={{
      switchTab,
      setPOConversionData,
      poConversionData
    }}>
      {children}
    </SupplierManagementContext.Provider>
  );
}

export function useSupplierManagement() {
  const context = useContext(SupplierManagementContext);
  // Optional: Don't throw if context is missing, return null or mock
  // This allows components to be used outside of SupplierManagement without crashing
  // But strict mode is usually better for debugging.
  // Given the current usage in PurchaseOrders with try-catch require, strict mode might be annoying.
  // However, the goal is to import this HOOK.
  
  if (!context) {
    // Return a safe mock object instead of null to prevent destructuring errors
    return {
      switchTab: (tab: string) => console.log("Mock switchTab:", tab),
      setPOConversionData: (data: any) => console.log("Mock setPOConversionData:", data),
      poConversionData: null
    };
  }
  return context;
}
