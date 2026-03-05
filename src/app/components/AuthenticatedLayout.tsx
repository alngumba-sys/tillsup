import { Outlet } from "react-router";
import { AuthGuard } from "./AuthGuardComponent";
import { BusinessProviders } from "./BusinessProviders";
import { Layout } from "./Layout";
import { BranchGuard } from "./BranchGuard";

/**
 * AuthenticatedLayout - Layout wrapper for authenticated app routes
 * 
 * This component wraps all authenticated routes with:
 * - AuthGuard for authentication checking
 * - BusinessProviders for business context
 * - Layout for UI structure
 * - BranchGuard for branch access control
 * 
 * It's used as the element for the /app route in the router configuration.
 */
export function AuthenticatedLayout() {
  return (
    <AuthGuard requireAuth={true}>
      <BusinessProviders>
        <Layout>
          <BranchGuard>
            <Outlet />
          </BranchGuard>
        </Layout>
      </BusinessProviders>
    </AuthGuard>
  );
}
