import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { isPreviewMode } from "../utils/previewMode";
import { calculateSubscriptionStatus, isLoginAllowed } from "../utils/subscriptionStatus";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

/**
 * Get the appropriate block page route for a blocked subscription status
 */
function getBlockPageRoute(status: string): string {
  switch (status) {
    case "trial_expired":
    case "expired":
      return "/subscription-expired";
    case "suspended":
      return "/subscription-suspended";
    case "cancelled":
      return "/subscription-cancelled";
    case "past_due":
      return "/subscription-past-due";
    default:
      return "/subscription-expired";
  }
}

/**
 * AuthGuard - Route-level authentication protection
 * 
 * Uses the unified calculateSubscriptionStatus utility for consistent
 * status checking across the entire application.
 */
export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading, business } = useAuth();

  // Preview mode: Bypass all authentication
  if (isPreviewMode()) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (loading) return;

    if (requireAuth) {
      if (!isAuthenticated) {
        navigate("/login", { replace: true });
        return;
      }

      if (business) {
        // Use unified status calculation
        const statusResult = calculateSubscriptionStatus({
          subscription_status: business.subscriptionStatus,
          trial_ends_at: business.trialEndsAt,
          subscription_end_date: business.subscriptionEndDate
        });

        console.log('🔒 AuthGuard:', { 
          status: statusResult.status, 
          isBlocked: statusResult.isBlocked,
          daysRemaining: statusResult.daysRemaining 
        });

        // Check if login is allowed for this status
        if (statusResult.isBlocked) {
          navigate(getBlockPageRoute(statusResult.status), { replace: true });
          return;
        }
      }

      // Authenticated but must change password
      if (user?.mustChangePassword && location.pathname !== "/change-password") {
        navigate("/change-password", { replace: true });
        return;
      }
    }
  }, [isAuthenticated, user?.mustChangePassword, business?.subscriptionStatus, business?.trialEndsAt, requireAuth, navigate, location.pathname, loading]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00719C]"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00719C]"></div>
        </div>
      </div>
    );
  }

  if (requireAuth && user?.mustChangePassword && location.pathname !== "/change-password") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Redirecting to password change...</p>
      </div>
    );
  }

  return <>{children}</>;
}
