import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getDefaultRoute = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "Business Owner":
        return "/app/dashboard";
      case "Manager":
        return "/app/dashboard";
      case "Cashier":
        return "/app/pos";
      case "Accountant":
        return "/app/reports";
      default:
        return "/app/dashboard";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <ShieldX className="w-12 h-12 text-red-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          403 — Unauthorized
        </h1>

        <p className="text-slate-600 mb-2">
          You don't have permission to access this page.
        </p>

        {user && (
          <p className="text-sm text-slate-500 mb-8">
            Your current role is <strong>{user.role}</strong>. Contact your
            administrator if you believe this is an error.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>

          <Button
            onClick={() => navigate(getDefaultRoute())}
            className="gap-2 bg-[#00719C] hover:bg-[#005f85]"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
