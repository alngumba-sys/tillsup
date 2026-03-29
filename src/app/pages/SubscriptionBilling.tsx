import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useSubscription } from "../hooks/useSubscription";
import { SUBSCRIPTION_PLANS } from "../utils/subscription";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import {
  Crown,
  CheckCircle,
  AlertCircle,
  Calendar,
  CreditCard,
  Download,
  TrendingUp,
  Building2,
  Users,
  BarChart3,
  Zap,
  Shield,
  Info,
  Smartphone,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { stripePromise, createCheckoutSession, getStripePriceId, redirectToCheckout, type BillingCycle } from "../../lib/stripe";
import type { SubscriptionPlan, SubscriptionStatus } from "../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { getBadgeClassName, calculateSubscriptionStatus } from "../utils/subscriptionStatus";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUBSCRIPTION & BILLING MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Manage subscription plans
 * - View billing history
 * - Download invoices
 * - Upgrade/downgrade plans
 * - Monitor usage limits
 * 
 * ACCESS CONTROL:
 * - Business Owner only
 * 
 * SaaS PRINCIPLES:
 * - Transparent pricing
 * - Soft limits (warnings before blocking)
 * - No data deletion on downgrade
 * - Read-only mode on expiry
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Plan definitions
// Imported from utils/subscription.ts
// const SUBSCRIPTION_PLANS = ... removed

// Mock invoice data
interface Invoice {
  id: string;
  date: string;
  amount: number;
  plan: SubscriptionPlan;
  status: "paid" | "pending" | "failed";
  downloadUrl?: string;
}

export function SubscriptionBilling() {
  const { user, business } = useAuth();
  const { usage, plan: currentPlan, limits } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for successful payment return from Stripe
  useEffect(() => {
    if (searchParams.get("success") === "true" || searchParams.get("session_id")) {
      toast.success("Subscription Updated!", {
        description: "Your payment was successful and your plan has been upgraded."
      });
      // Clear the search params to prevent duplicate toasts on refresh
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("canceled") === "true") {
      toast.error("Payment Cancelled", {
        description: "You have not been charged."
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Only Business Owners can access this page
  if (!user || user.role !== "Business Owner" || !business) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only Business Owners can access subscription billing.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isTrialActive = business.subscriptionStatus === "trial";
  const isExpired = business.subscriptionStatus === "expired";
  const trialEndsAt = business.trialEndsAt ? new Date(business.trialEndsAt) : null;
  const daysUntilExpiry = trialEndsAt && !isNaN(trialEndsAt.getTime())
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Mock billing history
  const invoices: Invoice[] = [
    {
      id: "INV-2024-001",
      date: "2024-01-01",
      amount: currentPlan.price,
      plan: business.subscriptionPlan,
      status: "paid",
      downloadUrl: "#"
    }
  ];

  // Calculate usage
  const branchUsage = usage.branches;
  const staffUsage = usage.staff;

  const currencySymbol = business?.currency === "KES" ? "Kshs" : (business?.currency || "USD");
  const formatCurrency = (amount: number) => `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const allowedPlanKeys: SubscriptionPlan[] = ["Basic", "Pro", "Enterprise"];

  const handleUpgradePlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeDialog(true);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "mpesa">("stripe");
  const [mpesaPhone, setMpesaPhone] = useState("");

  const getDiscountRate = () => {
    if (billingCycle === "quarterly") return 0.1;
    if (billingCycle === "annual") return 0.2;
    return 0;
  };

  const getCycleLabel = () => {
    if (billingCycle === "quarterly") return "quarter";
    if (billingCycle === "annual") return "year";
    return "month";
  };

  const getDisplayPrice = (baseMonthlyPrice: number) => {
    if (billingCycle === "quarterly") {
      return (baseMonthlyPrice * 3) * (1 - getDiscountRate());
    }
    if (billingCycle === "annual") {
      return (baseMonthlyPrice * 12) * (1 - getDiscountRate());
    }
    return baseMonthlyPrice;
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan || !business) return;

    setIsProcessing(true);

    try {
      if (paymentProvider === "mpesa") {
        // M-PESA Payment Flow
        if (!mpesaPhone) {
          toast.error("Phone Number Required", {
            description: "Please enter your M-PESA phone number"
          });
          setIsProcessing(false);
          return;
        }

        // Format phone number
        let formattedPhone = mpesaPhone.replace(/^0/, '254').replace(/^\+/, '');
        if (!formattedPhone.startsWith('254')) {
          formattedPhone = `254${formattedPhone}`;
        }

        // Validate Kenyan phone number format
        if (!/^254[17]\d{8}$/.test(formattedPhone)) {
          toast.error("Invalid Phone Number", {
            description: "Please enter a valid Kenyan phone number"
          });
          setIsProcessing(false);
          return;
        }

        const planPrice = getDisplayPrice(SUBSCRIPTION_PLANS[selectedPlan].price);

        // Call M-PESA subscription edge function
        const { data, error } = await supabase.functions.invoke('mpesa-subscription', {
          body: {
            phoneNumber: formattedPhone,
            amount: planPrice,
            businessId: business.id,
            planId: selectedPlan,
            billingCycle,
          }
        });

        if (error) {
          throw new Error(error.message || 'M-PESA payment failed');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'M-PESA payment initiation failed');
        }

        toast.success("M-PESA Request Sent", {
          description: `STK Push sent to ${formattedPhone}. Please enter your M-PESA PIN.`
        });

        // Start polling for transaction status
        const checkoutRequestId = data.checkoutRequestId;
        let attempts = 0;
        const maxAttempts = 60;

        const pollInterval = setInterval(async () => {
          attempts++;
          
          const { data: txData } = await supabase
            .from('mpesa_transactions')
            .select('status, result_description, mpesa_receipt_number')
            .eq('checkout_request_id', checkoutRequestId)
            .single();

          if (txData?.status === 'completed') {
            clearInterval(pollInterval);
            
            // Update business subscription
            await supabase
              .from('businesses')
              .update({
                subscription_status: 'active',
                subscription_plan: selectedPlan,
                subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                trial_ends_at: null,
              })
              .eq('id', business.id);

            toast.success("Payment Successful!", {
              description: `Subscription upgraded to ${SUBSCRIPTION_PLANS[selectedPlan].name}. Receipt: ${txData.mpesa_receipt_number}`
            });
            setShowUpgradeDialog(false);
            setSelectedPlan(null);
            setMpesaPhone("");
            setIsProcessing(false);
          } else if (txData?.status === 'failed' || txData?.status === 'cancelled') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            toast.error("Payment Failed", {
              description: txData.result_description || "M-PESA payment was not completed"
            });
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setIsProcessing(false);
            toast.error("Payment Timeout", {
              description: "M-PESA payment timed out. Please try again."
            });
          }
        }, 1000);

      } else {
        // Stripe Payment Flow
        // 1. Get Stripe instance
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error("Stripe failed to initialize");
        }

        // 2. Map plan key for Stripe price ID
        const planKeyMap: Record<string, string> = {
          'Basic': 'basic',
          'Pro': 'professional',
          'Enterprise': 'ultra',
        };
        const planKey = planKeyMap[selectedPlan] || selectedPlan.toLowerCase();
        const country = business.country || 'KE';
        
        // 3. Get the correct Stripe Price ID
        const priceId = getStripePriceId(planKey, billingCycle, country);

        // 4. Create Checkout Session via Supabase Edge Function
        const session = await createCheckoutSession(
          priceId,
          business.id,
          selectedPlan,
          billingCycle,
          country
        );

        // 5. Handle mock session (development) vs real session (production)
        if (session.sessionId === 'cs_test_mock_session_id') {
           // Mock flow for development
           await new Promise(r => setTimeout(r, 1000));
           
           toast.success("Redirecting to Stripe...", {
             description: "In production, this redirects to the secure Stripe Checkout page."
           });
           
           // Simulate successful return - update status directly for demo
           setTimeout(async () => {
             // In demo mode, directly update the business to active
             await supabase
               .from('businesses')
               .update({
                 subscription_status: 'active',
                 subscription_plan: selectedPlan,
                 subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                 trial_ends_at: null,
               })
               .eq('id', business.id);

             toast.success("Plan Upgraded Successfully!", {
               description: `Your subscription has been upgraded to ${SUBSCRIPTION_PLANS[selectedPlan].name}`
             });
             setShowUpgradeDialog(false);
             setSelectedPlan(null);
             setIsProcessing(false);
           }, 1500);
           
           return;
        }

        // 6. Real flow - redirect to Stripe Checkout
        await redirectToCheckout(session.sessionId);
      }
      
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error("Payment initialization failed", {
        description: err.message || "Please try again later"
      });
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const statusResult = calculateSubscriptionStatus({
      subscription_status: status,
      trial_ends_at: business?.trialEndsAt,
      subscription_end_date: business?.subscriptionEndDate
    });
    const className = getBadgeClassName(statusResult.status);
    const label = statusResult.displayText;
    
    return (
      <Badge className={className}>
        {statusResult.status === 'active' || statusResult.status === 'trial_extended' ? (
          <CheckCircle className="w-3 h-3 mr-1" />
        ) : statusResult.status === 'trial' ? (
          <Info className="w-3 h-3 mr-1" />
        ) : (
          <AlertCircle className="w-3 h-3 mr-1" />
        )}
        {label}
      </Badge>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-1">Subscription & Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription plan and billing information
          </p>
        </div>
      </div>

      {/* Trial/Expiry Warning */}
      {isTrialActive && daysUntilExpiry <= 7 && (
        <Alert className="bg-yellow-50 border-yellow-300">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            Your trial expires in <strong>{daysUntilExpiry} days</strong>. 
            Upgrade now to continue using the platform without interruption.
          </AlertDescription>
        </Alert>
      )}

      {isExpired && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your subscription has expired. Please upgrade to regain full access. 
            Your data is safe and will be restored when you renew.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Card - Compact Version */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm mb-6 border-primary/20 bg-primary/5">
        <div className="flex flex-col lg:flex-row items-center justify-between p-3 sm:px-4 gap-4">
          
          {/* Left: Plan Info & Status */}
          <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-3">
               <div className="p-1.5 bg-background rounded-full border shadow-sm">
                  <Crown className="w-4 h-4 text-primary" />
               </div>
               <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Current Plan: {currentPlan.name}</h3>
                    {getStatusBadge(business.subscriptionStatus)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {business.subscriptionStatus === "trial" 
                      ? `${daysUntilExpiry} days remaining`
                      : `Billed ${currentPlan.period}`
                    }
                  </p>
               </div>
            </div>
          </div>

          {/* Middle: Stats (Horizontal) */}
          <div className="flex items-center gap-6 md:gap-8 w-full lg:w-auto justify-around lg:justify-center border-y lg:border-y-0 lg:border-x border-primary/10 py-2 lg:py-0 lg:px-6 bg-background/50 lg:bg-transparent rounded-md lg:rounded-none">
             <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <div className="text-center sm:text-left">
                   <p className="text-[10px] text-muted-foreground uppercase font-semibold">Branches</p>
                   <p className="text-sm font-bold leading-none">{branchUsage}/{limits.maxBranches === 999 ? "∞" : limits.maxBranches}</p>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2">
                <Users className="w-3.5 h-3.5 text-green-600" />
                <div className="text-center sm:text-left">
                   <p className="text-[10px] text-muted-foreground uppercase font-semibold">Staff</p>
                   <p className="text-sm font-bold leading-none">{staffUsage}/{limits.maxStaff === 999 ? "∞" : limits.maxStaff}</p>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2">
                <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                <div className="text-center sm:text-left">
                   <p className="text-[10px] text-muted-foreground uppercase font-semibold">Cost</p>
                   <p className="text-sm font-bold leading-none">{formatCurrency(getDisplayPrice(currentPlan.price))}</p>
                </div>
             </div>
          </div>

          {/* Right: Actions */}
          {(business.subscriptionStatus === "trial" || business.subscriptionStatus === "trial_extended" || business.subscriptionStatus === "expired" || business.subscriptionStatus === "past_due") && (
             <div className="w-full lg:w-auto flex justify-center lg:justify-end">
                <Button 
                   onClick={() => handleUpgradePlan("Pro")} 
                   size="sm"
                   className="h-8 text-xs font-medium px-4 shadow-sm w-full sm:w-auto"
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  {business.subscriptionStatus === "trial" || business.subscriptionStatus === "trial_extended" ? "Upgrade Now" : "Renew"}
                </Button>
             </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Available Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
        </TabsList>

        {/* Available Plans */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">
              Choose billing cycle: Quarterly saves 10%, Annual saves 20%.
            </p>
            <div className="flex gap-2">
              <Button
                variant={billingCycle === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={billingCycle === "quarterly" ? "default" : "outline"}
                size="sm"
                onClick={() => setBillingCycle("quarterly")}
              >
                Quarterly (10% off)
              </Button>
              <Button
                variant={billingCycle === "annual" ? "default" : "outline"}
                size="sm"
                onClick={() => setBillingCycle("annual")}
              >
                Annual (20% off)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-center">
            {(Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionPlan, typeof SUBSCRIPTION_PLANS[SubscriptionPlan]][])
              .filter(([key]) => allowedPlanKeys.includes(key))
              .map(([key, plan]) => {
                const isCurrent = key === business.subscriptionPlan;
                const isUpgrade = plan.price > currentPlan.price;
                
                // Extract key limits
                const branches = plan.limits.maxBranches === 999 ? "Unlimited" : plan.limits.maxBranches;
                const staff = plan.limits.maxStaff === 999 ? "Unlimited" : plan.limits.maxStaff;
                
                // Get transaction limit based on plan
                const getTransactionLimit = () => {
                  if (key === "Basic") return "1,000";
                  if (key === "Pro") return "10,000";
                  return "Unlimited";
                };
              
              // Get unique features (excluding the limit features)
              const uniqueFeatures = plan.highlightedFeatures.filter(f => 
                !f.includes("Branch") && !f.includes("Staff") && !f.includes("Transaction")
              ).slice(0, 3);

              return (
                <Card 
                  key={key}
                  className={`flex flex-col relative ${isCurrent ? "border-primary bg-primary/5 shadow-md" : "shadow-sm hover:shadow-md transition-shadow"}`}
                >
                  {isCurrent && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <Badge variant="default" className="h-5 text-[10px] px-2 shadow-sm">Current Plan</Badge>
                    </div>
                  )}
                  
                  <CardHeader className="p-4 pb-3 text-center">
                    <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold text-foreground">
                        {formatCurrency(getDisplayPrice(plan.price))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        /{plan.period === "14 days" ? "14 days" : getCycleLabel()}
                      </span>
                    </div>
                    {billingCycle !== "monthly" && (
                      <p className="text-[11px] text-green-700 mt-1">
                        Save {Math.round(getDiscountRate() * 100)}% from monthly billing
                      </p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                    {/* Key Metrics - Prominent */}
                    <div className="space-y-2 mb-4 pb-4 border-b">
                      <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-medium text-muted-foreground">Branches</span>
                        </div>
                        <span className="text-sm font-bold">{branches}</span>
                      </div>
                      
                      <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-muted-foreground">Staff</span>
                        </div>
                        <span className="text-sm font-bold">{staff}</span>
                      </div>
                      
                      <div className="flex items-center justify-between bg-purple-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-medium text-muted-foreground">Transactions</span>
                        </div>
                        <span className="text-sm font-bold">{getTransactionLimit()}</span>
                      </div>
                    </div>

                    {/* Unique Features */}
                    <div className="space-y-2 flex-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Key Features:</p>
                      <ul className="space-y-1.5">
                        {uniqueFeatures.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 space-y-2">
                      {!isCurrent ? (
                        <Button
                          variant={isUpgrade ? "default" : "outline"}
                          className={`w-full h-9 text-xs font-medium ${isUpgrade ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                          onClick={() => handleUpgradePlan(key)}
                        >
                          {isUpgrade ? "Upgrade" : "Switch Plan"}
                        </Button>
                      ) : (
                        <div className="h-9 flex items-center justify-center text-xs text-muted-foreground font-medium">
                          Your Current Plan
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-[11px] text-primary hover:text-primary"
                        onClick={() => {
                          const comparisonSection = document.getElementById('plan-comparison');
                          if (comparisonSection) {
                            window.scrollTo({
                              top: comparisonSection.offsetTop - 20,
                              behavior: 'smooth'
                            });
                          }
                        }}
                      >
                        View full feature table →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div id="plan-comparison" className="mt-8 border-t pt-6">
            <h2 className="text-2xl font-bold mb-3">Feature Comparison</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Compare Starter, Professional and Enterprise plan capabilities in one glance.
            </p>
            <div className="overflow-x-auto rounded-lg border border-muted/40 bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Feature</TableHead>
                    <TableHead className="text-center">Starter</TableHead>
                    <TableHead className="text-center">Professional</TableHead>
                    <TableHead className="text-center">Enterprise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold">Price</TableCell>
                    <TableCell className="text-center font-bold">{formatCurrency(getDisplayPrice(SUBSCRIPTION_PLANS["Basic"].price))}/{getCycleLabel()}</TableCell>
                    <TableCell className="text-center font-bold">{formatCurrency(getDisplayPrice(SUBSCRIPTION_PLANS["Pro"].price))}/{getCycleLabel()}</TableCell>
                    <TableCell className="text-center font-bold">{formatCurrency(getDisplayPrice(SUBSCRIPTION_PLANS["Enterprise"].price))}/{getCycleLabel()}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={4} className="font-bold text-xs uppercase tracking-wider">Usage Limits</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Branches</TableCell>
                    <TableCell className="text-center">2</TableCell>
                    <TableCell className="text-center">10</TableCell>
                    <TableCell className="text-center">Unlimited</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Staff Members</TableCell>
                    <TableCell className="text-center">10</TableCell>
                    <TableCell className="text-center">50</TableCell>
                    <TableCell className="text-center">Unlimited</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Monthly Transactions</TableCell>
                    <TableCell className="text-center">1,000</TableCell>
                    <TableCell className="text-center">10,000</TableCell>
                    <TableCell className="text-center">Unlimited</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={4} className="font-bold text-xs uppercase tracking-wider">Core Features</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>POS Terminal</TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Inventory Management</TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Advanced Reports</TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={4} className="font-bold text-xs uppercase tracking-wider">Advanced Features</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>AI Insights</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Purchase Orders</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Role-based Access</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Dedicated Account Manager</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Audit Logs</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>SLA Uptime Guarantee</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center"><span className="text-xs font-semibold">99.9%</span></TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={4} className="font-bold text-xs uppercase tracking-wider">Support</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Email Support</TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle className="w-4 h-4 text-green-600 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Priority Support</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center"><span className="text-xs font-semibold">24/7</span></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

        </TabsContent>

        {/* Billing History */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View and download past invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                        <TableCell>{SUBSCRIPTION_PLANS[invoice.plan].name}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(invoice.amount)}
                        </TableCell>
                        <TableCell>
                          {invoice.status === "paid" && (
                            <Badge className="bg-green-100 text-green-700">Paid</Badge>
                          )}
                          {invoice.status === "pending" && (
                            <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                          )}
                          {invoice.status === "failed" && (
                            <Badge className="bg-red-100 text-red-700">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No billing history yet</p>
                  <p className="text-sm mt-1">Invoices will appear here after your first payment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage & Limits */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage</CardTitle>
              <CardDescription>
                Monitor your usage against plan limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Branches */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Branch Locations</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {branchUsage} / {limits.maxBranches === 999 ? "Unlimited" : limits.maxBranches}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${limits.maxBranches === 999 ? 0 : (branchUsage / limits.maxBranches) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Staff */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Staff Members</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {staffUsage} / {limits.maxStaff === 999 ? "Unlimited" : limits.maxStaff}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ 
                      width: `${limits.maxStaff === 999 ? 0 : (staffUsage / limits.maxStaff) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <p className="font-semibold mb-1">Soft Limits Policy</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>You'll receive warnings before reaching limits</li>
                    <li>Existing data is never deleted on downgrade</li>
                    <li>Read-only mode activates if subscription expires</li>
                    <li>Contact support for custom enterprise limits</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPlan && `Upgrade to ${SUBSCRIPTION_PLANS[selectedPlan].name}`}
            </DialogTitle>
            <DialogDescription>
              Confirm your plan change
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4">
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Plan</span>
                      <span className="font-semibold">{SUBSCRIPTION_PLANS[selectedPlan].name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-semibold text-lg">
                        {formatCurrency(getDisplayPrice(SUBSCRIPTION_PLANS[selectedPlan].price))}/{getCycleLabel()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Billing</span>
                      <span className="font-medium">
                        {billingCycle === "quarterly"
                          ? "Quarterly (10% off)"
                          : billingCycle === "annual"
                            ? "Annual (20% off)"
                            : "Monthly"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Payment Method</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider("stripe")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      paymentProvider === "stripe"
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-white border-border hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">Card (Stripe)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentProvider("mpesa")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      paymentProvider === "mpesa"
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : 'bg-white border-border hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="font-medium">M-PESA</span>
                  </button>
                </div>
              </div>

              {/* M-PESA Phone Number Input */}
              {paymentProvider === "mpesa" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">M-PESA Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="07XXXXXXXX or 254XXXXXXXXX"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    An STK Push will be sent to this number. Enter your M-PESA PIN to complete payment.
                  </p>
                </div>
              )}

              {paymentProvider === "stripe" && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    Secure payment processed by Stripe. You will be redirected to Stripe Checkout.
                  </AlertDescription>
                </Alert>
              )}

              {paymentProvider === "mpesa" && (
                <Alert className="bg-emerald-50 border-emerald-200">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-900 text-sm">
                    M-PESA STK Push will be sent to your phone. Ensure you have sufficient M-PESA balance.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmUpgrade} 
              disabled={isProcessing || (paymentProvider === "mpesa" && !mpesaPhone)}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : paymentProvider === "mpesa" ? (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Pay with M-PESA
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Confirm Upgrade
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}