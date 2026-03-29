import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Printer, X } from "lucide-react";
import { useCurrency } from "../hooks/useCurrency";

export interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptData {
  businessName: string;
  businessAddress?: string;
  receiptNumber: string;
  date: Date;
  cashierName: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: string;
}

interface FiscalReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

export function FiscalReceipt({ isOpen, onClose, receiptData }: FiscalReceiptProps) {
  const { formatCurrency } = useCurrency();
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          
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
            width: 80mm;
            max-width: 80mm;
            padding: 5mm;
            margin: 0;
            font-family: 'Courier New', Courier, monospace;
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
            background: #fff;
            box-shadow: none !important;
            border: none !important;
          }
          
          .receipt-header,
          .receipt-footer,
          .receipt-items,
          .receipt-totals,
          .receipt-meta {
            break-inside: avoid;
          }
          
          .receipt-item {
            break-inside: avoid;
          }
          
          .print-hidden {
            display: none !important;
          }
        }
        
        @media screen {
          #fiscal-receipt {
            font-family: 'Courier New', Courier, monospace;
            max-width: 320px;
            margin: 0 auto;
            background: #fff;
            border: 1px solid #e5e7eb;
            padding: 16px;
            font-size: 12px;
            line-height: 1.4;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden print:hidden">
          <DialogHeader className="p-4 border-b print-hidden">
            <DialogTitle>Receipt Preview</DialogTitle>
            <DialogDescription>Print or close the receipt</DialogDescription>
          </DialogHeader>

          {/* Receipt Content */}
          <div id="fiscal-receipt">
            {/* Header Section */}
            <div className="receipt-header text-center mb-2">
              <h2 className="font-bold text-base mb-1">{receiptData.businessName}</h2>
              {receiptData.businessAddress && (
                <p className="text-xs text-gray-600">{receiptData.businessAddress}</p>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Meta Information */}
            <div className="receipt-meta text-xs space-y-0.5">
              <div className="flex justify-between">
                <span>Receipt No:</span>
                <span>{receiptData.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{receiptData.date.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{receiptData.date.toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{receiptData.cashierName}</span>
              </div>
              {receiptData.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{receiptData.customerName}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Items Section */}
            <div className="receipt-items text-xs">
              {receiptData.items.map((item, index) => (
                <div key={index} className="receipt-item py-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <div className="font-medium truncate max-w-[180px]">{item.productName}</div>
                      <div className="text-gray-600">{item.quantity} x {formatCurrency(item.unitPrice)}</div>
                    </div>
                    <div className="text-right whitespace-nowrap">{formatCurrency(item.totalPrice)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Totals Section */}
            <div className="receipt-totals text-xs space-y-0.5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(receiptData.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (16%):</span>
                <span>{formatCurrency(receiptData.tax)}</span>
              </div>
              <div className="border-t border-black my-1" />
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>{formatCurrency(receiptData.total)}</span>
              </div>
              {receiptData.paymentMethod && (
                <div className="flex justify-between mt-1">
                  <span>Payment:</span>
                  <span className="uppercase">{receiptData.paymentMethod}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Footer Section */}
            <div className="receipt-footer text-center text-xs mt-2">
              <p className="font-medium">Thank you for your purchase!</p>
              <p className="text-gray-600 mt-1">Please keep this receipt</p>
            </div>
          </div>

          {/* Action Buttons - Hidden when printing */}
          <div className="flex gap-2 p-4 border-t print-hidden">
            <Button onClick={handlePrint} className="flex-1" variant="default">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
