import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Store, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { assets } = useBranding();
  const { login, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Show success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validation
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Valid email is required");
      return;
    }

    if (!formData.password) {
      setError("Password is required");
      return;
    }

    setLoading(true);

    try {
      // Basic safeguard: timeout if login takes > 15 seconds (rare but possible network issue)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Login timed out. Please check your connection and try again.")), 15000)
      );

      // Attempt login with race against timeout
      // Ensure login is a function before calling
      if (typeof login !== 'function') {
         throw new Error("Authentication service is not ready. Please try again.");
      }

      const loginPromise = login(formData.email, formData.password);
      
      const result: any = await Promise.race([
        loginPromise,
        timeoutPromise
      ]);

      setLoading(false);

      if (result && result.success) {
        // Redirect based on mustChangePassword flag
        if (result.mustChangePassword) {
          navigate("/change-password");
        } else {
          navigate("/app/dashboard");
        }
      } else {
        // ═══════════════════════════════════════════════════════════════════
        // BRANCH DEACTIVATION - HARD BLOCK (redirect to branch closed page)
        // ═══════════════════════════════════════════════════════════════════
        if (result?.branchDeactivated) {
          navigate("/branch-closed", { replace: true });
          return;
        }
        
        setError(result?.error || "Login failed. Please try again.");
        // Clear password on error
        setFormData(prev => ({ ...prev, password: "" }));
      }
    } catch (err: any) {
      setLoading(false);
      console.error("Login error:", err);
      setError(err.message || "An unexpected error occurred during login");
    }
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 text-slate-50 relative ${!assets.authBg ? "bg-[linear-gradient(135deg,#000000_0%,#14213d_60%,#0479A1_100%)]" : "bg-cover bg-center"}`}
      style={assets.authBg ? { backgroundImage: `url(${assets.authBg})` } : {}}
    >
      {assets.authBg && <div className="absolute inset-0 bg-black/60 z-0" />}
      
      {/* Back to Home Link */}
      <Button
        variant="ghost"
        className="absolute top-4 left-4 z-10 text-white hover:text-white hover:bg-white/10"
        onClick={() => navigate("/")}
      >
        <Store className="w-4 h-4 mr-2" />
        Back to Home
      </Button>

      <Card className="w-full max-w-md shadow-lg relative z-10 bg-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center items-center gap-3">
            {assets.logoMain ? (
               <img src={assets.logoMain} alt="Tillsup" className="h-12 w-auto object-contain" />
            ) : (
              <>
                <div className="bg-[#ED363F] p-2 rounded-lg text-white shadow-lg shadow-red-500/20">
                  <Store className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <span className="text-2xl font-bold font-['Outfit'] tracking-tight text-card-foreground">
                  Tillsup
                </span>
              </>
            )}
          </div>
          <div>
            <CardTitle className="text-3xl font-['Outfit'] text-[#0479a1]">POS System</CardTitle>
            <CardDescription className="mt-2">
              Sign in to access your business dashboard
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success Message */}
            {successMessage && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-[#0479A1] hover:bg-[#036080] text-white"
              size="lg"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            {/* Register Link */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Don't have a business account?
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/register")}
                disabled={loading}
              >
                Register Your Business
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}