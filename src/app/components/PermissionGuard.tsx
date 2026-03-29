import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";
import { Permission } from "../types/permissions";
import { isPreviewMode } from "../utils/previewMode";

interface PermissionGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermission?: Permission;
  redirectTo?: string;
}

/**
 * PermissionGuard - Route-level permission protection
 *
 * Checks whether the current user has the required role and/or granular
 * permission before rendering the child content.  If not, the user is
 * redirected to the 403 Unauthorized page (or the supplied redirectTo).
 *
 * Usage:
 *   <PermissionGuard requiredRoles={["Business Owner", "Manager"]} requiredPermission="inventory.view">
 *     <Inventory />
 *   </PermissionGuard>
 */
export function PermissionGuard({
  children,
  requiredRoles,
  requiredPermission,
  redirectTo = "/unauthorized",
}: PermissionGuardProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, hasPermission: hasLegacyPermission } = useAuth();
  const { hasPermission: hasGranularPermission } = useRole();

  // Preview mode: bypass all permission checks
  if (isPreviewMode()) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (loading) return;

    // Not authenticated → let AuthGuard handle it
    if (!isAuthenticated || !user) return;

    // Business Owner bypasses all permission checks
    if (user.role === "Business Owner") return;

    // Check legacy role-based access
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRoleAccess = hasLegacyPermission(requiredRoles as any);
      if (!hasRoleAccess) {
        navigate(redirectTo, { replace: true });
        return;
      }
    }

    // Check granular permission
    if (requiredPermission && user.roleId) {
      const hasPerm = hasGranularPermission(user.roleId, requiredPermission);
      if (!hasPerm) {
        navigate(redirectTo, { replace: true });
        return;
      }
    }
  }, [
    loading,
    isAuthenticated,
    user,
    requiredRoles,
    requiredPermission,
    redirectTo,
    navigate,
    hasLegacyPermission,
    hasGranularPermission,
  ]);

  // Show nothing while checking
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated — AuthGuard will redirect, just show loader
  if (!isAuthenticated || !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Business Owner bypasses all permission checks
  if (user.role === "Business Owner") {
    return <>{children}</>;
  }

  // Check legacy role-based access
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRoleAccess = hasLegacyPermission(requiredRoles as any);
    if (!hasRoleAccess) {
      return null; // redirect in useEffect
    }
  }

  // Check granular permission
  if (requiredPermission && user.roleId) {
    const hasPerm = hasGranularPermission(user.roleId, requiredPermission);
    if (!hasPerm) {
      return null; // redirect in useEffect
    }
  }

  return <>{children}</>;
}
