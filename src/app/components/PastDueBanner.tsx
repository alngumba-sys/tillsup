import { useState } from "react";
import { AlertTriangle, CreditCard, X, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";

/**
 * PastDueBanner - Notification banner for past_due subscription status
 * 
 * Only visible to users with Business Owner or Manager roles.
 * Displays an amber/orange warning banner prompting users to update payment.
 */
export function PastDueBanner() {
  const { business, user } = useAuth();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show for Business Owner or Manager roles
  const userRole = user?.role;
  const isAdminOrOwner = userRole === "Business Owner" || userRole === "Manager";

  // Only show for past_due status
  const isPastDue = business?.subscriptionStatus === "past_due";

  // Don't render if not admin/owner or not past due or dismissed
  if (!isAdminOrOwner || !isPastDue || isDismissed) {
    return null;
  }

  const handleUpdatePayment = () => {
    navigate("/app/subscription");
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Alert className="bg-amber-50 border-amber-200 rounded-none border-x-0 border-t-0 m-0">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 font-medium">
              Payment Required
            </AlertDescription>
          </div>
          <span className="text-amber-700 text-sm hidden sm:inline">
            Your subscription payment is past due. Update your payment method to avoid service interruption.
          </span>
          <span className="text-amber-700 text-sm sm:hidden">
            Payment required. Update to avoid interruption.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdatePayment}
            className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Update Payment
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}
