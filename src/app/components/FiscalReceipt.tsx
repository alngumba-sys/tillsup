import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Printer, X } from "lucide-react";
import { useCurrency } from "../hooks/useCurrency";

interface ReceiptItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface FiscalReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: {
    receiptNumber: string;
    date: Date;
    items: ReceiptItem[];
    subtotal: number;
    tax: number;
    total: number;
    cashierName: string;
    businessName: string;
    businessAddress?: string;
    paymentMethod?: string;
    customerName?: string;
  };
}

export function FiscalReceipt({ isOpen, onClose, receiptData }: FiscalReceiptProps) {
  const { formatCurrency } = useCurrency();
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md print:max-w-full print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Fiscal Receipt</DialogTitle>
          <DialogDescription>Print or close the receipt</DialogDescription>
        </DialogHeader>

        {/* Receipt Content - Optimized for printing */}
        <div className="receipt-content space-y-4" id="fiscal-receipt">
          {/* Business Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">{receiptData.businessName}</h2>
            {receiptData.businessAddress && (
              <p className="text-sm text-muted-foreground">{receiptData.businessAddress}</p>
            )}
          </div>

          <Separator />

          {/* Receipt Info */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receipt No:</span>
              <span className="font-mono font-semibold">{receiptData.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{receiptData.date.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span>{receiptData.date.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cashier:</span>
              <span>{receiptData.cashierName}</span>
            </div>
            {receiptData.customerName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span>{receiptData.customerName}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Items</h3>
            {receiptData.items.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-semibold text-sm ml-2">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(receiptData.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (16%):</span>
              <span>{formatCurrency(receiptData.tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{formatCurrency(receiptData.total)}</span>
            </div>
            {receiptData.paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="uppercase">{receiptData.paymentMethod}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center space-y-2 pt-2">
            <p className="text-sm font-medium">Thank you for your business!</p>
            <p className="text-xs text-muted-foreground">
              Please keep this receipt for your records
            </p>
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