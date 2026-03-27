import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Printer, X } from "lucide-react";
import { useCurrency } from "../hooks/useCurrency";
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #fiscal-receipt, #fiscal-receipt * { visibility: visible; }
            #fiscal-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 320px; /* ~80mm receipt width */
              padding: 8px;
              font-size: 12px;
              line-height: 1.2;
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              background: #fff;
            }
            /* Hide UI elements not meant for print */
            .print\:hidden { display: none !important; }
            .print\:max-w-full { max-width: 100% !important; }
            .print\:shadow-none { box-shadow: none !important; }
            /* Remove dialog chrome */
            .tn-dialog, .react-modal { display: none !important; }
            @page { size: auto; margin: 0; }
          }
        `}</style>
export function FiscalReceipt({ isOpen, onClose, receiptData }: FiscalReceiptProps) {
  const { formatCurrency } = useCurrency();
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md print:max-w-[320px] print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Fiscal Receipt</DialogTitle>
          <DialogDescription>Print or close the receipt</DialogDescription>
        </DialogHeader>

        {/* Receipt Content - Optimized for printing (receipt-style) */}
        <div className="receipt-content" id="fiscal-receipt">
          <div className="text-center">
            <h2 className="text-base font-bold">{receiptData.businessName}</h2>
            {receiptData.businessAddress && (
              <p className="text-xs text-muted-foreground">{receiptData.businessAddress}</p>
            )}
          </div>

          <div className="my-2 border-t border-dashed" />

          <div className="text-xs">
            <div className="flex justify-between">
              <span>Receipt No</span>
              <span className="font-mono">{receiptData.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{receiptData.date.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Time</span>
              <span>{receiptData.date.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier</span>
              <span>{receiptData.cashierName}</span>
            </div>
            {receiptData.customerName && (
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{receiptData.customerName}</span>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-dashed" />

          {/* Items table */}
          <div className="text-xs">
            {receiptData.items.map((item, index) => (
              <div key={index} className="flex justify-between py-1">
                <div className="w-2/3">
                  <div className="font-medium truncate">{item.productName}</div>
                  <div className="text-[11px] text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)}</div>
                </div>
                <div className="w-1/3 text-right font-mono">{formatCurrency(item.totalPrice)}</div>
              </div>
            ))}
          </div>

          <div className="my-2 border-t border-dashed" />

          {/* Totals */}
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(receiptData.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (16%)</span>
              <span className="font-mono">{formatCurrency(receiptData.tax)}</span>
            </div>
            <div className="flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span className="font-mono">{formatCurrency(receiptData.total)}</span>
            </div>
            {receiptData.paymentMethod && (
              <div className="flex justify-between">
                <span>Payment</span>
                <span className="uppercase">{receiptData.paymentMethod}</span>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-dashed" />

          <div className="text-center text-xs">
            <div className="font-medium">Thank you!</div>
            <div className="text-muted-foreground">Please keep this receipt</div>
          </div>
        </div>

        {/* Action Buttons - Hidden when printing */}
        <div className="flex gap-2 mt-4 print:hidden">
          <Button onClick={handlePrint} className="flex-1" variant="default">
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #fiscal-receipt,
            #fiscal-receipt * {
              visibility: visible;
            }
            #fiscal-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:max-w-full {
              max-width: 100% !important;
            }
            .print\\:shadow-none {
              box-shadow: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}