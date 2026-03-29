import { supabase } from "../../lib/supabase";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIFIED SUBSCRIPTION STATUS CALCULATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This single source of truth calculates the subscription status for any business.
 * Both Super Admin and Business Owner pages MUST use this function.
 * 
 * Status Priority (highest to lowest):
 * 1. suspended - Admin suspended the account
 * 2. cancelled - Account cancelled
 * 3. expired - subscription_end_date has passed AND no active subscription
 * 4. trial_expired - trial_ends_at has passed AND status was 'trial'
 * 5. past_due - Payment overdue
 * 6. active - Paid subscription is active
 * 7. trial_extended - Admin extended the trial
 * 8. trial - Normal trial period
 */

export type SubscriptionStatus = 
  | 'active' 
  | 'trial' 
  | 'trial_extended' 
  | 'trial_expired' 
  | 'expired' 
  | 'past_due' 
  | 'suspended' 
  | 'cancelled';

export interface SubscriptionStatusResult {
  status: SubscriptionStatus;
  isBlocked: boolean;           // true if user should be blocked from login
  isActive: boolean;            // true if subscription allows full access
  daysRemaining: number | null; // days until expiration (null if no end date)
  expiresAt: Date | null;       // when the subscription expires
  displayText: string;          // human-readable status text
  displayColor: string;         // CSS color class for status badge
}

/**
 * Calculate the current subscription status based on database fields.
 * This is THE single source of truth - call this from any component.
 * 
 * @param business - The business object from AuthContext (or raw DB row)
 * @returns SubscriptionStatusResult with all status information
 */
export function calculateSubscriptionStatus(business: {
  subscription_status?: string | null;
  subscriptionStatus?: string | null;
  trial_ends_at?: string | Date | null;
  trialEndsAt?: string | Date | null;
  subscription_end_date?: string | Date | null;
  subscriptionEndDate?: string | Date | null;
}): SubscriptionStatusResult {
  const now = new Date();
  
  // Normalize field names (support both snake_case from DB and camelCase from context)
  const dbStatus = (business.subscription_status || business.subscriptionStatus || 'trial') as string;
  const trialEndsAt = business.trial_ends_at || business.trialEndsAt;
  const subscriptionEndDate = business.subscription_end_date || business.subscriptionEndDate;
  
  // Parse dates
  const trialEndDate = trialEndsAt ? new Date(trialEndsAt) : null;
  const subEndDate = subscriptionEndDate ? new Date(subscriptionEndDate) : null;
  
  // Determine the effective end date (use the latest one)
  let effectiveEndDate: Date | null = null;
  if (subEndDate && trialEndDate) {
    effectiveEndDate = subEndDate > trialEndDate ? subEndDate : trialEndDate;
  } else if (subEndDate) {
    effectiveEndDate = subEndDate;
  } else if (trialEndDate) {
    effectiveEndDate = trialEndDate;
  }
  
  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (effectiveEndDate && !isNaN(effectiveEndDate.getTime())) {
    daysRemaining = Math.ceil((effectiveEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) daysRemaining = 0;
  }
  
  // Determine status based on database status and dates
  // This is the KEY logic - respects admin-set status but validates with dates
  let status: SubscriptionStatus = 'trial';
  let isBlocked = false;
  let isActive = false;
  
  // Priority 1: Hard blocks (admin-set statuses that always block)
  if (dbStatus === 'suspended') {
    status = 'suspended';
    isBlocked = true;
  } else if (dbStatus === 'cancelled') {
    status = 'cancelled';
    isBlocked = true;
  }
  // Priority 2: Date-based expiration checks
  else if (effectiveEndDate && effectiveEndDate < now) {
    // The effective end date has passed
    if (dbStatus === 'trial_extended') {
      // Even extended trials expire if the date has passed
      status = 'trial_expired';
      isBlocked = true;
    } else if (dbStatus === 'active') {
      // Active subscription with past end date = expired (needs renewal)
      status = 'expired';
      isBlocked = true;
    } else {
      // Default trial expiration
      status = 'trial_expired';
      isBlocked = true;
    }
  }
  // Priority 3: Active statuses
  else if (dbStatus === 'active') {
    status = 'active';
    isActive = true;
  } else if (dbStatus === 'trial_extended') {
    status = 'trial_extended';
    isActive = true;
  } else if (dbStatus === 'past_due') {
    status = 'past_due';
    isBlocked = false; // Allow access but show warning
    isActive = true;   // Still consider active for feature access
  }
  // Priority 4: Default trial
  else {
    status = 'trial';
    isActive = true;
  }
  
  // Generate display text and color
  const displayText = getDisplayText(status, daysRemaining);
  const displayColor = getDisplayColor(status);
  
  return {
    status,
    isBlocked,
    isActive,
    daysRemaining,
    expiresAt: effectiveEndDate,
    displayText,
    displayColor
  };
}

function getDisplayText(status: SubscriptionStatus, daysRemaining: number | null): string {
  switch (status) {
    case 'active':
      return daysRemaining !== null && !isNaN(daysRemaining) ? `Active (${daysRemaining} days left)` : 'Active';
    case 'trial':
      return daysRemaining !== null && !isNaN(daysRemaining) ? `Trial (${daysRemaining} days left)` : 'Trial';
    case 'trial_extended':
      return daysRemaining !== null && !isNaN(daysRemaining) ? `Extended (${daysRemaining} days left)` : 'Trial Extended';
    case 'trial_expired':
      return 'Trial Expired';
    case 'expired':
      return 'Subscription Expired';
    case 'past_due':
      return 'Payment Past Due';
    case 'suspended':
      return 'Suspended';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

function getDisplayColor(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'text-emerald-400';
    case 'trial':
      return 'text-blue-400';
    case 'trial_extended':
      return 'text-purple-400';
    case 'trial_expired':
    case 'expired':
      return 'text-red-400';
    case 'past_due':
      return 'text-amber-400';
    case 'suspended':
      return 'text-orange-400';
    case 'cancelled':
      return 'text-gray-400';
    default:
      return 'text-slate-400';
  }
}

export function getBadgeClassName(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300';
    case 'trial':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300';
    case 'trial_extended':
      return 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300';
    case 'past_due':
      return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300';
    case 'suspended':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300';
    case 'trial_expired':
    case 'expired':
    default:
      return 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300';
  }
}

/**
 * Fetch a business by ID and calculate its subscription status.
 * Used by Super Admin and any component that needs to check status by ID.
 */
export async function getBusinessSubscriptionStatus(businessId: string): Promise<SubscriptionStatusResult | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, subscription_status, trial_ends_at, subscription_end_date')
      .eq('id', businessId)
      .single();
    
    if (error || !data) {
      console.error('Failed to fetch business status:', error);
      return null;
    }
    
    return calculateSubscriptionStatus(data);
  } catch (err) {
    console.error('Error fetching business status:', err);
    return null;
  }
}

/**
 * Check if a status allows login
 */
export function isLoginAllowed(status: SubscriptionStatus): boolean {
  return ['active', 'trial', 'trial_extended', 'past_due'].includes(status);
}

/**
 * Check if a status allows feature access
 */
export function isFeatureAccessAllowed(status: SubscriptionStatus): boolean {
  return ['active', 'trial', 'trial_extended'].includes(status);
}
