import { ReactNode } from "react";
import { BranchProvider } from "../contexts/BranchContext";
import { AttendanceProvider } from "../contexts/AttendanceContext";
import { CategoryProvider } from "../contexts/CategoryContext";
import { ExpenseProvider } from "../contexts/ExpenseContext";
import { ForecastingProvider } from "../contexts/ForecastingContext";
import { GoodsReceivedProvider } from "../contexts/GoodsReceivedContext";
import { InventoryAuditProvider } from "../contexts/InventoryAuditContext";
import { InventoryProvider } from "../contexts/InventoryContext";
import { KPIProvider } from "../contexts/KPIContext";
import { PurchaseOrderProvider } from "../contexts/PurchaseOrderContext";
import { RoleProvider } from "../contexts/RoleContext";
import { SalesProvider } from "../contexts/SalesContext";
import { SupplierProvider } from "../contexts/SupplierContext";
import { SupplierInvoiceProvider } from "../contexts/SupplierInvoiceContext";
import { SupplierManagementProvider } from "../contexts/SupplierManagementContext";
import { SupplierRequestProvider } from "../contexts/SupplierRequestContext";

interface BusinessProvidersProps {
  children: ReactNode;
}

// This component wraps all business logic providers
// Only used for authenticated routes under /app
export function BusinessProviders({ children }: BusinessProvidersProps) {
  return (
    <BranchProvider>
      <RoleProvider>
        <CategoryProvider>
          <SalesProvider>
            <SupplierProvider>
              <SupplierManagementProvider>
                <SupplierRequestProvider>
                  <InventoryProvider>
                    <InventoryAuditProvider>
                      <ExpenseProvider>
                        <PurchaseOrderProvider>
                          <GoodsReceivedProvider>
                            <SupplierInvoiceProvider>
                              <ForecastingProvider>
                                <AttendanceProvider>
                                  <KPIProvider>
                                    {children}
                                  </KPIProvider>
                                </AttendanceProvider>
                              </ForecastingProvider>
                            </SupplierInvoiceProvider>
                          </GoodsReceivedProvider>
                        </PurchaseOrderProvider>
                      </ExpenseProvider>
                    </InventoryAuditProvider>
                  </InventoryProvider>
                </SupplierRequestProvider>
              </SupplierManagementProvider>
            </SupplierProvider>
          </SalesProvider>
        </CategoryProvider>
      </RoleProvider>
    </BranchProvider>
  );
}
