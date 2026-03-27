/**
 * AddProductToShopDialog - Add products to shop from warehouse
 * Enforces warehouse-first inventory model
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Warehouse, Store, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLocation } from "../../contexts/LocationContext";
import { useInventory } from "../../contexts/InventoryContext";
import { StockTransferConfirmation } from "./StockTransferConfirmation";
import { toast } from "sonner";

interface AddProductToShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  productId: string;
  productName: string;
  onSuccess?: () => void;
}

export function AddProductToShopDialog({
  open,
  onOpenChange,
  shopId,
  productId,
  productName,
  onSuccess,
}: AddProductToShopDialogProps) {
  const { getWarehouses, getLocationById, transferStock, getLocationStock } = useLocation();
  const { inventory } = useInventory();
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const warehouses = getWarehouses();
  const shop = getLocationById(shopId);
  const selectedWarehouse = selectedWarehouseId ? getLocationById(selectedWarehouseId) : null;

  // Get current stock levels
  const warehouseStock = selectedWarehouseId ? getLocationStock(selectedWarehouseId, productId) : 0;
  const shopStock = getLocationStock(shopId, productId);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedWarehouseId("");
      setQuantity("");
      setNotes("");
    }
  }, [open]);

  // Auto-select first warehouse if only one exists
  useEffect(() => {
    if (warehouses.length === 1 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedWarehouseId) {
      toast.error("Please select a source warehouse");
      return;
    }

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (qty > warehouseStock) {
      toast.error(`Insufficient stock in ${selectedWarehouse?.name}`, {
        description: `Available: ${warehouseStock} units, Requested: ${qty} units`
      });
      return;
    }

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmTransfer = async () => {
    setLoading(true);
    try {
      const qty = parseInt(quantity);
      await transferStock(
        selectedWarehouseId,
        shopId,
        productId,
        qty,
        notes || `Stock transfer from ${selectedWarehouse?.name} to ${shop?.name}`
      );

      toast.success("Stock transferred successfully!", {
        description: `${qty} units of ${productName} added to ${shop?.name}`
      });

      setShowConfirmation(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Stock transfer error:", error);
      toast.error("Transfer failed", {
        description: error.message || "Failed to transfer stock"
      });
    } finally {
      setLoading(false);
    }
  };

  const hasWarehouses = warehouses.length > 0;
  const canTransfer = selectedWarehouseId && quantity && parseInt(quantity) > 0 && parseInt(quantity) <= warehouseStock;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#0891b2]" />
              Add Product to Shop
            </DialogTitle>
            <DialogDescription>
              Transfer stock from a warehouse to {shop?.name}
            </DialogDescription>
          </DialogHeader>

          {!hasWarehouses ? (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">No Warehouses Available</div>
                <div className="text-sm">
                  You need to create at least one warehouse before you can add products to shops.
                  Go to <span className="font-medium">Location Management</span> to create a warehouse.
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product Info */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Product
                  </span>
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {productName}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Current stock in {shop?.name}: <span className="font-medium">{shopStock} units</span>
                </div>
              </div>

              {/* Source Warehouse Selection */}
              <div className="space-y-2">
                <Label htmlFor="warehouse" className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4" />
                  Source Warehouse *
                </Label>
                <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                  <SelectTrigger id="warehouse">
                    <SelectValue placeholder="Select warehouse to transfer from..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => {
                      const stock = getLocationStock(warehouse.id, productId);
                      return (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          <div className="flex items-center justify-between gap-4">
                            <span>{warehouse.name}</span>
                            <Badge variant={stock > 0 ? "default" : "outline"} className="ml-2">
                              {stock} units
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedWarehouseId && (
                  <div className="text-xs text-slate-500">
                    Available stock: <span className="font-semibold text-[#0891b2]">{warehouseStock} units</span>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to Transfer *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={warehouseStock}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity..."
                  disabled={!selectedWarehouseId}
                />
                {selectedWarehouseId && quantity && parseInt(quantity) > warehouseStock && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      Insufficient stock. Only {warehouseStock} units available in {selectedWarehouse?.name}.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add transfer notes..."
                />
              </div>

              {/* Info Alert */}
              <Alert>
                <CheckCircle2 className="w-4 h-4 text-[#0891b2]" />
                <AlertDescription className="text-sm">
                  <div className="font-semibold mb-1">Warehouse-First Inventory</div>
                  <div>
                    All products must originate from a warehouse. This transfer will reduce stock in the warehouse
                    and increase it in the shop.
                  </div>
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!canTransfer}
                  className="bg-[#0891b2] hover:bg-[#0891b2]/90"
                >
                  Continue
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <StockTransferConfirmation
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={handleConfirmTransfer}
        fromLocationName={selectedWarehouse?.name || ""}
        toLocationName={shop?.name || ""}
        productName={productName}
        quantity={parseInt(quantity) || 0}
        fromCurrentStock={warehouseStock}
        toCurrentStock={shopStock}
        isWarehouseTransfer={true}
      />
    </>
  );
}
