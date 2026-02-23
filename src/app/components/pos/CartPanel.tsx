import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { CustomerNameInput } from "../CustomerNameInput";
import { useCurrency } from "../../hooks/useCurrency";
import { ShoppingCart, Building2, AlertTriangle, Trash2, Minus, Plus, Receipt } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  branchId: string;
  costPrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
}

export interface CartItem extends Product {
  quantity: number;
  selectedPrice: number;
  priceType: "retail" | "wholesale";
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  businessId: string;
  status: "active" | "inactive";
  createdAt: Date;
}

interface CartPanelProps {
  isPOSReady: boolean;
  activeBranch: Branch | undefined;
  canChangeBranch: boolean;
  validationError: string | null;
  cart: CartItem[];
  removeFromCart: (id: string) => void;
  updatePriceTier: (id: string, type: "retail" | "wholesale") => void;
  updateQuantity: (id: string, delta: number) => void;
  subtotal: number;
  tax: number;
  total: number;
  customerName: string;
  setCustomerName: (name: string) => void;
  generateFiscalReceipt: boolean;
  handleGenerateFiscalReceiptChange: (checked: boolean) => void;
  handleCheckout: () => void;
}

export function CartPanel({
  isPOSReady,
  activeBranch,
  canChangeBranch,
  validationError,
  cart,
  removeFromCart,
  updatePriceTier,
  updateQuantity,
  subtotal,
  tax,
  total,
  customerName,
  setCustomerName,
  generateFiscalReceipt,
  handleGenerateFiscalReceiptChange,
  handleCheckout,
}: CartPanelProps) {
  const { formatCurrency } = useCurrency();
  // ═══════════════════════════════════════════════════════════════════
  // BRANCH STATUS VALIDATION - Disable checkout for deactivated branches
  // ═══════════════════════════════════════════════════════════════════
  const isBranchDeactivated = activeBranch?.status === "inactive";

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <ShoppingCart className="w-5 h-5" />
          Current Order
        </h3>
        
        {/* ═══════════════════════════════════════════════════════════════════
            STEP 2.4: POS UI VISUAL CONFIRMATION - Branch Badge in Cart
            ═══════════════════════════════════════════════════════════════════ */}
        {isPOSReady && activeBranch && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
            <Building2 className="w-4 h-4 text-blue-600" />
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-medium">Active Branch</p>
              <p className="text-sm font-semibold text-blue-900">{activeBranch.name}</p>
            </div>
            {!canChangeBranch && (
              <Badge variant="secondary" className="text-xs">
                Locked
              </Badge>
            )}
          </div>
        )}
        
        {/* Branch Missing Warning */}
        {!isPOSReady && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-900 font-medium">No branch selected</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Validation Error Alert */}
        {validationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Checkout Failed</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {cart.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="bg-slate-50 rounded-lg p-3 flex gap-3">
                {/* Image Thumbnail */}
                <div className="w-12 h-12 rounded-md bg-white border overflow-hidden shrink-0 flex items-center justify-center mt-1">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart className="w-5 h-5 text-slate-300" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium line-clamp-2 text-sm">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(item.selectedPrice)}
                      </p>
                      {item.wholesalePrice && (
                        <Badge variant="outline" className="text-xs">
                          {item.priceType === "retail" ? "Retail" : "Wholesale"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* ═══════════════════════════════════════════════════════════════════
                    PRICING EXTENSION: Price Tier Selector (only if wholesale exists)
                    ═══════════════════════════════════════════════════════════════════ */}
                {item.wholesalePrice && (
                  <div className="mb-2">
                    <Select
                      value={item.priceType}
                      onValueChange={(value) => updatePriceTier(item.id, value as "retail" | "wholesale")}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">
                          Retail - {formatCurrency(item.retailPrice || item.price)}
                        </SelectItem>
                        <SelectItem value="wholesale">
                          Wholesale - {formatCurrency(item.wholesalePrice)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, -1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-12 text-center font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, 1)}
                    disabled={item.quantity >= item.stock}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <span className="ml-auto font-semibold">
                    {formatCurrency(item.selectedPrice * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-border space-y-3 bg-white">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (16%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="font-semibold text-lg">Total</span>
            <span className="font-semibold text-lg">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* CUSTOMER NAME INPUT */}
        {cart.length > 0 && (
          <CustomerNameInput
            value={customerName}
            onChange={setCustomerName}
          />
        )}

        {/* Fiscal Receipt Toggle */}
        {cart.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="fiscal-receipt-toggle" className="cursor-pointer text-sm font-medium">
                Generate Fiscal Receipt
              </Label>
            </div>
            <Switch
              id="fiscal-receipt-toggle"
              checked={generateFiscalReceipt}
              onCheckedChange={handleGenerateFiscalReceiptChange}
            />
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleCheckout}
          disabled={cart.length === 0 || !isPOSReady || isBranchDeactivated}
        >
          Checkout
        </Button>
      </div>
    </div>
  );
}