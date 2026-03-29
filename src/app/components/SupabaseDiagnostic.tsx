import { useState } from "react";
import { supabase, supabaseUrl } from "../../lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { CircleCheck, XCircle, Loader2, Info } from "lucide-react";
import { Button } from "./ui/button";

export function SupabaseDiagnostic() {
  const [isOpen, setIsOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    urlValid: boolean;
    sessionCheck: boolean;
    healthCheck: boolean;
    error?: string;
  } | null>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    setResults(null);

    const diagnosticResults = {
      urlValid: false,
      sessionCheck: false,
      healthCheck: false,
      error: undefined as string | undefined
    };

    try {
      // Test 1: Check if URL is valid
      try {
        new URL(supabaseUrl);
        diagnosticResults.urlValid = true;
      } catch {
        diagnosticResults.error = "Invalid Supabase URL format";
        setResults(diagnosticResults);
        setTesting(false);
        return;
      }

      // Test 2: Check if we can get a session
      try {
        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Session check timeout")), 8000)
          )
        ]);

        if (!error) {
          diagnosticResults.sessionCheck = true;
        } else {
          diagnosticResults.error = `Session error: ${error.message}`;
        }
      } catch (err: any) {
        diagnosticResults.error = `Session check failed: ${err.message}`;
      }

      // Test 3: Try to ping the health endpoint
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${supabaseUrl}/rest/v1/`, { 
          method: 'HEAD',
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (response) {
          diagnosticResults.healthCheck = true;
        }
      } catch (err: any) {
        // Silently handle abort errors, only log real network errors
        if (err.name !== 'AbortError' && !diagnosticResults.error) {
          diagnosticResults.error = `Health check failed: ${err.message}`;
        }
      }

      setResults(diagnosticResults);
    } catch (err: any) {
      diagnosticResults.error = err.message;
      setResults(diagnosticResults);
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          setIsOpen(true);
          runDiagnostics();
        }}
        size="sm"
        variant="outline"
        className="fixed bottom-4 left-4 z-50 h-8 text-xs"
      >
        <Info className="h-3 w-3 mr-1" />
        Connection Info
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96">
      <Alert className="border-slate-300 bg-white dark:bg-slate-900 shadow-lg">
        <Info className="h-4 w-4" />
        <AlertTitle className="font-semibold text-sm">Supabase Connection Diagnostics</AlertTitle>
        <AlertDescription className="text-xs mt-2 space-y-2">
          <div className="space-y-1">
            <p className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 p-1 rounded break-all">
              {supabaseUrl}
            </p>
            
            {testing && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Running diagnostics...</span>
              </div>
            )}

            {results && (
              <div className="space-y-1 pt-2">
                <div className="flex items-center gap-2">
                  {results.urlValid ? (
                    <CircleCheck className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>URL Format: {results.urlValid ? "Valid" : "Invalid"}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {results.sessionCheck ? (
                    <CircleCheck className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Session Check: {results.sessionCheck ? "OK" : "Failed"}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {results.healthCheck ? (
                    <CircleCheck className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Server Reachable: {results.healthCheck ? "Yes" : "No"}</span>
                </div>

                {results.error && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-red-700 dark:text-red-400">
                    <p className="font-semibold text-[10px]">Error Details:</p>
                    <p className="text-[10px] font-mono">{results.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={runDiagnostics}
              disabled={testing}
              className="h-7 text-xs"
            >
              Retest
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="h-7 text-xs"
            >
              Close
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}