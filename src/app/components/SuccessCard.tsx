import { useEffect, useState } from "react";
import { CheckCircle, ShoppingBag } from "lucide-react";
import { useCurrency } from "../hooks/useCurrency";
import { cn } from "./ui/utils";

interface SuccessCardProps {
  total: number;
  itemCount: number;
  onDismiss: () => void;
}

export function SuccessCard({ total, itemCount, onDismiss }: SuccessCardProps) {
  const { formatCurrency } = useCurrency();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after 4 seconds
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onDismiss();
      }, 400);
    }, 4000);

    return () => clearTimeout(dismissTimer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-400 ease-out",
        isVisible && !isExiting ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-8 scale-95"
      )}
    >
      <div className="bg-white border-2 border-green-500 rounded-xl shadow-2xl shadow-green-500/20 p-6 min-w-[320px] max-w-md backdrop-blur-sm">
        <div className="flex items-start gap-4">
          {/* Success Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center ring-4 ring-green-100 animate-success-pulse">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Sale Completed Successfully
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Transaction has been processed and recorded
            </p>

            {/* Sale Details */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 space-y-2 border border-green-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-green-600" />
                  Items Sold
                </span>
                <span className="font-semibold text-gray-900 bg-white px-2 py-0.5 rounded">
                  {itemCount}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-gray-700 font-medium">Total Amount</span>
                <span className="text-2xl font-bold text-green-700">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar for auto-dismiss */}
        <div className="mt-4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all ease-linear",
              isVisible && !isExiting ? "w-0" : "w-full"
            )}
            style={{ transitionDuration: isVisible && !isExiting ? "4000ms" : "0ms" }}
          />
        </div>
      </div>
    </div>
  );
}