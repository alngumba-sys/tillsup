/**
 * StockTransferConfirmation - Confirmation dialog for stock transfers
 * Shows exact stock impact before confirming
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import { ArrowRight, Package, AlertTriangle } from "lucide-react";

interface StockTransferConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  fromLocationName: string;
  toLocationName: string;
  productName: string;
  quantity: number;
  fromCurrentStock?: number;
  toCurrentStock?: number;
  isWarehouseTransfer?: boolean;
}

export function StockTransferConfirmation({
  open,
  onOpenChange,
  onConfirm,
  fromLocationName,
  toLocationName,
  productName,
  quantity,
  fromCurrentStock,
  toCurrentStock,
  isWarehouseTransfer = false,
}: StockTransferConfirmationProps) {
  const fromNewStock = fromCurrentStock !== undefined ? fromCurrentStock - quantity : undefined;
  const toNewStock = toCurrentStock !== undefined ? toCurrentStock + quantity : undefined;

  const hasLowStock = fromNewStock !== undefined && fromNewStock < 10;
  const hasNegativeStock = fromNewStock !== undefined && fromNewStock < 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#00719C]" />
            Confirm Stock Transfer
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              {/* Product Info */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Product: {productName}
                </div>
                <div className="text-lg font-bold text-[#00719C]">
                  {quantity} units
                </div>
              </div>

              {/* Transfer Flow */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  {/* From Location */}
                  <div className="flex-1 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                    <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                      FROM
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-2">
                      {fromLocationName}
                    </div>
                    {fromCurrentStock !== undefined && (
                      <div className="space-y-1">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Current: <span className="font-medium">{fromCurrentStock} units</span>
                        </div>
                        <div className="text-xs font-bold text-red-700 dark:text-red-400">
                          After: {fromNewStock} units
                          {hasNegativeStock && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              INSUFFICIENT STOCK
                            </Badge>
                          )}
                          {hasLowStock && !hasNegativeStock && (
                            <Badge variant="outline" className="ml-2 text-xs border-yellow-500 text-yellow-700">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-6 h-6 text-slate-400 flex-shrink-0" />

                  {/* To Location */}
                  <div className="flex-1 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                    <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                      TO
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-2">
                      {toLocationName}
                    </div>
                    {toCurrentStock !== undefined && (
                      <div className="space-y-1">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Current: <span className="font-medium">{toCurrentStock} units</span>
                        </div>
                        <div className="text-xs font-bold text-green-700 dark:text-green-400">
                          After: {toNewStock} units
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning for negative stock */}
              {hasNegativeStock && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-red-700 dark:text-red-300">
                    <div className="font-semibold mb-1">Insufficient Stock</div>
                    <div>
                      {fromLocationName} only has {fromCurrentStock} units available, but you're trying to transfer {quantity} units.
                      This will result in negative stock.
                    </div>
                  </div>
                </div>
              )}

              {/* Warehouse info */}
              {isWarehouseTransfer && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <div className="font-semibold mb-1">Warehouse Transfer</div>
                    <div>
                      Stock will be moved from the warehouse to the shop. Make sure the warehouse has sufficient stock.
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Do you want to proceed with this transfer?
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={hasNegativeStock}
            className="bg-[#00719C] hover:bg-[#00719C]/90"
          >
            {hasNegativeStock ? "Insufficient Stock" : "Confirm Transfer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
