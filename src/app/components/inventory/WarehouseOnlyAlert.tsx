/**
 * WarehouseOnlyAlert - Alert explaining warehouse-first inventory model
 */

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Warehouse, Store, Info } from "lucide-react";

interface WarehouseOnlyAlertProps {
  variant?: "default" | "info" | "warning";
  showFullDescription?: boolean;
}

export function WarehouseOnlyAlert({ 
  variant = "info",
  showFullDescription = true 
}: WarehouseOnlyAlertProps) {
  return (
    <Alert className={
      variant === "info" 
        ? "border-[#00719C] bg-[#00719C]/10" 
        : variant === "warning"
        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
        : ""
    }>
      <div className="flex items-start gap-2">
        <Warehouse className="w-4 h-4 text-[#00719C] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <AlertTitle className="text-sm font-semibold mb-1">
            Warehouse-First Inventory Model
          </AlertTitle>
          {showFullDescription && (
            <AlertDescription className="text-xs space-y-2">
              <div>
                <strong>All products must originate in a warehouse first.</strong> This ensures proper inventory control and tracking.
              </div>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <Warehouse className="w-3 h-3 text-[#00719C] mt-0.5" />
                  <span><strong>Step 1:</strong> Add new products to a warehouse</span>
                </div>
                <div className="flex items-start gap-2">
                  <Store className="w-3 h-3 text-green-600 mt-0.5" />
                  <span><strong>Step 2:</strong> Transfer stock from warehouse to shops as needed</span>
                </div>
              </div>
              <div className="text-[#00719C] font-medium">
                → To add inventory to a shop, use "Add from Warehouse" button
              </div>
            </AlertDescription>
          )}
        </div>
      </div>
    </Alert>
  );
}
