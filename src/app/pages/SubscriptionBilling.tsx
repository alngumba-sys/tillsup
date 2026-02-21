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
  Smartphone
} from "lucide-react";
import { toast } from "sonner";
import { stripePromise, createCheckoutSession } from "../../lib/stripe";
import type { SubscriptionPlan, SubscriptionStatus } from "../contexts/AuthContext";

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
  const daysUntilExpiry = Math.ceil(
    (new Date(business.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

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

  const handleUpgradePlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeDialog(true);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const confirmUpgrade = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    
    try {
      // 1. Get Stripe instance
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to initialize");
      }

      // 2. Create Checkout Session (Mocked)
      // In a real app, this calls your backend: POST /api/create-checkout-session
      const session: any = await createCheckoutSession("price_mock_id", user?.id);

      // 3. Redirect to Checkout
      // Note: This fails with a mock session ID, so we just show success toast for demo
      if (session.sessionId === 'cs_test_mock_session_id') {
         // Fake delay
         await new Promise(r => setTimeout(r, 1000));
         
         toast.success("Redirecting to Stripe...", {
           description: "In production, this redirects to the secure Stripe Checkout page."
         });
         
         // Simulate successful return for demo purposes
         setTimeout(() => {
            toast.success("Plan Upgraded Successfully!", {
              description: `Your subscription has been upgraded to ${SUBSCRIPTION_PLANS[selectedPlan].name}`
            });
            setShowUpgradeDialog(false);
            setSelectedPlan(null);
            setIsProcessing(false);
         }, 1500);
         
         return;
      }
      
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.sessionId,
      });

      if (error) {
        throw error;
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
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "trial":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            <Info className="w-3 h-3 mr-1" />
            Trial ({daysUntilExpiry} days left)
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            Cancelled
          </Badge>
        );
    }
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
                   <p className="text-sm font-bold leading-none">${currentPlan.price}</p>
                </div>
             </div>
          </div>

          {/* Right: Actions */}
          {(business.subscriptionStatus === "trial" || business.subscriptionStatus === "expired") && (
             <div className="w-full lg:w-auto flex justify-center lg:justify-end">
                <Button 
                   onClick={() => handleUpgradePlan("Pro")} 
                   size="sm"
                   className="h-8 text-xs font-medium px-4 shadow-sm w-full sm:w-auto"
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  {business.subscriptionStatus === "trial" ? "Upgrade Now" : "Renew"}
                </Button>
             </div>
          )}
        </div>
      </div>

      {/* M-Pesa Payment Info (Kenya Only) */}
      {business.country === "Kenya" && (
        <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center">
            <CardHeader className="pb-2 xl:pb-6 flex flex-row items-center gap-4 space-y-0 xl:min-w-fit">
              <div className="p-2.5 bg-emerald-100 rounded-full border border-emerald-200">
                <Smartphone className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-lg text-emerald-900">M-PESA Payment Details</CardTitle>
                <CardDescription className="text-emerald-700">
                  Pay instantly via M-PESA
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0 xl:pt-6 xl:pl-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-md border border-emerald-100 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Pay To</p>
                  <p className="font-bold text-emerald-900">WEXLOT LTD PAYMENTS</p>
                </div>
                <div className="bg-white p-3 rounded-md border border-emerald-100 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Paybill Number</p>
                  <p className="font-mono font-bold text-xl text-emerald-800 tracking-wider">522533</p>
                </div>
                <div className="bg-white p-3 rounded-md border border-emerald-100 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Account Number</p>
                  <p className="font-mono font-bold text-emerald-800">8063089#NAME</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Example: <span className="font-medium">8063089#Edwin</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Available Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
        </TabsList>

        {/* Available Plans */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionPlan, typeof SUBSCRIPTION_PLANS[SubscriptionPlan]][]).map(([key, plan]) => {
              const isCurrent = key === business.subscriptionPlan;
              const isUpgrade = plan.price > currentPlan.price;

              return (
                <Card 
                  key={key}
                  className={`flex flex-col ${isCurrent ? "border-primary bg-primary/5 shadow-sm" : "shadow-sm"}`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
                        <CardDescription className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold text-foreground">
                            ${plan.price}
                          </span>
                          <span className="text-xs text-muted-foreground">/{plan.period === "14 days" ? "trial" : "mo"}</span>
                        </CardDescription>
                      </div>
                      {isCurrent && (
                        <Badge variant="default" className="h-5 text-[10px] px-1.5">Current</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex-1 flex flex-col">
                    <div className="space-y-3 flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Includes:</p>
                      <ul className="space-y-1.5">
                        {plan.highlightedFeatures.slice(0, 6).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {!isCurrent && (
                      <Button
                        variant={isUpgrade ? "default" : "outline"}
                        className="w-full mt-4 h-8 text-xs"
                        onClick={() => handleUpgradePlan(key)}
                      >
                        {isUpgrade ? "Upgrade" : "Switch"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
                          ${invoice.amount.toFixed(2)}
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
                        ${SUBSCRIPTION_PLANS[selectedPlan].price}/{SUBSCRIPTION_PLANS[selectedPlan].period}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Billing</span>
                      <span className="font-medium">Monthly</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  This is a demo. In production, this would integrate with Stripe/PayPal for secure payment processing.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUpgrade} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Confirm Upgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
