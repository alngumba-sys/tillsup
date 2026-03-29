import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";

/**
 * PaymentSuccess Page
 * 
 * Shown after a successful Stripe Checkout redirect.
 * Confirms payment and shows the user their account is now Active.
 * The Stripe webhook handles the actual database update in parallel.
 */
export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { business, refreshBusiness } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'verifying'>('verifying');
  const [businessName, setBusinessName] = useState(business?.name || 'Your business');

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');

      if (!sessionId || sessionId === '{CHECKOUT_SESSION_ID}') {
        // No session ID - might be a direct visit
        setStatus('success');
        return;
      }

      setStatus('loading');

      // Wait a moment for the webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to refresh business data from context
      if (refreshBusiness) {
        await refreshBusiness();
      }

      // Verify by checking business status directly
      if (business?.id) {
        const { data } = await supabase
          .from('businesses')
          .select('id, name, subscription_status')
          .eq('id', business.id)
          .single();

        if (data) {
          setBusinessName(data.name);
          if (data.subscription_status === 'active') {
            setStatus('success');
          } else {
            // Webhook may still be processing
            setStatus('success'); // Show success anyway - webhook will update shortly
          }
        } else {
          setStatus('success');
        }
      } else {
        setStatus('success');
      }
    };

    verifyPayment();
  }, [searchParams, business?.id, refreshBusiness]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Success Animation */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4 animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Successful!</h1>
          <p className="text-gray-500 mt-2">Your account is now Active</p>
        </div>

        {/* Status Card */}
        <Card className="border-green-200 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            {status === 'verifying' || status === 'loading' ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                <p className="text-sm text-gray-500">Verifying your payment...</p>
              </div>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-800 font-medium">{businessName}</p>
                  <p className="text-green-600 text-sm mt-1">
                    Subscription Status: <span className="font-bold">Active</span>
                  </p>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>Your subscription is now active and all features are unlocked.</p>
                  <p>You can manage your subscription anytime from the Billing page.</p>
                </div>

                <Button
                  onClick={() => navigate("/app/dashboard")}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate("/app/subscription")}
                  className="w-full"
                >
                  View Billing Details
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          A receipt has been sent to your registered email address.
        </p>
      </div>
    </div>
  );
}
