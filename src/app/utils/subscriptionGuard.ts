import { supabase } from "../../lib/supabase";

/**
 * Subscription status types that are allowed to perform imports
 */
const ALLOWED_STATUSES = ["active", "trial", "trial_extended", "past_due"];

/**
 * Check if a business is allowed to perform import operations
 * 
 * Allowed statuses:
 * - 'active': Paid & current subscription
 * - 'trial': New users on trial
 * - 'trial_extended': Manual admin override
 * - 'past_due': Payment failed but within grace period
 * 
 * Blocked statuses:
 * - 'trial_expired': Automatic lock after trial ends
 * - 'suspended': Admin-initiated hard lock
 * - 'cancelled': Pending end of cycle (if past end date)
 * - 'expired': Legacy/expired status
 * - 'deactivated': Manually deactivated
 * 
 * @param businessId - The business ID to check
 * @returns Object with allowed status and error message if blocked
 */
export async function checkSubscriptionForImport(businessId: string): Promise<{
  allowed: boolean;
  error?: string;
  status?: string;
}> {
  try {
    // Fetch business subscription status
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('subscription_status, trial_ends_at, subscription_end_date')
      .eq('id', businessId)
      .single();

    if (fetchError) {
      console.error('Subscription guard: Error fetching business:', fetchError);
      return {
        allowed: false,
        error: 'Unable to verify subscription status. Please try again.',
        status: 'unknown'
      };
    }

    if (!business) {
      return {
        allowed: false,
        error: 'Business not found.',
        status: 'unknown'
      };
    }

    const status = business.subscription_status || 'trial';
    const trialEndDate = business.trial_ends_at ? new Date(business.trial_ends_at) : null;
    const subscriptionEndDate = business.subscription_end_date ? new Date(business.subscription_end_date) : null;
    const now = new Date();

    // Check if status is in allowed list
    if (!ALLOWED_STATUSES.includes(status)) {
      return {
        allowed: false,
        error: getBlockedStatusMessage(status),
        status
      };
    }

    // Special handling for 'past_due' - check grace period
    if (status === 'past_due') {
      // Check if within grace period (7 days after subscription end)
      if (subscriptionEndDate) {
        const gracePeriodEnd = new Date(subscriptionEndDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
        
        if (now > gracePeriodEnd) {
          return {
            allowed: false,
            error: 'Subscription Inactive: Grace period has ended. Please renew your subscription to perform bulk imports.',
            status: 'past_due_expired'
          };
        }
      }
    }

    // Special handling for 'trial' - check if trial has expired
    if (status === 'trial' && trialEndDate && trialEndDate < now) {
      // Auto-update status to trial_expired
      await supabase
        .from('businesses')
        .update({ subscription_status: 'trial_expired' })
        .eq('id', businessId);

      return {
        allowed: false,
        error: 'Subscription Inactive: Your trial has expired. Please renew your subscription to perform bulk imports.',
        status: 'trial_expired'
      };
    }

    // Special handling for 'cancelled' - check if past end date
    if (status === 'cancelled' && subscriptionEndDate && subscriptionEndDate < now) {
      return {
        allowed: false,
        error: 'Subscription Inactive: Your subscription has ended. Please renew to perform bulk imports.',
        status: 'cancelled_expired'
      };
    }

    // All checks passed
    return {
      allowed: true,
      status
    };

  } catch (error: any) {
    console.error('Subscription guard: Unexpected error:', error);
    return {
      allowed: false,
      error: 'Subscription Inactive: Please renew your subscription to perform bulk imports.',
      status: 'unknown'
    };
  }
}

/**
 * Get user-friendly error message for blocked statuses
 */
function getBlockedStatusMessage(status: string): string {
  switch (status) {
    case 'trial_expired':
      return 'Subscription Inactive: Your trial has expired. Please renew your subscription to perform bulk imports.';
    case 'suspended':
      return 'Subscription Inactive: Your account has been suspended. Please contact support to perform bulk imports.';
    case 'cancelled':
      return 'Subscription Inactive: Your subscription has been cancelled. Please renew to perform bulk imports.';
    case 'expired':
      return 'Subscription Inactive: Your subscription has expired. Please renew your subscription to perform bulk imports.';
    case 'deactivated':
      return 'Subscription Inactive: Your account has been deactivated. Please contact support to perform bulk imports.';
    default:
      return 'Subscription Inactive: Please renew your subscription to perform bulk imports.';
  }
}

/**
 * Higher-order function to wrap import functions with subscription check
 * 
 * Usage:
 * const safeImport = withSubscriptionCheck(myImportFunction);
 * await safeImport(data, businessId);
 */
export function withSubscriptionCheck<T extends any[]>(
  importFn: (...args: T) => Promise<any>
) {
  return async (...args: T): Promise<any> => {
    // Extract businessId from args (typically the last argument or from context)
    // This assumes businessId is passed as the last argument
    const businessId = args[args.length - 1] as string;
    
    if (!businessId || typeof businessId !== 'string') {
      throw new Error('Business ID is required for import operations');
    }

    const check = await checkSubscriptionForImport(businessId);
    
    if (!check.allowed) {
      throw new Error(check.error);
    }

    return importFn(...args);
  };
}

/**
 * Validate subscription status before proceeding with import
 * This is a simpler version that just throws an error if blocked
 */
export async function validateSubscriptionForImport(businessId: string): Promise<void> {
  const check = await checkSubscriptionForImport(businessId);
  
  if (!check.allowed) {
    throw new Error(check.error);
  }
}
