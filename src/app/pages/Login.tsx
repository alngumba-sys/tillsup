import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";
import { isPreviewMode } from "../utils/previewMode";
import { toast } from "sonner";
import { TillsupLogo } from "../components/TillsupLogo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, Mail, Lock, Eye, EyeOff, Store, Info } from "lucide-react";
import { ConnectionChecker } from "../components/ConnectionChecker";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { assets } = useBranding();
  const authContext = useAuth();
  const { login, isAuthenticated, logout, user } = authContext;
  
  // Debug: Check if auth context is valid
  console.debug("🔍 Login component - Auth context status:", {
    hasLogin: typeof login === 'function',
    isAuthenticated,
    hasLogout: typeof logout === 'function'
  });
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  // Redirect authenticated users based on mustChangePassword flag
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.mustChangePassword) {
        console.log("✅ User already authenticated but must change password - redirecting to change-password");
        navigate("/change-password", { replace: true });
      } else {
        console.log("✅ User already authenticated - redirecting to dashboard");
        navigate("/app/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user?.mustChangePassword, navigate]);

  // Show success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      toast.success(location.state.message, {
        duration: 5000,
      });
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    console.log("🔍 Login form submitted with:", { 
      email: formData.email, 
      hasPassword: !!formData.password,
      emailLength: formData.email.length,
      passwordLength: formData.password.length 
    });

    // CRITICAL: Validation - MUST have email and password
    if (!formData.email.trim() || !formData.email.includes("@")) {
      console.error("❌ Validation failed: Invalid email");
      const errorMsg = "Valid email is required";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!formData.password || formData.password.length === 0) {
      console.error("❌ Validation failed: Password is empty");
      const errorMsg = "Password is required";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Login attempt:", { email: formData.email });
      console.log("🔍 Auth context status:", {
        hasLogin: typeof login === 'function',
        loginName: login?.name,
        isAuthenticated,
        hasLogout: typeof logout === 'function',
        contextKeys: Object.keys(authContext)
      });
      
      // Ensure login is a function before calling
      if (typeof login !== 'function') {
         console.error("❌ Login is not a function:", login);
         throw new Error("Authentication service is not ready. Please try again.");
      }

      // Call login directly - AuthContext handles all timeouts internally
      console.log("🔵 Calling login function...");
      const result = await login(formData.email, formData.password);
      console.log("🔵 Login function returned:", result);

      setLoading(false);

      if (result && result.success) {
        // Redirect based on mustChangePassword flag
        console.log("✅ Login successful!");
        console.log("   mustChangePassword:", result.mustChangePassword);
        
        toast.success("Login successful!");
        
        if (result.mustChangePassword) {
          console.log("🔐 User must change password - redirecting to /change-password");
          navigate("/change-password");
        } else {
          console.log("📊 Redirecting to dashboard");
          navigate("/app/dashboard");
        }
      } else {
        // ═══════════════════════════════════════════════════════════════════
        // BRANCH DEACTIVATION - HARD BLOCK (redirect to branch closed page)
        // ═══════════════════════════════════════════════════════════════════
        if (result?.branchDeactivated) {
          console.log("🚫 Branch deactivated - redirecting to branch-closed page");
          toast.error("Your branch has been deactivated");
          navigate("/branch-closed", { replace: true });
          return;
        }
        
        console.error("❌ Login failed:", result?.error);
        const errorMsg = result?.error || "Login failed. Please check your credentials and try again.";
        setError(errorMsg);
        
        // Show toast notification for wrong credentials
        if (errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("password") || errorMsg.toLowerCase().includes("credentials")) {
          toast.error("Invalid username or password", {
            description: "Please check your credentials and try again.",
            duration: 4000,
          });
        } else {
          toast.error(errorMsg);
        }
        
        // Clear password on error
        setFormData(prev => ({ ...prev, password: "" }));
      }
    } catch (err: any) {
      setLoading(false);
      console.error("❌ Unexpected login error:", err);
      
      // Provide helpful error messages
      let errorMessage = "An unexpected error occurred during login";
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('fetch')) {
        errorMessage = "Cannot connect to server. Please check your internet connection and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Clear password on error
      setFormData(prev => ({ ...prev, password: "" }));
    }
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 text-slate-50 relative ${!assets.authBg ? "bg-[#14213d]" : "bg-cover bg-center"}`}
      style={assets.authBg ? { backgroundImage: `url(${assets.authBg})` } : {}}
    >
      {/* Connection Checker */}
      <ConnectionChecker />
      
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
            {assets.logoMain && (
              <img 
                src={assets.logoMain} 
                alt="Logo" 
                className="h-12 w-auto object-contain" 
              />
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
            {/* Preview Mode Notice */}
            {isPreviewMode() && (
              <Alert className="border-[#00719C] bg-[#00719C]/10">
                <Info className="h-4 w-4 text-[#00719C]" />
                <AlertDescription className="text-sm">
                  <span className="font-semibold">Preview Mode</span> - Use any email/password to login with demo data
                </AlertDescription>
              </Alert>
            )}
            
            {/* Production Mode Notice - Only show if there's an error about invalid credentials */}
            {!isPreviewMode() && error && error.includes("Invalid email or password") && (
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Don't have an account yet?</p>
                  <p>Click "Register Your Business" below to create a new account.</p>
                </AlertDescription>
              </Alert>
            )}

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
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-[#00719C] hover:bg-[#005d81] text-white"
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