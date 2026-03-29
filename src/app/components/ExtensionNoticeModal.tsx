import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { PartyPopper, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

/**
 * Extension Notice Modal
 * 
 * This component displays a one-time "Welcome Back" notification
 * when a business owner logs in for the first time after their
 * subscription has been extended by an admin.
 * 
 * Features:
 * - Shows a celebratory modal with confetti-like design
 * - Displays the new expiry date
 * - Automatically dismisses when the user clicks "Continue"
 * - Sets the flag to false after dismissal so it doesn't show again
 */
export function ExtensionNoticeModal() {
  const { user, business, refreshBusiness } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkForExtensionNotice();
  }, [business]);

  const checkForExtensionNotice = async () => {
    if (!business?.id) return;

    // Check if the business has a pending extension notice
    if (business.requires_extension_notice) {
      // Get the extension date
      const expiryDate = business.trial_ends_at || business.subscription_end_date;
      if (expiryDate) {
        setExtensionDate(new Date(expiryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }));
      }
      setIsOpen(true);
    }
  };

  const handleDismiss = async () => {
    if (!business?.id) return;

    setIsProcessing(true);
    try {
      // Update the database to mark the notice as shown
      const { error } = await supabase
        .from('businesses')
        .update({
          requires_extension_notice: false,
          extension_notified_at: new Date().toISOString()
        })
        .eq('id', business.id);

      if (error) {
        console.error('Error updating extension notice flag:', error);
        // Still close the modal even if the update fails
      }

      // Refresh the business context
      if (refreshBusiness) {
        await refreshBusiness();
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Error dismissing extension notice:', error);
      setIsOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleDismiss();
    }}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-2xl">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200 rounded-full opacity-20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-200 rounded-full opacity-20 blur-3xl" />
        </div>

        <DialogHeader className="relative">
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Icon with animation */}
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-400 rounded-full opacity-20 animate-ping" />
              <div className="relative p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full">
                <PartyPopper className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Title */}
            <DialogTitle className="text-2xl font-bold text-center text-gray-900">
              Welcome Back! 🎉
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="relative space-y-4 py-2">
          {/* Message */}
          <div className="text-center space-y-2">
            <p className="text-gray-700">
              Your subscription has been <span className="font-semibold text-indigo-600">successfully extended</span>!
            </p>
            {extensionDate && (
              <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="text-sm">
                  <span className="text-gray-600">New expiry date: </span>
                  <span className="font-semibold text-gray-900">{extensionDate}</span>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Enjoy uninterrupted access to all Tillsup features!
            </p>
          </div>

          {/* Decorative elements */}
          <div className="flex justify-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <Sparkles className="w-4 h-4 text-purple-400" />
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        {/* Action */}
        <div className="relative pt-2">
          <Button
            onClick={handleDismiss}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                Continue to Dashboard
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}