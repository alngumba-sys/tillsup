import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

/**
 * AuthGuard - Route-level authentication protection
 * 
 * Wraps route components to enforce authentication requirements.
 * Handles redirects for first-login password changes.
 */
export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Do not redirect while loading
    if (loading) return;

    if (requireAuth) {
      // Not authenticated - redirect to login
      if (!isAuthenticated) {
        // Use replace to prevent back button loops
        navigate("/login", { replace: true });
        return;
      }

      // Authenticated but must change password - redirect to change-password
      // BUT: Don't redirect if already on change-password page (prevents infinite loop)
      if (user?.mustChangePassword && location.pathname !== "/change-password") {
        navigate("/change-password", { replace: true });
        return;
      }
    }
  }, [isAuthenticated, user?.mustChangePassword, requireAuth, navigate, location.pathname, loading]);

  // Show loading spinner while initializing
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0479A1]"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle redirecting state
  if (requireAuth && !isAuthenticated) {
    // Render a fallback (spinner) instead of null to prevent "Blank preview" errors
    // and provide visual feedback if redirect is slow
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0479A1]"></div>
        </div>
      </div>
    );
  }

  // Allow access to change-password page even when mustChangePassword is true
  if (requireAuth && user?.mustChangePassword && location.pathname !== "/change-password") {
    // Render a fallback here too
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Redirecting to password change...</p>
      </div>
    );
  }

  return <>{children}</>;
}
