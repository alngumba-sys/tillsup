import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  Check, 
  ArrowRight, 
  Sparkles, 
  Building2,
  Globe,
  ChevronDown,
  X,
  Store,
  ArrowLeft
} from "lucide-react";
import { useBranding } from "../contexts/BrandingContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";

// Country configuration
const COUNTRIES = [
  { code: 'KE', name: 'Kenya', currency: 'Ksh', symbol: 'Ksh' },
  { code: 'GH', name: 'Ghana', currency: 'GH¢', symbol: 'GH¢' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', symbol: 'ETB' },
];

// Pricing data - Load from localStorage (set by admin) or use defaults
const getPricingData = (): Record<string, any> => {
  const saved = localStorage.getItem('tillsup-pricing-data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Convert admin format to pricing page format
      const converted: Record<string, any> = {};
      Object.keys(parsed).forEach(country => {
        converted[country] = {
          basic: {
            monthly: parsed[country].basic_monthly,
            quarterly: parsed[country].basic_quarterly,
            annual: parsed[country].basic_annual
          },
          professional: {
            monthly: parsed[country].professional_monthly,
            quarterly: parsed[country].professional_quarterly,
            annual: parsed[country].professional_annual
          },
          discounts: {
            quarterly: parsed[country].quarterly_discount || 10,
            annual: parsed[country].annual_discount || 20
          }
        };
      });
      return converted;
    } catch {
      // Fall back to defaults if parsing fails
    }
  }
  
  // Default pricing
  return {
    KE: {
      basic: { monthly: 999, quarterly: 2697, annual: 9588 },
      professional: { monthly: 2499, quarterly: 6747, annual: 23988 },
      discounts: { quarterly: 10, annual: 20 }
    },
    GH: {
      basic: { monthly: 150, quarterly: 405, annual: 1440 },
      professional: { monthly: 350, quarterly: 945, annual: 3360 },
      discounts: { quarterly: 10, annual: 20 }
    },
    ET: {
      basic: { monthly: 500, quarterly: 1350, annual: 4800 },
      professional: { monthly: 1200, quarterly: 3240, annual: 11520 },
      discounts: { quarterly: 10, annual: 20 }
    },
  };
};

// Feature comparison data
const FEATURES = {
  basic: [
    'Up to 2 branches',
    'Up to 100 transactions/month',
    'Basic invoicing & sales tracking',
    'Simple customer management',
    'Manual inventory tracking',
    'Basic reporting (daily/weekly)',
    '1 payment gateway (M-Pesa)',
    'Owner + 1 staff account',
    'Mobile app (view-only)',
    'No AI features'
  ],
  professional: [
    'Up to 5 branches',
    'Unlimited transactions',
    'Advanced invoicing & recurring billing',
    'Customer CRM with segmentation',
    'Auto-alerts & barcode support',
    'Detailed reporting (PDF/Excel export)',
    'Multiple payment gateways',
    'Owner + up to 5 staff accounts',
    'Mobile app (full editing)',
    'Limited AI (50 uses/month)'
  ],
  enterprise: [
    'Unlimited branches',
    'Unlimited transactions',
    'Enterprise CRM & loyalty programs',
    'Multi-location inventory sync',
    'Custom reporting dashboards',
    'Unlimited payment integrations',
    'Unlimited staff & role-based access',
    'Priority support (24/7)',
    'Custom branding & white-labeling',
    'Full AI access (unlimited)'
  ]
};

export function Pricing() {
  const navigate = useNavigate();
  const { assets } = useBranding();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Default to Kenya
  const [showComparison, setShowComparison] = useState(false);
  const [pricingData, setPricingData] = useState(getPricingData());

  // IP-based country detection (simplified - in production, use ipapi.co or similar)
  useEffect(() => {
    // Detect country from IP (placeholder - implement actual IP detection)
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const country = COUNTRIES.find(c => c.code === data.country_code);
        if (country) {
          setSelectedCountry(country);
        }
      } catch (error) {
        console.log('Using default country (Kenya)');
      }
    };
    detectCountry();

    // Refresh pricing data on mount (in case admin updated it)
    setPricingData(getPricingData());
  }, []);

  const getPricing = (tier: 'basic' | 'professional') => {
    const countryPricing = pricingData[selectedCountry.code];
    if (!countryPricing) return { monthly: 0, quarterly: 0, annual: 0 };
    return countryPricing[tier];
  };

  const getDiscounts = () => {
    const countryPricing = pricingData[selectedCountry.code];
    if (!countryPricing) return { quarterly: 10, annual: 20 };
    return countryPricing.discounts || { quarterly: 10, annual: 20 };
  };

  const formatPrice = (amount: number) => {
    return `${selectedCountry.symbol} ${amount.toLocaleString()}`;
  };

  const tiers = [
    {
      id: 'basic',
      name: 'Basic',
      description: 'Perfect for small businesses getting started',
      features: FEATURES.basic,
      popular: false,
      cta: 'Start Free Trial',
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Ideal for growing businesses',
      features: FEATURES.professional,
      popular: true,
      cta: 'Start Free Trial',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Custom solutions for large organizations',
      features: FEATURES.enterprise,
      popular: false,
      cta: 'Contact Sales',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-white/10 font-[Mulish]"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div
                className="flex items-center cursor-pointer"
                onClick={() => navigate("/")}
                style={{
                  width: 'clamp(120px, 18vw, 160px)',
                  height: '40px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {assets.logoMain ? (
                  <img
                    src={assets.logoMain}
                    alt="Tillsup"
                    className="h-10 w-auto object-contain"
                    style={{ background: 'transparent' }}
                  />
                ) : (
                  <div className="flex items-center gap-3" style={{ opacity: 0, pointerEvents: 'none' }}>
                    <div className="bg-[#00719C] p-2 rounded-lg">
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
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors font-[Mulish]"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate("/register")}
                className="px-6 py-2 bg-[#00719C] hover:bg-[#0e7490] rounded-lg font-semibold transition-all shadow-md hover:shadow-lg font-[Mulish]"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Trial Banner */}
      <div className="pt-16 bg-blue-600/20 border-b border-cyan-500/30 backdrop-blur-lg py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left m-[0px]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold text-lg font-[Mulish]">
                Start a 14-Day Free Trial – Access Everything, No Credit Card Required
              </span>
            </div>
            <button 
              onClick={() => navigate("/register")}
              className="px-6 py-2.5 bg-[#ED363F] hover:bg-red-600 rounded-lg font-semibold transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 font-[Mulish]"
            >
              Sign Up Now
              <ArrowRight className="w-4 h-4 ml-2 inline" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 font-[Mulish]">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto font-[Mulish]">
            Select the perfect plan for your business. All plans include a 14-day free trial with full Enterprise access.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-6 mb-16">
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-lg p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all font-[Mulish] ${
                billingPeriod === 'monthly'
                  ? 'bg-[#00719C] text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('quarterly')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all font-[Mulish] ${
                billingPeriod === 'quarterly'
                  ? 'bg-[#00719C] text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Quarterly
              <Badge className="ml-2 bg-green-600 text-white border-0">Save {getDiscounts().quarterly}%</Badge>
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all font-[Mulish] ${
                billingPeriod === 'annual'
                  ? 'bg-[#00719C] text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Annual
              <Badge className="ml-2 bg-green-600 text-white border-0">Save {getDiscounts().annual}%</Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier) => {
            const pricing = tier.id !== 'enterprise' ? getPricing(tier.id as 'basic' | 'professional') : null;
            const price = pricing ? pricing[billingPeriod] : null;

            return (
              <div
                key={tier.id}
                className={`relative bg-white/5 backdrop-blur-lg rounded-2xl p-8 border transition-all hover:shadow-xl ${
                  tier.popular
                    ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'border-white/10 hover:border-cyan-500/30'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00719C] px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2 font-[Mulish]">{tier.name}</h3>
                  <p className="text-slate-400">{tier.description}</p>
                  <div className="mt-6">
                    {tier.id === 'enterprise' ? (
                      <div className="text-4xl font-bold">Custom</div>
                    ) : (
                      <>
                        <div className="text-5xl font-bold font-[Mulish]">
                          {formatPrice(price!)}
                        </div>
                        <div className="text-slate-400 mt-2">
                          per {billingPeriod === 'monthly' ? 'month' : billingPeriod === 'quarterly' ? 'quarter' : 'year'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => 
                    tier.id === 'enterprise' 
                      ? window.location.href = 'mailto:sales@tillsup.com'
                      : navigate("/register")
                  }
                  className={`w-full py-3 rounded-xl font-semibold transition-all mb-8 font-[Mulish] ${
                    tier.popular
                      ? 'bg-[#00719C] hover:bg-[#0e7490] text-white shadow-lg'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  {tier.cta}
                </button>
                <ul className="space-y-4">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Compare All Features */}
        <div className="max-w-4xl mx-auto mb-16">
          <Collapsible open={showComparison} onOpenChange={setShowComparison}>
            <CollapsibleTrigger asChild>
              <button className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-xl py-3 px-6 border border-white/20 transition-all font-[Mulish] font-semibold flex items-center justify-center gap-2">
                {showComparison ? 'Hide' : 'Compare All Features'}
                <ChevronDown className={`w-4 h-4 transition-transform ${showComparison ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-6">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
                <h3 className="text-2xl font-bold mb-2 font-[Mulish]">Feature Comparison</h3>
                <p className="text-slate-400 mb-6">
                  Detailed breakdown of features across all plans
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-4 px-4 font-[Mulish]">Feature</th>
                        <th className="text-center py-4 px-4 font-[Mulish]">Basic</th>
                        <th className="text-center py-4 px-4 font-[Mulish]">Professional</th>
                        <th className="text-center py-4 px-4 font-[Mulish]">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      <tr>
                        <td className="py-4 px-4 font-medium text-slate-300">Branches</td>
                        <td className="text-center py-4 px-4 text-slate-400">Up to 2</td>
                        <td className="text-center py-4 px-4 text-slate-400">Up to 5</td>
                        <td className="text-center py-4 px-4 text-cyan-400 font-semibold">Unlimited</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 font-medium text-slate-300">Transactions</td>
                        <td className="text-center py-4 px-4 text-slate-400">100/month</td>
                        <td className="text-center py-4 px-4 text-cyan-400 font-semibold">Unlimited</td>
                        <td className="text-center py-4 px-4 text-cyan-400 font-semibold">Unlimited</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 font-medium text-slate-300">Staff Accounts</td>
                        <td className="text-center py-4 px-4 text-slate-400">Owner + 1</td>
                        <td className="text-center py-4 px-4 text-slate-400">Owner + 5</td>
                        <td className="text-center py-4 px-4 text-cyan-400 font-semibold">Unlimited</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 font-medium text-slate-300">AI Features</td>
                        <td className="text-center py-4 px-4">
                          <X className="w-5 h-5 text-slate-600 mx-auto" />
                        </td>
                        <td className="text-center py-4 px-4 text-slate-400">50 uses/month</td>
                        <td className="text-center py-4 px-4 text-cyan-400 font-semibold">Unlimited</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 font-medium text-slate-300">Payment Gateways</td>
                        <td className="text-center py-4 px-4 text-slate-400">1 (M-Pesa)</td>
                        <td className="text-center py-4 px-4 text-slate-400">Multiple</td>
                        <td className="text-center py-4 px-4 text-cyan-400 font-semibold">Unlimited</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 font-medium text-slate-300">Reporting</td>
                        <td className="text-center py-4 px-4 text-slate-400">Basic</td>
                        <td className="text-center py-4 px-4 text-slate-400">Advanced</td>
                        <td className="text-center py-4 px-4 text-cyan-400 font-semibold">Custom Dashboards</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 font-medium text-slate-300">Support</td>
                        <td className="text-center py-4 px-4 text-slate-400">Email</td>
                        <td className="text-center py-4 px-4 text-slate-400">Email + Chat</td>
                        <td className="text-center py-4 px-4 text-cyan-400 font-semibold">24/7 Priority</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-blue-600/20 rounded-3xl p-12 border border-cyan-500/30 backdrop-blur-lg text-center">
            <h2 className="text-4xl font-bold mb-4 font-[Mulish]">Ready to Get Started?</h2>
            <p className="text-slate-300 text-lg mb-8">
              Join thousands of businesses modernizing their operations with Tillsup
            </p>
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-4 bg-[#ED363F] hover:bg-red-600 rounded-xl font-bold text-lg transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 font-[Mulish]"
            >
              Create Your Account
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {assets.logoFooter ? (
              <img src={assets.logoFooter} alt="Tillsup Logo" className="h-8 w-auto object-contain" />
            ) : assets.logoMain ? (
              <img src={assets.logoMain} alt="Tillsup Logo" className="h-8 w-auto object-contain" />
            ) : (
              <>
                <div className="bg-[#00719C] p-1.5 rounded">
                  <Store className="w-4 h-4" />
                </div>
                <span className="text-slate-400 text-sm font-semibold">Tillsup</span>
              </>
            )}
          </div>
          <div className="text-slate-400 text-sm">
            © 2026 Tillsup. Enterprise POS for Africa.
          </div>
        </div>
      </footer>
    </div>
  );
}