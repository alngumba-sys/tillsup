import type { SubscriptionPlan } from "../contexts/AuthContext";

export interface PlanLimits {
  maxBranches: number;
  maxStaff: number;
}

export interface PlanFeatures {
  basicPOS: boolean;
  fullPOS: boolean;
  inventory: boolean;
  basicReports: boolean;
  advancedReports: boolean;
  expenseTracking: boolean; // Basic tracking
  expenseManagement: boolean; // Full management
  forecasting: boolean;
  purchaseOrders: boolean;
  supplierManagement: boolean;
  customBranding: boolean;
  exportData: boolean;
  apiAccess: boolean;
  aiInsights: boolean;
  emailSupport: boolean;
  prioritySupport: boolean;
}

export interface SubscriptionPlanDetails {
  name: string;
  price: number;
  period: string;
  limits: PlanLimits;
  features: PlanFeatures;
  description: string; // For UI display
  highlightedFeatures: string[]; // List of strings for the pricing card
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanDetails> = {
  "Free Trial": {
    name: "Free Trial",
    price: 0,
    period: "14 days",
    limits: {
      maxBranches: 1,
      maxStaff: 5
    },
    features: {
      basicPOS: true,
      fullPOS: false,
      inventory: true,
      basicReports: true,
      advancedReports: false,
      expenseTracking: false,
      expenseManagement: false,
      forecasting: false,
      purchaseOrders: false,
      supplierManagement: false,
      customBranding: false,
      exportData: false,
      apiAccess: false,
      aiInsights: false,
      emailSupport: true,
      prioritySupport: false
    },
    description: "Trial period for new businesses",
    highlightedFeatures: [
      "1 Branch Location",
      "Up to 5 Staff Members",
      "Up to 100 Transactions",
      "Basic POS Terminal",
      "Inventory Management",
      "Sales Reports",
      "Email Support"
    ]
  },
  "Basic": {
    name: "Starter",
    price: 29,
    period: "month",
    limits: {
      maxBranches: 2,
      maxStaff: 10
    },
    features: {
      basicPOS: true,
      fullPOS: true,
      inventory: true,
      basicReports: true,
      advancedReports: true,
      expenseTracking: true,
      expenseManagement: false,
      forecasting: false,
      purchaseOrders: false,
      supplierManagement: false,
      customBranding: false,
      exportData: false,
      apiAccess: false,
      aiInsights: true,
      emailSupport: true,
      prioritySupport: false
    },
    description: "Perfect for small businesses getting started",
    highlightedFeatures: [
      "Up to 2 Branch Locations",
      "Up to 10 Staff Members",
      "Up to 1,000 Transactions",
      "Full POS Terminal",
      "Inventory Management",
      "Advanced Reports & Analytics",
      "Expense Tracking",
      "Email Support"
    ]
  },
  "Pro": {
    name: "Professional",
    price: 79,
    period: "month",
    limits: {
      maxBranches: 10,
      maxStaff: 50
    },
    features: {
      basicPOS: true,
      fullPOS: true,
      inventory: true,
      basicReports: true,
      advancedReports: true,
      expenseTracking: true,
      expenseManagement: true,
      forecasting: true,
      purchaseOrders: true,
      supplierManagement: true,
      customBranding: true,
      exportData: true,
      apiAccess: false,
      aiInsights: true,
      emailSupport: true,
      prioritySupport: true
    },
    description: "Ideal for growing businesses with multiple locations",
    highlightedFeatures: [
      "Up to 10 Branch Locations",
      "Up to 50 Staff Members",
      "Up to 10,000 Transactions",
      "Full POS Terminal",
      "Advanced Inventory & Forecasting",
      "Purchase Orders & Supplier Management",
      "Expense Management",
      "Advanced Analytics",
      "Custom Branding",
      "Priority Support"
    ]
  },
  "Enterprise": {
    name: "Enterprise",
    price: 199,
    period: "month",
    limits: {
      maxBranches: 999, // Effectively unlimited
      maxStaff: 999
    },
    features: {
      basicPOS: true,
      fullPOS: true,
      inventory: true,
      basicReports: true,
      advancedReports: true,
      expenseTracking: true,
      expenseManagement: true,
      forecasting: true,
      purchaseOrders: true,
      supplierManagement: true,
      customBranding: true,
      exportData: true,
      apiAccess: true,
      aiInsights: true,
      emailSupport: true,
      prioritySupport: true
    },
    description: "Complete solution for large enterprises",
    highlightedFeatures: [
      "Unlimited Branches",
      "Unlimited Staff Members",
      "Unlimited Transactions",
      "Full POS Terminal",
      "AI-Powered Forecasting",
      "Advanced Procurement",
      "White-Label Branding",
      "Custom Integrations",
      "24/7 Priority Support"
    ]
  }
};

export function getPlanDetails(plan: SubscriptionPlan): SubscriptionPlanDetails {
  return SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS["Free Trial"];
}

export function hasFeature(plan: SubscriptionPlan, feature: keyof PlanFeatures): boolean {
  return SUBSCRIPTION_PLANS[plan]?.features[feature] || false;
}
