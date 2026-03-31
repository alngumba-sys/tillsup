/**
 * StockTransferModal - Transfer stock between locations
 */

import { useState, useEffect } from "react";
import { ArrowRight, Package, Store as StoreIcon, Clock, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useLocation } from "../contexts/LocationContext";
import { useInventory } from "../contexts/InventoryContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Info } from "lucide-react";

interface StockTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedProductId?: string;
}

export function StockTransferModal({ open, onOpenChange, preselectedProductId }: StockTransferModalProps) {
  const { locations, transferStock, getLocationStock, getWarehouses, getShops } = useLocation();
  const { inventory } = useInventory();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    fromLocationId: "",
    toLocationId: "",
    productId: preselectedProductId || "",
    quantity: "",
    notes: "",
    estimatedTime: "",
  });

  const [loading, setLoading] = useState(false);
  const [availableStock, setAvailableStock] = useState<number>(0);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        fromLocationId: "",
        toLocationId: "",
        productId: preselectedProductId || "",
        quantity: "",
        notes: "",
        estimatedTime: "",
      });
    }
  }, [open, preselectedProductId]);

  // Update available stock when from location or product changes
  useEffect(() => {
    if (formData.fromLocationId && formData.productId) {
      const stock = getLocationStock(formData.fromLocationId, formData.productId);
      setAvailableStock(stock);
    } else {
      setAvailableStock(0);
    }
  }, [formData.fromLocationId, formData.productId, getLocationStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fromLocationId || !formData.toLocationId || !formData.productId || !formData.quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.fromLocationId === formData.toLocationId) {
      toast.error("Source and destination locations must be different");
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (quantity > availableStock) {
      toast.error(`Insufficient stock. Only ${availableStock} units available at source location`);
      return;
    }

    setLoading(true);
    try {
      await transferStock(
        formData.fromLocationId,
        formData.toLocationId,
        formData.productId,
        quantity,
        formData.notes
      );

      const product = inventory.find(p => p.id === formData.productId);
      const fromLoc = locations.find(l => l.id === formData.fromLocationId);
      const toLoc = locations.find(l => l.id === formData.toLocationId);

      toast.success("Stock transfer initiated successfully", {
        description: `${quantity} units of ${product?.name} from ${fromLoc?.name} to ${toLoc?.name}`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to initiate stock transfer", {
        description: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const shops = getShops().filter(s => s.isActive);
  const activeLocations = locations.filter(l => l.isActive);

  const selectedProduct = inventory.find(p => p.id === formData.productId);
  const fromLocation = locations.find(l => l.id === formData.fromLocationId);
  const toLocation = locations.find(l => l.id === formData.toLocationId);

  const getLocationIcon = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (!location) return <Package className="w-4 h-4" />;
    return <StoreIcon className="w-4 h-4 text-[#00719C]" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-[#00719C]" />
            Stock Transfer
          </DialogTitle>
          <DialogDescription>
            Transfer inventory between shops and warehouses
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transfer Route Visual */}
          {formData.fromLocationId && formData.toLocationId && (
            <div className="bg-muted/30 rounded-lg p-4 border border-dashed bg-[#6495ce4d]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  {getLocationIcon(formData.fromLocationId)}
                  <div>
                    <div className="text-sm font-medium">{fromLocation?.name}</div>
                    <div className="text-xs text-muted-foreground">{fromLocation?.type}</div>
                  </div>
                </div>

                <ArrowRight className="w-6 h-6 text-[#00719C]" />

                <div className="flex items-center gap-2 flex-1">
                  {getLocationIcon(formData.toLocationId)}
                  <div>
                    <div className="text-sm font-medium">{toLocation?.name}</div>
                    <div className="text-xs text-muted-foreground">{toLocation?.type}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* From Location */}
            <div className="space-y-2">
              <Label htmlFor="fromLocation">
                From Location <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.fromLocationId}
                onValueChange={(value) => setFormData({ ...formData, fromLocationId: value })}
              >
                <SelectTrigger id="fromLocation">
                  <SelectValue placeholder="Select source location" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">BRANCHES</div>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      <div className="flex items-center gap-2">
                        <StoreIcon className="w-4 h-4 text-[#00719C]" />
                        {shop.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Location */}
            <div className="space-y-2">
              <Label htmlFor="toLocation">
                To Location <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.toLocationId}
                onValueChange={(value) => setFormData({ ...formData, toLocationId: value })}
              >
                <SelectTrigger id="toLocation">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">BRANCHES</div>
                  {shops
                    .filter(s => s.id !== formData.fromLocationId)
                    .map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        <div className="flex items-center gap-2">
                          <StoreIcon className="w-4 h-4 text-[#00719C]" />
                          {shop.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product">
              Product <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.productId}
              onValueChange={(value) => setFormData({ ...formData, productId: value })}
            >
              <SelectTrigger id="product">
                <SelectValue placeholder="Select product to transfer" />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span>{product.name}</span>
                      {product.sku && (
                        <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Available Stock Alert */}
          {formData.fromLocationId && formData.productId && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex-shrink-0">Available stock at {fromLocation?.name}:</span>
                  <Badge variant={availableStock > 0 ? "default" : "destructive"} className="flex-shrink-0">
                    {availableStock} units
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={availableStock}
                placeholder="Enter quantity"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>

            {/* Estimated Time */}
            <div className="space-y-2">
              <Label htmlFor="estimatedTime">Estimated Transfer Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="estimatedTime"
                  placeholder="e.g., 2 hours"
                  className="pl-9"
                  value={formData.estimatedTime}
                  onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Transfer Notes</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                id="notes"
                placeholder="Add any notes about this transfer (optional)"
                className="pl-9 resize-none"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#00719C] hover:bg-[#00719C]/90"
              disabled={loading || !formData.fromLocationId || !formData.toLocationId || !formData.productId || !formData.quantity}
            >
              {loading ? "Initiating Transfer..." : "Initiate Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}