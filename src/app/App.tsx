import { RouterProvider } from "react-router";
import { router } from "./AppRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import { BranchProvider } from "./contexts/BranchContext";
import { AttendanceProvider } from "./contexts/AttendanceContext";
import { CategoryProvider } from "./contexts/CategoryContext";
import { ExpenseProvider } from "./contexts/ExpenseContext";
import { ForecastingProvider } from "./contexts/ForecastingContext";
import { GoodsReceivedProvider } from "./contexts/GoodsReceivedContext";
import { InventoryAuditProvider } from "./contexts/InventoryAuditContext";
import { InventoryProvider } from "./contexts/InventoryContext";
import { KPIProvider } from "./contexts/KPIContext";
import { PurchaseOrderProvider } from "./contexts/PurchaseOrderContext";
import { RoleProvider } from "./contexts/RoleContext";
import { SalesProvider } from "./contexts/SalesContext";
import { SupplierProvider } from "./contexts/SupplierContext";
import { SupplierInvoiceProvider } from "./contexts/SupplierInvoiceContext";
import { SupplierManagementProvider } from "./contexts/SupplierManagementContext";
import { SupplierRequestProvider } from "./contexts/SupplierRequestContext";

import { BrandingProvider } from "./contexts/BrandingContext";

// Main App Component - Entry point for the POS System
export default function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
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
                                      <RouterProvider router={router} />
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
    </AuthProvider>
    </BrandingProvider>
  );
}
