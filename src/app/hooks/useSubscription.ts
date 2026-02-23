import { useState, useEffect } from "react";
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
  
  // Safe branch context access
  let branches: any[] = [];
  try {
    const branchContext = useBranch();
    branches = branchContext.branches;
  } catch (e) {
    console.warn("useSubscription: BranchContext not available", e);
  }

  const [staffCount, setStaffCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    
    const fetchStaffCount = async () => {
      if (business && getStaffMembers) {
        try {
          const staff = await getStaffMembers();
          if (mounted) {
            setStaffCount(staff.length);
          }
        } catch (err) {
          console.error("Failed to fetch staff count for subscription check", err);
        }
      }
    };

    fetchStaffCount();

    return () => {
      mounted = false;
    };
  }, [business?.id, getStaffMembers]);

  // Safe fallback if context is not ready
  const currentPlanName = business?.subscriptionPlan || "Free Trial";
  const planDetails = getPlanDetails(currentPlanName);

  // Calculate usage
  const branchUsage = branches ? branches.length : 0;
  const staffUsage = staffCount;

  // Check limits
  const checkLimit = (resource: "branches" | "staff", currentCount: number) => {
    // Override for Demo User
    if (user?.email === "demo@test.com") return true;

    if (resource === "branches") {
      return currentCount < planDetails.limits.maxBranches;
    }
    if (resource === "staff") {
      return currentCount < planDetails.limits.maxStaff;
    }
    return false;
  };

  const canCreateBranch = () => {
    // Override for Demo User
    if (user?.email === "demo@test.com") return true;

    // Enterprise plan has effective unlimited (999)
    if (planDetails.limits.maxBranches >= 999) return true;
    return branchUsage < planDetails.limits.maxBranches;
  };

  const canCreateStaff = () => {
    // Override for Demo User
    if (user?.email === "demo@test.com") return true;

    if (planDetails.limits.maxStaff >= 999) return true;
    return staffUsage < planDetails.limits.maxStaff;
  };

  const checkFeature = (feature: keyof PlanFeatures) => {
    // Override for Demo User
    if (user?.email === "demo@test.com") return true;

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
