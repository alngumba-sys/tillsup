import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Home } from "lucide-react";
import { useNavigate } from "react-router";

export function DiagnosticPage() {
  const navigate = useNavigate();
  const { user, business, loading: authLoading, isAuthenticated } = useAuth();
  const { assets, loading: brandingLoading } = useBranding();
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "success" | "error">("checking");
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    checkSupabase();
  }, []);

  const checkSupabase = async () => {
    setSupabaseStatus("checking");
    setErrors([]);
    
    try {
      // Test Supabase connection
      const { data, error } = await supabase.from("profiles").select("count").limit(1);
      
      if (error) {
        setErrors(prev => [...prev, `Database error: ${error.message}`]);
        setSupabaseStatus("error");
      } else {
        setSupabaseStatus("success");
      }

      // Try to list accessible tables
      const tables = ["profiles", "businesses", "branches", "sales", "inventory", "staff"];
      const accessible: string[] = [];
      
      for (const table of tables) {
        const { error: tableError } = await supabase.from(table).select("count").limit(1);
        if (!tableError) {
          accessible.push(table);
        }
      }
      
      setDbTables(accessible);
    } catch (err: any) {
      setErrors(prev => [...prev, `Connection error: ${err.message}`]);
      setSupabaseStatus("error");
    }
  };

  const StatusBadge = ({ status }: { status: "checking" | "success" | "error" | "loading" }) => {
    if (status === "checking" || status === "loading") {
      return <Badge variant="outline" className="gap-2"><RefreshCw className="w-3 h-3 animate-spin" />Checking...</Badge>;
    }
    if (status === "success") {
      return <Badge variant="default" className="gap-2 bg-green-500"><CheckCircle className="w-3 h-3" />OK</Badge>;
    }
    return <Badge variant="destructive" className="gap-2"><XCircle className="w-3 h-3" />Error</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">System Diagnostics</h1>
            <p className="text-slate-400">Check the health of your Tillsup installation</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
            <Home className="w-4 h-4" />
            Home
          </Button>
        </div>

        {/* Authentication Status */}
        <Card className="mb-4 bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Authentication</CardTitle>
              <StatusBadge status={authLoading ? "loading" : isAuthenticated ? "success" : "error"} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span>Loading:</span>
              <span className="font-mono">{authLoading ? "true" : "false"}</span>
            </div>
            <div className="flex justify-between">
              <span>Authenticated:</span>
              <span className="font-mono">{isAuthenticated ? "true" : "false"}</span>
            </div>
            <div className="flex justify-between">
              <span>User Email:</span>
              <span className="font-mono">{user?.email || "Not logged in"}</span>
            </div>
            <div className="flex justify-between">
              <span>User Role:</span>
              <span className="font-mono">{user?.role || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Business Status */}
        <Card className="mb-4 bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Business</CardTitle>
              <StatusBadge status={business ? "success" : "error"} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span>Business Name:</span>
              <span className="font-mono">{business?.name || "None"}</span>
            </div>
            <div className="flex justify-between">
              <span>Business ID:</span>
              <span className="font-mono text-xs">{business?.id || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span>Subscription:</span>
              <span className="font-mono">{business?.subscriptionPlan || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Supabase Connection */}
        <Card className="mb-4 bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Supabase Connection</CardTitle>
              <div className="flex gap-2">
                <StatusBadge status={supabaseStatus} />
                <Button onClick={checkSupabase} size="sm" variant="outline">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span>URL:</span>
              <span className="font-mono text-xs">https://ohpshxeynukbogwwezrt.supabase.co</span>
            </div>
            <div className="flex justify-between">
              <span>Accessible Tables:</span>
              <span className="font-mono">{dbTables.length}</span>
            </div>
            {dbTables.length > 0 && (
              <div className="mt-2">
                <div className="text-sm text-slate-400 mb-1">Tables:</div>
                <div className="flex flex-wrap gap-1">
                  {dbTables.map(table => (
                    <Badge key={table} variant="outline" className="text-xs">{table}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branding Assets */}
        <Card className="mb-4 bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Branding Assets</CardTitle>
              <StatusBadge status={brandingLoading ? "loading" : "success"} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span>Logo Main:</span>
              <span className="font-mono">{assets.logoMain ? "✓" : "✗"}</span>
            </div>
            <div className="flex justify-between">
              <span>Logo Dark:</span>
              <span className="font-mono">{assets.logoDark ? "✓" : "✗"}</span>
            </div>
            <div className="flex justify-between">
              <span>Favicon:</span>
              <span className="font-mono">{assets.favicon ? "✓" : "✗"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Errors */}
        {errors.length > 0 && (
          <Card className="mb-4 bg-red-900/20 border-red-500/50">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Errors Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {errors.map((error, i) => (
                  <li key={i} className="text-red-300 text-sm font-mono">{error}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Browser Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Browser Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span>User Agent:</span>
              <span className="font-mono text-xs truncate max-w-xs" title={navigator.userAgent}>
                {navigator.userAgent.substring(0, 50)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span>Online:</span>
              <span className="font-mono">{navigator.onLine ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span>Current URL:</span>
              <span className="font-mono text-xs">{window.location.href}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
            Reload Page
          </Button>
          <Button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }} 
            variant="destructive" 
            className="flex-1"
          >
            Clear Storage & Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
