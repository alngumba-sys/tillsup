import { Outlet } from "react-router";
import { AuthGuard } from "./AuthGuardComponent";
import { BusinessProviders } from "./BusinessProviders";
import { Layout } from "./Layout";
import { BranchGuard } from "./BranchGuard";
import { ExtensionNoticeModal } from "./ExtensionNoticeModal";
import { PastDueBanner } from "./PastDueBanner";

/**
 * AuthenticatedLayout - Layout wrapper for authenticated app routes
 * 
 * This component wraps all authenticated routes with:
 * - AuthGuard for authentication checking
 * - BusinessProviders for business context
 * - Layout for UI structure
 * - BranchGuard for branch access control
 * - ExtensionNoticeModal for subscription extension notifications
 * - PastDueBanner for past_due subscription notification
 * 
 * It's used as the element for the /app route in the router configuration.
 */
export function AuthenticatedLayout() {
  return (
    <AuthGuard requireAuth={true}>
      <BusinessProviders>
        <Layout>
          <PastDueBanner />
          <BranchGuard>
            <ExtensionNoticeModal />
            <Outlet />
          </BranchGuard>
        </Layout>
      </BusinessProviders>
    </AuthGuard>
  );
}
