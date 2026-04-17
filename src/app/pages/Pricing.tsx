import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  Store,
  ArrowLeft,
  Building2,
  Users,
  BarChart3,
  CheckCircle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useBranding } from "../contexts/BrandingContext";
import { SUBSCRIPTION_PLANS } from "../utils/subscription";
import { fetchPricing, getCountryPricing, COUNTRY_CONFIG, type PricingData, type CountryPricing } from "../utils/pricingApi";
import type { SubscriptionPlan } from "../contexts/AuthContext";

type BillingCycle = "monthly" | "quarterly" | "annual";

// Plans to show on the public pricing page
const ALLOWED_PLANS: SubscriptionPlan[] = ["Basic", "Pro", "Enterprise"];

// Map plan key to internal pricing key
const PLAN_KEY_MAP: Record<string, "basic" | "professional" | "ultra"> = {
  Basic: "basic",
  Pro: "professional",
  Enterprise: "ultra",
};

const getDiscountRate = (cycle: BillingCycle, countryPricing: CountryPricing | null): number => {
  if (cycle === "quarterly") return (countryPricing?.quarterly_discount || 10) / 100;
  if (cycle === "annual") return (countryPricing?.annual_discount || 20) / 100;
  return 0;
};

const getCycleLabel = (cycle: BillingCycle): string => {
  if (cycle === "quarterly") return "quarter";
  if (cycle === "annual") return "year";
  return "month";
};

// Countries available for selection
const COUNTRIES = Object.entries(COUNTRY_CONFIG).map(([code, cfg]) => ({
  code,
  ...cfg,
}));

export function Pricing() {
  const navigate = useNavigate();
  const { assets } = useBranding();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch pricing from database on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPricing();
        if (!cancelled) setPricingData(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // IP-based country detection
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        const country = COUNTRIES.find((c) => c.code === data.country_code);
        if (country) {
          setSelectedCountry(country);
        }
      } catch {
        // Use default (Kenya)
      }
    };
    detectCountry();
  }, []);

  const currencySymbol = selectedCountry.symbol;
  const countryPricing = pricingData ? getCountryPricing(pricingData, selectedCountry.code) : null;

  const formatCurrency = (amount: number) =>
    `${currencySymbol} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Get the price for a plan adjusted for country and billing cycle
  const getPrice = (planKey: SubscriptionPlan): number => {
    if (!countryPricing) return 0;
    const internalKey = PLAN_KEY_MAP[planKey];
    const price = countryPricing[`${internalKey}_${billingCycle}`] || 0;
    return price;
  };

  // Transaction limits matching the authenticated view
  const getTransactionLimit = (key: SubscriptionPlan): string => {
    if (key === "Basic") return "1,000";
    if (key === "Pro") return "10,000";
    return "Unlimited";
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#0f172a", color: "#e2e8f0" }}
    >
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background: "rgba(15, 23, 42, 0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-[Mulish]"
                style={{ color: "#94a3b8" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#94a3b8";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div
                className="flex items-center cursor-pointer"
                onClick={() => navigate("/")}
                style={{
                  width: "clamp(120px, 18vw, 160px)",
                  height: "40px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {assets.logoMain ? (
                  <img
                    src={assets.logoMain}
                    alt="Tillsup"
                    className="h-10 w-auto object-contain"
                    style={{ background: "transparent" }}
                  />
                ) : (
                  <div
                    className="flex items-center gap-3"
                    style={{ opacity: 0, pointerEvents: "none" }}
                  >
                    <div className="p-2 rounded-lg" style={{ background: "#00719C" }}>
                      <Store className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold">Tillsup</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 transition-colors font-[Mulish]"
                style={{ color: "#94a3b8" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-6 py-2 rounded-lg font-semibold transition-all font-[Mulish]"
                style={{
                  background: "#ef4444",
                  color: "white",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(239, 68, 68, 0.4)";
                }}
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4 font-[Mulish]"
            style={{ color: "#ffffff" }}
          >
            Choose Your Plan
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto font-[Mulish]"
            style={{ color: "#94a3b8" }}
          >
            Select the perfect plan for your business. All plans include a 14-day free trial with full Enterprise access.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#00719C" }} />
            <span className="ml-3 text-lg" style={{ color: "#94a3b8" }}>Loading pricing...</span>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        {!loading && (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg p-3 mb-8"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            Choose billing cycle: Quarterly saves {countryPricing?.quarterly_discount || 10}%, Annual saves {countryPricing?.annual_discount || 20}%.
          </p>
          <div className="flex gap-2">
            {(["monthly", "quarterly", "annual"] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all font-[Mulish]"
                style={{
                  background:
                    billingCycle === cycle ? "#00719C" : "transparent",
                  color: billingCycle === cycle ? "#ffffff" : "#94a3b8",
                  border:
                    billingCycle === cycle
                      ? "1px solid #00719C"
                      : "1px solid rgba(255,255,255,0.2)",
                }}
                onMouseEnter={(e) => {
                  if (billingCycle !== cycle) {
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (billingCycle !== cycle) {
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  }
                }}
              >
                {cycle === "monthly" && "Monthly"}
                {cycle === "quarterly" && "Quarterly (10% off)"}
                {cycle === "annual" && "Annual (20% off)"}
              </button>
            ))}
          </div>
        </div>
        )}

        {!loading && (
        <>
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center mb-16">
          {ALLOWED_PLANS.map((planKey) => {
            const plan = SUBSCRIPTION_PLANS[planKey];
            const isPopular = planKey === "Pro";
            const price = getPrice(planKey);

            // Extract key limits
            const branches =
              plan.limits.maxBranches === 999
                ? "Unlimited"
                : String(plan.limits.maxBranches);
            const staff =
              plan.limits.maxStaff === 999
                ? "Unlimited"
                : String(plan.limits.maxStaff);
            const transactions = getTransactionLimit(planKey);

            // Get unique features (excluding the limit features already shown in metrics)
            const uniqueFeatures = plan.highlightedFeatures
              .filter(
                (f) =>
                  !f.includes("Branch") &&
                  !f.includes("Staff") &&
                  !f.includes("Transaction")
              )
              .slice(0, 3);

            return (
              <div
                key={planKey}
                className="flex flex-col relative rounded-2xl p-6 transition-all"
                style={{
                  background: isPopular
                    ? "rgba(0, 113, 156, 0.1)"
                    : "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(12px)",
                  border: isPopular
                    ? "1px solid rgba(0, 113, 156, 0.4)"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: isPopular
                    ? "0 8px 32px rgba(0, 113, 156, 0.15)"
                    : "none",
                }}
              >
                {isPopular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold"
                    style={{ background: "#00719C", color: "#ffffff" }}
                  >
                    Most Popular
                  </div>
                )}

                {/* Card Header */}
                <div className="text-center mb-6">
                  <h3
                    className="text-xl font-bold mb-1 font-[Mulish]"
                    style={{ color: "#ffffff" }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-sm" style={{ color: "#94a3b8" }}>
                    {plan.description}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span
                        className="text-4xl font-bold font-[Mulish]"
                        style={{ color: "#ffffff" }}
                      >
                        {formatCurrency(price)}
                      </span>
                      <span className="text-sm" style={{ color: "#64748b" }}>
                        /{getCycleLabel(billingCycle)}
                      </span>
                    </div>
                    {billingCycle !== "monthly" && (
                      <p className="text-xs mt-1" style={{ color: "#10b981" }}>
                        Save {Math.round(getDiscountRate(billingCycle, countryPricing) * 100)}% from monthly billing
                      </p>
                    )}
                  </div>
                </div>

                {/* Key Metrics */}
                <div
                  className="space-y-2 mb-4 pb-4"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div
                    className="flex items-center justify-between p-2 rounded"
                    style={{ background: "rgba(59, 130, 246, 0.1)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" style={{ color: "#3b82f6" }} />
                      <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>
                        Branches
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>
                      {branches}
                    </span>
                  </div>

                  <div
                    className="flex items-center justify-between p-2 rounded"
                    style={{ background: "rgba(16, 185, 129, 0.1)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: "#10b981" }} />
                      <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>
                        Staff
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>
                      {staff}
                    </span>
                  </div>

                  <div
                    className="flex items-center justify-between p-2 rounded"
                    style={{ background: "rgba(168, 85, 247, 0.1)" }}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" style={{ color: "#a855f7" }} />
                      <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>
                        Transactions
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>
                      {transactions}
                    </span>
                  </div>
                </div>

                {/* Unique Features */}
                <div className="space-y-2 flex-1">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "#64748b" }}
                  >
                    Key Features:
                  </p>
                  <ul className="space-y-1.5">
                    {uniqueFeatures.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs"
                        style={{ color: "#94a3b8" }}
                      >
                        <CheckCircle
                          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                          style={{ color: "#10b981" }}
                        />
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="mt-6">
                  <button
                    onClick={() => navigate("/register")}
                    className="w-full py-3 rounded-xl font-semibold transition-all font-[Mulish] flex items-center justify-center gap-2"
                    style={
                      isPopular
                        ? {
                            background: "#00719C",
                            color: "#ffffff",
                            boxShadow: "0 4px 14px rgba(0, 113, 156, 0.4)",
                          }
                        : {
                            background: "transparent",
                            color: "#e2e8f0",
                            border: "1px solid rgba(255,255,255,0.2)",
                          }
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      if (isPopular) {
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 113, 156, 0.5)";
                      } else {
                        e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      if (isPopular) {
                        e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 113, 156, 0.4)";
                      } else {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                      }
                    }}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Start Free Trial
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table - Always Visible */}
        <div id="plan-comparison" className="mt-8">
          <h2
            className="text-2xl font-bold mb-3 font-[Mulish]"
            style={{ color: "#ffffff" }}
          >
            Feature Comparison
          </h2>
          <p className="text-sm mb-4" style={{ color: "#94a3b8" }}>
            Compare Starter, Professional and Enterprise plan capabilities in one glance.
          </p>
          <div
            className="overflow-x-auto rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th
                    className="text-left py-4 px-4 font-[Mulish] font-medium"
                    style={{ color: "#e2e8f0", width: "220px" }}
                  >
                    Feature
                  </th>
                  <th
                    className="text-center py-4 px-4 font-[Mulish] font-medium"
                    style={{ color: "#e2e8f0" }}
                  >
                    Starter
                  </th>
                  <th
                    className="text-center py-4 px-4 font-[Mulish] font-medium"
                    style={{ color: "#e2e8f0" }}
                  >
                    Professional
                  </th>
                  <th
                    className="text-center py-4 px-4 font-[Mulish] font-medium"
                    style={{ color: "#e2e8f0" }}
                  >
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Price Row */}
                <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                  <td className="py-3 px-4 font-semibold" style={{ color: "#e2e8f0" }}>
                    Price
                  </td>
                  <td className="text-center py-3 px-4 font-bold" style={{ color: "#ffffff" }}>
                    {formatCurrency(getPrice("Basic"))}/{getCycleLabel(billingCycle)}
                  </td>
                  <td className="text-center py-3 px-4 font-bold" style={{ color: "#ffffff" }}>
                    {formatCurrency(getPrice("Pro"))}/{getCycleLabel(billingCycle)}
                  </td>
                  <td className="text-center py-3 px-4 font-bold" style={{ color: "#ffffff" }}>
                    {formatCurrency(getPrice("Enterprise"))}/{getCycleLabel(billingCycle)}
                  </td>
                </tr>
                {/* Section: Usage Limits */}
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <td
                    colSpan={4}
                    className="py-2 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{ color: "#64748b" }}
                  >
                    Usage Limits
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td className="py-3 px-4" style={{ color: "#94a3b8" }}>Branches</td>
                  <td className="text-center py-3 px-4" style={{ color: "#94a3b8" }}>2</td>
                  <td className="text-center py-3 px-4" style={{ color: "#94a3b8" }}>10</td>
                  <td className="text-center py-3 px-4 font-semibold" style={{ color: "#00719C" }}>Unlimited</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td className="py-3 px-4" style={{ color: "#94a3b8" }}>Staff Members</td>
                  <td className="text-center py-3 px-4" style={{ color: "#94a3b8" }}>10</td>
                  <td className="text-center py-3 px-4" style={{ color: "#94a3b8" }}>50</td>
                  <td className="text-center py-3 px-4 font-semibold" style={{ color: "#00719C" }}>Unlimited</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td className="py-3 px-4" style={{ color: "#94a3b8" }}>Monthly Transactions</td>
                  <td className="text-center py-3 px-4" style={{ color: "#94a3b8" }}>1,000</td>
                  <td className="text-center py-3 px-4" style={{ color: "#94a3b8" }}>10,000</td>
                  <td className="text-center py-3 px-4 font-semibold" style={{ color: "#00719C" }}>Unlimited</td>
                </tr>
                {/* Section: Core Features */}
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <td
                    colSpan={4}
                    className="py-2 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{ color: "#64748b" }}
                  >
                    Core Features
                  </td>
                </tr>
                {[
                  "POS Terminal",
                  "Inventory Management",
                  "Advanced Reports",
                ].map((feature) => (
                  <tr
                    key={feature}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <td className="py-3 px-4" style={{ color: "#94a3b8" }}>{feature}</td>
                    <td className="text-center py-3 px-4">
                      <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                    </td>
                    <td className="text-center py-3 px-4">
                      <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                    </td>
                    <td className="text-center py-3 px-4">
                      <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                    </td>
                  </tr>
                ))}
                {/* Section: Advanced Features */}
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <td
                    colSpan={4}
                    className="py-2 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{ color: "#64748b" }}
                  >
                    Advanced Features
                  </td>
                </tr>
                {[
                  { feature: "AI Insights", basic: false, pro: true, enterprise: true },
                  { feature: "Purchase Orders", basic: false, pro: false, enterprise: true },
                  { feature: "Role-based Access", basic: false, pro: true, enterprise: true },
                  { feature: "Dedicated Account Manager", basic: false, pro: false, enterprise: true },
                  { feature: "Audit Logs", basic: false, pro: true, enterprise: true },
                  { feature: "SLA Uptime Guarantee", basic: false, pro: false, enterprise: true, enterpriseText: "99.9%" },
                ].map(({ feature, basic, pro, enterprise, enterpriseText }) => (
                  <tr
                    key={feature}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <td className="py-3 px-4" style={{ color: "#94a3b8" }}>{feature}</td>
                    <td className="text-center py-3 px-4">
                      {basic ? (
                        <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                      ) : (
                        <span style={{ color: "#475569" }}>—</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {pro ? (
                        <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                      ) : (
                        <span style={{ color: "#475569" }}>—</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {enterpriseText ? (
                        <span className="text-xs font-semibold" style={{ color: "#00719C" }}>{enterpriseText}</span>
                      ) : enterprise ? (
                        <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                      ) : (
                        <span style={{ color: "#475569" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Section: Support */}
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <td
                    colSpan={4}
                    className="py-2 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{ color: "#64748b" }}
                  >
                    Support
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td className="py-3 px-4" style={{ color: "#94a3b8" }}>Email Support</td>
                  <td className="text-center py-3 px-4">
                    <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                  </td>
                  <td className="text-center py-3 px-4">
                    <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                  </td>
                  <td className="text-center py-3 px-4">
                    <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "#10b981" }} />
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4" style={{ color: "#94a3b8" }}>Priority Support</td>
                  <td className="text-center py-3 px-4">
                    <span style={{ color: "#475569" }}>—</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span style={{ color: "#475569" }}>—</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="text-xs font-semibold" style={{ color: "#00719C" }}>24/7</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <div
            className="rounded-3xl p-12 text-center"
            style={{
              background: "rgba(0, 113, 156, 0.1)",
              border: "1px solid rgba(0, 113, 156, 0.2)",
              backdropFilter: "blur(12px)",
            }}
          >
            <h2
              className="text-4xl font-bold mb-4 font-[Mulish]"
              style={{ color: "#ffffff" }}
            >
              Ready to Get Started?
            </h2>
            <p className="text-lg mb-8" style={{ color: "#94a3b8" }}>
              Join thousands of businesses modernizing their operations with Tillsup
            </p>
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-4 rounded-xl font-bold text-lg transition-all font-[Mulish]"
              style={{
                background: "#ef4444",
                color: "white",
                boxShadow: "0 8px 24px rgba(239, 68, 68, 0.4)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(239, 68, 68, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(239, 68, 68, 0.4)";
              }}
            >
              Create Your Account
            </button>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Footer */}
      <footer
        className="py-8 px-4 sm:px-6 lg:px-8"
        style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {assets.logoFooter ? (
              <img
                src={assets.logoFooter}
                alt="Tillsup Logo"
                className="h-8 w-auto object-contain"
              />
            ) : assets.logoMain ? (
              <img
                src={assets.logoMain}
                alt="Tillsup Logo"
                className="h-8 w-auto object-contain"
              />
            ) : (
              <>
                <div className="p-1.5 rounded" style={{ background: "#00719C" }}>
                  <Store className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold" style={{ color: "#64748b" }}>
                  Tillsup
                </span>
              </>
            )}
          </div>
          <div className="text-sm" style={{ color: "#64748b" }}>
            © 2026 Tillsup. Enterprise POS for Africa.
          </div>
        </div>
      </footer>
    </div>
  );
}
