import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { AlertTriangle, LogOut, Home } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/**
 * BranchClosed - Full-screen error state for deactivated branches
 * 
 * STRICT ENFORCEMENT:
 * - No bypass allowed
 * - No refresh workaround
 * - No retry option
 * - Only logout or exit
 */
export function BranchClosed() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleExit = () => {
    window.close();
    // If window.close() doesn't work (popup blockers), navigate to landing
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 100);
  };

  // Prevent back navigation
  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-red-200">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-3xl text-red-900">Branch Closed</CardTitle>
            <CardDescription className="mt-2 text-base text-red-700">
              Access Restricted
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ═══════════════════════════════════════════════════════════════════
              ERROR MESSAGE - Clear explanation
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <p className="text-red-900 font-medium text-center">
              This branch has been deactivated.
            </p>
            <p className="text-red-700 text-sm text-center">
              Please contact the business owner for assistance.
            </p>
            {user?.branchId && (
              <p className="text-red-600 text-xs text-center mt-2 font-mono">
                Branch ID: {user.branchId}
              </p>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              ACTIONS - Only logout and exit allowed
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>

            <Button
              onClick={handleExit}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Exit Application
            </Button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              INFO TEXT - No retry option
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="text-center">
            <p className="text-xs text-red-600">
              This restriction cannot be bypassed.
            </p>
            <p className="text-xs text-red-500 mt-1">
              Contact your administrator for branch reactivation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
