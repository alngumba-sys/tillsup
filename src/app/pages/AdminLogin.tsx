import { useState } from "react";
import { useNavigate } from "react-router";
import { Lock, Shield, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { TillsupLogo } from "../components/TillsupLogo";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";

/**
 * ADMIN LOGIN PAGE
 * 
 * Access Instructions:
 * 1. Go to landing page (/)
 * 2. Click the Tillsup logo 5 times rapidly (within 2 seconds)
 * 3. You'll be redirected to this admin login page
 * 4. Enter username: Admin and password: Tillsup@2026
 * 5. Access the admin dashboard to manage platform logos and branding
 * 
 * Admin Dashboard Features:
 * - Upload/Change Main Platform Logo (Light Mode)
 * - Upload/Change Dark Mode Logo
 * - Upload/Change Favicon
 * - Upload/Change Auth Background Image
 * - Upload/Change Social Share Image (Open Graph)
 * 
 * IMPORTANT: This creates/uses a special admin@tillsup.internal account in Supabase
 * Make sure your RLS policies allow this admin user to access all data.
 */

const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "Tillsup@2026";
const ADMIN_EMAIL = "admin@tillsup.internal";

export function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Verify credentials match
      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        setError("Invalid username or password. Access denied.");
        toast.error("Invalid credentials");
        setLoading(false);
        return;
      }

      // Try to sign in with Supabase admin account
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      if (signInError) {
        // If sign in fails, try to create the admin account
        console.log("Admin account doesn't exist, creating...");
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          options: {
            data: {
              first_name: "Platform",
              last_name: "Administrator",
              role: "Platform Admin"
            }
          }
        });

        if (signUpError) {
          console.error("Failed to create admin account:", signUpError);
          setError("Failed to authenticate. Please ensure Supabase is configured correctly.");
          toast.error("Authentication failed");
          setLoading(false);
          return;
        }

        // Try to sign in again
        const { error: retrySignInError } = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });

        if (retrySignInError) {
          setError("Admin account created but sign-in failed. Please try again or check your email for confirmation.");
          toast.warning("Please check your email to confirm your account");
          setLoading(false);
          return;
        }
      }

      // Create a profile for the admin if it doesn't exist
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: ADMIN_EMAIL,
            first_name: "Platform",
            last_name: "Administrator",
            role: "Platform Admin",
            created_at: new Date().toISOString()
          });
        }
      }

      // Store admin flag in session storage
      sessionStorage.setItem('isAdmin', 'true');
      
      toast.success("Admin access granted");
      navigate("/admin-hidden");
    } catch (err: any) {
      console.error("Admin login error:", err);
      setError("An unexpected error occurred. Please try again.");
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: '#0a0e1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.03,
        background: 'radial-gradient(circle at 20% 50%, #0891b2 0%, transparent 50%), radial-gradient(circle at 80% 80%, #ef4444 0%, transparent 50%)'
      }} />

      <Card style={{
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        zIndex: 1
      }}>
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <TillsupLogo height={40} />
          </div>
          
          <div className="flex justify-center">
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%)',
              border: '1px solid rgba(8, 145, 178, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield className="w-6 h-6 text-[#0891b2]" />
            </div>
          </div>
          
          <div>
            <CardTitle className="text-2xl text-white">Admin Access</CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Enter admin password to access platform management
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="bg-slate-950/50 border-white/10 text-white"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="bg-slate-950/50 border-white/10 text-white pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0891b2] hover:bg-[#0891b2]/90 text-white"
              disabled={loading || !password || !username}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Access Admin Panel
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400 hover:text-white hover:bg-white/5"
              onClick={() => navigate("/")}
            >
              Back to Home
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}