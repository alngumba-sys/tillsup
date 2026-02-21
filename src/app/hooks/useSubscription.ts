import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { getPlanDetails, hasFeature, PlanFeatures, SubscriptionPlanDetails } from "../utils/subscription";

export interface SubscriptionContextType {
  plan: SubscriptionPlanDetails;
  features: PlanFeatures;
  usage: {
    branches: number;
    staff: number;
  };
  limits: {
    maxBranches: number;
    maxStaff: number;
  };
  checkLimit: (resource: "branches" | "staff", currentCount: number) => boolean;
  canCreateBranch: () => boolean;
  canCreateStaff: () => boolean;
  hasFeature: (feature: keyof PlanFeatures) => boolean;
}

export function useSubscription(): SubscriptionContextType {
  const { user, business, getStaffMembers } = useAuth();
  const { branches } = useBranch();

  // Safe fallback if context is not ready
  const currentPlanName = business?.subscriptionPlan || "Free Trial";
  const planDetails = getPlanDetails(currentPlanName);

  // Calculate usage
  const branchUsage = branches ? branches.length : 0;
  const staffUsage = getStaffMembers ? getStaffMembers().length : 0;

  // Check limits
  const checkLimit = (resource: "branches" | "staff", currentCount: number) => {
    if (resource === "branches") {
      return currentCount < planDetails.limits.maxBranches;
    }
    if (resource === "staff") {
      return currentCount < planDetails.limits.maxStaff;
    }
    return false;
  };

  const canCreateBranch = () => {
    // Enterprise plan has effective unlimited (999)
    if (planDetails.limits.maxBranches >= 999) return true;
    return branchUsage < planDetails.limits.maxBranches;
  };

  const canCreateStaff = () => {
    if (planDetails.limits.maxStaff >= 999) return true;
    return staffUsage < planDetails.limits.maxStaff;
  };

  const checkFeature = (feature: keyof PlanFeatures) => {
    return hasFeature(currentPlanName, feature);
  };

  return {
    plan: planDetails,
    features: planDetails.features,
    usage: {
      branches: branchUsage,
      staff: staffUsage
    },
    limits: planDetails.limits,
    checkLimit,
    canCreateBranch,
    canCreateStaff,
    hasFeature: checkFeature
  };
}
