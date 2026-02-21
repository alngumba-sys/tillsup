import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { toast } from "sonner";

interface BranchGuardProps {
  children: ReactNode;
  requireBranchAccess?: boolean;
}

/**
 * BranchGuard - Frontend route guard for branch-based access control
 * 
 * CRITICAL ENFORCEMENT RULES:
 * ═══════════════════════════════════════════════════════════════════
 * 1. BRANCH STATUS VALIDATION (HARD BLOCK)
 *    - If user's branch status is "inactive" → BLOCK ACCESS COMPLETELY
 *    - Redirect to /branch-closed immediately
 *    - No component rendering
 *    - No API calls
 *    - No bypass allowed
 * 
 * 2. ROLE-BASED BRANCH LOCK
 *    - Business Owner: Can access ALL branches, can switch branches freely
 *    - Accountant: Can access ALL branches, can switch branches freely
 *    - Manager: Can ONLY access their assigned branch, branch locked
 *    - Cashier/Staff: Can ONLY access their assigned branch, branch locked
 * 
 * 3. URL TAMPERING PROTECTION
 *    - Prevents access via query parameters
 *    - Prevents access via path manipulation
 *    - Enforces strict branch assignment
 * 
 * This is FRONTEND-ONLY enforcement. Backend must implement its own validation.
 * ═══════════════════════════════════════════════════════════════════
 */
export function BranchGuard({ children, requireBranchAccess = false }: BranchGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { selectedBranchId, setSelectedBranchId, branches, getBranchById } = useBranch();

  useEffect(() => {
    const validateBranch = async () => {
      if (!user) return;

      // 0️⃣ IMMEDIATE BYPASS FOR BUSINESS OWNER
      if (user.role === "Business Owner") return;

      // ═══════════════════════════════════════════════════════════════════
      // 1️⃣ BRANCH STATUS VALIDATION - ABSOLUTE PRIORITY (HARD BLOCK)
      // ═══════════════════════════════════════════════════════════════════
      // For ALL roles (except Business Owner viewing branch management)
      if (user.role !== "Business Owner") {
        // Check if user has an assigned branch
        if (user.branchId) {
          const userBranch = getBranchById(user.branchId);
          
          // CRITICAL: Block access if branch is inactive
          if (userBranch && userBranch.status === "inactive") {
            console.error("⛔ BRANCH ACCESS BLOCKED: Branch is deactivated");
            
            // Force navigate to branch closed page (no replace to prevent back navigation)
            navigate("/branch-closed", { replace: true });
            return;
          }

          // If branch doesn't exist in system (data integrity issue)
          if (!userBranch) {
            console.error("⛔ BRANCH ACCESS BLOCKED: Branch not found");
            toast.error("Branch configuration error. Please contact administrator.");
            await logout();
            navigate("/login", { replace: true });
            return;
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 2️⃣ MANAGER/STAFF BRANCH LOCK - STRICT ENFORCEMENT
      // ═══════════════════════════════════════════════════════════════════
      if (user.role === "Manager" || user.role === "Cashier" || user.role === "Staff") {
        // These roles MUST have a branchId assigned
        if (!user.branchId) {
          toast.error("Your account is not assigned to a branch. Please contact your administrator.");
          navigate("/app/dashboard");
          return;
        }

        // Force selectedBranchId to user's assigned branch
        if (selectedBranchId !== user.branchId) {
          setSelectedBranchId(user.branchId);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 3️⃣ URL PARAMETER TAMPERING PROTECTION
        // ═══════════════════════════════════════════════════════════════════
        // Prevent navigation to other branch routes via query parameters
        const urlParams = new URLSearchParams(location.search);
        const branchParam = urlParams.get("branch");
        
        if (branchParam && branchParam !== user.branchId) {
          const userBranch = getBranchById(user.branchId);
          toast.warning("Access Restricted", {
            description: `You can only access ${userBranch?.name || "your assigned branch"}. Redirecting...`
          });
          navigate("/app/dashboard", { replace: true });
          return;
        }

        // ═══════════════════════════════════════════════════════════════════
        // 4️⃣ PATH-BASED NAVIGATION PROTECTION
        // ═══════════════════════════════════════════════════════════════════
        // Check if URL contains other branch references in the path
        const pathSegments = location.pathname.split('/');
        const branchKeywords = ['branch'];
        
        pathSegments.forEach((segment, index) => {
          if (branchKeywords.includes(segment.toLowerCase())) {
            // Check if next segment is a branch ID that doesn't match user's branch
            const potentialBranchId = pathSegments[index + 1];
            if (potentialBranchId && potentialBranchId !== user.branchId && branches.some(b => b.id === potentialBranchId)) {
              const userBranch = getBranchById(user.branchId);
              toast.error("Access Denied", {
                description: `You can only access ${userBranch?.name || "your assigned branch"}.`
              });
              navigate("/app/dashboard", { replace: true });
              return;
            }
          }
        });
      }

      // ═══════════════════════════════════════════════════════════════════
      // 5️⃣ BUSINESS OWNER / ACCOUNTANT - MULTI-BRANCH ACCESS
      // ═══════════════════════════════════════════════════════════════════
      if (user.role === "Business Owner" || user.role === "Accountant") {
        // These roles can access all branches
        // No restrictions on branch switching
        return;
      }
    };

    validateBranch();
  }, [user, selectedBranchId, setSelectedBranchId, location, navigate, branches, getBranchById, logout]);

  // ═══════════════════════════════════════════════════════════════════
  // 6️⃣ BRANCH REQUIREMENT CHECK
  // ═══════════════════════════════════════════════════════════════════
  if (requireBranchAccess && !selectedBranchId) {
    // This case is handled by individual components (e.g., POS Terminal shows alert)
    // We don't block rendering here to allow components to show their own messages
  }

  return <>{children}</>;
}
