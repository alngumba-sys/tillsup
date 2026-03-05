import { ReactNode } from "react";
import { AuthGuard } from "./AuthGuardComponent";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute - Wrapper component for protected routes
 * 
 * This component wraps AuthGuard and is used in the router configuration.
 * It ensures AuthGuard is rendered within the React component tree where
 * AuthProvider is available.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return (
    <AuthGuard requireAuth={true}>
      {children}
    </AuthGuard>
  );
}
