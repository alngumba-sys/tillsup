import { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
// Payment method uses custom mini-cards — no Select required
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import { CustomerNameInput } from "../CustomerNameInput";
import { useCurrency } from "../../hooks/useCurrency";
import { ShoppingCart, Building2, AlertTriangle, Trash2, Minus, Plus, Receipt, Smartphone, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

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
  handleCheckout: (paymentMethod: "Cash" | "MPesa" | "Credit") => void;
  businessId?: string;
  branchId?: string;
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
  businessId,
  branchId,
}: CartPanelProps) {
  const { formatCurrency } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "MPesa" | "Credit">("Cash");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [isMPesaProcessing, setIsMPesaProcessing] = useState(false);
  // ═══════════════════════════════════════════════════════════════════
  // BRANCH STATUS VALIDATION - Disable checkout for deactivated branches
  // ═══════════════════════════════════════════════════════════════════
  const isBranchDeactivated = activeBranch?.status === "inactive";

  /**
   * M-PESA STK Push Payment Handler
   * Initiates an M-PESA STK Push to the customer's phone
   */
  const handleMPesaPayment = async () => {
    if (!mpesaPhone) {
      toast.error("Phone Number Required", {
        description: "Please enter the customer's phone number"
      });
      return;
    }

    if (!businessId) {
      toast.error("Error", { description: "Business ID is missing" });
      return;
    }

    // Validate phone number format
    const cleanedPhone = mpesaPhone.replace(/[\s\-\+]/g, '');
    if (!/^(07|01|2547|2541)\d{7,8}$/.test(cleanedPhone)) {
      toast.error("Invalid Phone Number", {
        description: "Please enter a valid Kenyan phone number (e.g., 07XXXXXXXX or 254XXXXXXXXX)"
      });
      return;
    }

    setIsMPesaProcessing(true);

    try {
      // Call M-PESA STK Push edge function
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber: cleanedPhone,
          amount: total,
          businessId,
          branchId,
          description: `POS Sale - ${cart.length} item(s)`,
        }
      });

      if (error) {
        throw new Error(error.message || 'M-PESA payment failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'M-PESA payment initiation failed');
      }

      toast.success("M-PESA Request Sent", {
        description: `STK Push sent to ${cleanedPhone}. Ask customer to enter M-PESA PIN.`
      });

      // Start polling for transaction status
      const checkoutRequestId = data.checkoutRequestId;
      let attempts = 0;
      const maxAttempts = 60; // Poll for up to 60 seconds

      const pollInterval = setInterval(async () => {
        attempts++;
        
        const { data: txData } = await supabase
          .from('mpesa_transactions')
          .select('status, result_description, mpesa_receipt_number')
          .eq('checkout_request_id', checkoutRequestId)
          .single();

        if (txData?.status === 'completed') {
          clearInterval(pollInterval);
          setIsMPesaProcessing(false);
          toast.success("Payment Successful!", {
            description: `M-PESA Receipt: ${txData.mpesa_receipt_number}`
          });
          // Proceed with checkout
          handleCheckout("MPesa");
          setMpesaPhone("");
        } else if (txData?.status === 'failed' || txData?.status === 'cancelled') {
          clearInterval(pollInterval);
          setIsMPesaProcessing(false);
          toast.error("Payment Failed", {
            description: txData.result_description || "M-PESA payment was not completed"
          });
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsMPesaProcessing(false);
          toast.error("Payment Timeout", {
            description: "M-PESA payment timed out. Please try again."
          });
        }
      }, 1000);

    } catch (err: any) {
      setIsMPesaProcessing(false);
      toast.error("M-PESA Error", {
        description: err.message || "Failed to initiate M-PESA payment"
      });
    }
  };

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
              <p className="text-sm font-semibold text-blue-900">{activeBranch?.name ?? "—"}</p>
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
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
            {cart.map((item) => (
              <div key={item.id} className="bg-slate-50 rounded-lg p-2 flex gap-2 items-center">
                {/* Image Thumbnail */}
                <div className="w-10 h-10 rounded-md bg-white border overflow-hidden shrink-0 flex items-center justify-center">
                  {item?.image ? (
                    <img src={item.image} alt={item?.name ?? 'Product'} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 text-slate-300" />
                  )}
                </div>

                {/* Product Info & Controls - All in one row */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-xs truncate flex-1 min-w-0">{item?.name ?? 'Unknown'}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive shrink-0"
                      onClick={() => removeFromCart(item?.id || '')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Price Tier Selector (only if wholesale exists) */}
                  {item?.wholesalePrice && (
                    <div className="mt-1">
                      <Select
                        value={item?.priceType || "retail"}
                        onValueChange={(value) => updatePriceTier(item?.id || '', value as "retail" | "wholesale")}
                      >
                        <SelectTrigger className="h-6 text-[10px] w-full max-w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail" className="text-xs">
                            Retail - {formatCurrency(item?.retailPrice || item?.price || 0)}
                          </SelectItem>
                          <SelectItem value="wholesale" className="text-xs">
                            Wholesale - {formatCurrency(item?.wholesalePrice || 0)}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Quantity, Price, and Subtotal - All in one row */}
                  <div className="flex items-center gap-1 mt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item?.id || '', -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-xs font-medium">{item?.quantity ?? 0}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item?.id || '', 1)}
                      disabled={(item?.quantity ?? 0) >= (item?.stock ?? 0)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground ml-1">@{formatCurrency(item?.selectedPrice ?? item?.price ?? 0)}</span>
                    <span className="ml-auto text-xs font-semibold">{formatCurrency((item?.selectedPrice ?? item?.price ?? 0) * (item?.quantity ?? 0))}</span>
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

        {cart.length > 0 && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Payment Method</p>
              <div className="flex w-full gap-2">
                {(["Cash", "MPesa", "Credit"] as const).map((m) => {
                  const isSelected = paymentMethod === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      aria-pressed={isSelected}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors focus:outline-none ${isSelected ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white text-muted-foreground border-border hover:bg-slate-50'}`}
                    >
                      {m === "MPesa" && <Smartphone className="w-4 h-4" />}
                      <span className="font-medium">{m}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* M-PESA Phone Number Input */}
            {paymentMethod === "MPesa" && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Customer Phone Number</p>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="07XXXXXXXX or 254XXXXXXXXX"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    className="flex-1"
                    disabled={isMPesaProcessing}
                  />
                  <Button
                    onClick={handleMPesaPayment}
                    disabled={isMPesaProcessing || !mpesaPhone}
                    className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                  >
                    {isMPesaProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-1" />
                        Pay Now
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  STK Push will be sent to the customer's phone. They must enter their M-PESA PIN to complete.
                </p>
              </div>
            )}

            <CustomerNameInput
              value={customerName}
              onChange={setCustomerName}
            />
          </>
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
          onClick={() => {
            if (paymentMethod === "MPesa") {
              // MPesa handles checkout internally via handleMPesaPayment
              if (!isMPesaProcessing && mpesaPhone) {
                handleMPesaPayment();
              }
            } else {
              handleCheckout(paymentMethod);
            }
          }}
          disabled={
            cart.length === 0 || 
            !isPOSReady || 
            isBranchDeactivated ||
            isMPesaProcessing ||
            (paymentMethod === "MPesa" && !mpesaPhone)
          }
        >
          {paymentMethod === "MPesa" ? (
            isMPesaProcessing ? "Processing M-PESA..." : "Process M-PESA Payment"
          ) : (
            "Checkout"
          )}
        </Button>
      </div>
    </div>
  </div>
  );
}