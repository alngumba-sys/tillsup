import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { supabase } from "../../lib/supabase";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

export function SupabaseConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    basicConnection?: { success: boolean; message: string };
    authCheck?: { success: boolean; message: string };
    databaseQuery?: { success: boolean; message: string };
    error?: string;
  } | null>(null);

  const runConnectionTest = async () => {
    setTesting(true);
    setResults(null);

    const testResults: typeof results = {};

    try {
      // Test 1: Basic connection (check if Supabase client is initialized)
      console.log("🔍 Test 1: Basic connection check...");
      try {
        if (supabase) {
          testResults.basicConnection = {
            success: true,
            message: "Supabase client initialized successfully"
          };
        } else {
          testResults.basicConnection = {
            success: false,
            message: "Supabase client is not initialized"
          };
        }
      } catch (error: any) {
        testResults.basicConnection = {
          success: false,
          message: `Failed to initialize: ${error.message}`
        };
      }

      // Test 2: Auth connection check
      console.log("🔍 Test 2: Auth connection check...");
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          testResults.authCheck = {
            success: false,
            message: `Auth error: ${error.message}`
          };
        } else {
          testResults.authCheck = {
            success: true,
            message: data.session ? "Session active" : "No active session (not logged in)"
          };
        }
      } catch (error: any) {
        testResults.authCheck = {
          success: false,
          message: `Auth connection failed: ${error.message}`
        };
      }

      // Test 3: Database query test
      console.log("🔍 Test 3: Database query test...");
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);

        if (error) {
          testResults.databaseQuery = {
            success: false,
            message: `Database error: ${error.message} (Code: ${error.code})`
          };
        } else {
          testResults.databaseQuery = {
            success: true,
            message: "Database connection successful"
          };
        }
      } catch (error: any) {
        testResults.databaseQuery = {
          success: false,
          message: `Database connection failed: ${error.message}`
        };
      }

    } catch (error: any) {
      testResults.error = `Unexpected error: ${error.message}`;
    }

    setResults(testResults);
    setTesting(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Supabase Connection Diagnostic</CardTitle>
        <CardDescription>
          Test your Supabase connection to diagnose issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runConnectionTest}
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Connection Test
            </>
          )}
        </Button>

        {results && (
          <div className="space-y-3">
            {results.basicConnection && (
              <Alert variant={results.basicConnection.success ? "default" : "destructive"}>
                {results.basicConnection.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  Basic Connection {results.basicConnection.success ? "✓" : "✗"}
                </AlertTitle>
                <AlertDescription>{results.basicConnection.message}</AlertDescription>
              </Alert>
            )}

            {results.authCheck && (
              <Alert variant={results.authCheck.success ? "default" : "destructive"}>
                {results.authCheck.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  Auth Connection {results.authCheck.success ? "✓" : "✗"}
                </AlertTitle>
                <AlertDescription>{results.authCheck.message}</AlertDescription>
              </Alert>
            )}

            {results.databaseQuery && (
              <Alert variant={results.databaseQuery.success ? "default" : "destructive"}>
                {results.databaseQuery.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  Database Query {results.databaseQuery.success ? "✓" : "✗"}
                </AlertTitle>
                <AlertDescription>{results.databaseQuery.message}</AlertDescription>
              </Alert>
            )}

            {results.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{results.error}</AlertDescription>
              </Alert>
            )}

            {/* Troubleshooting tips */}
            {(!results.basicConnection?.success || 
              !results.authCheck?.success || 
              !results.databaseQuery?.success) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Troubleshooting Tips</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><strong>Browser Extensions:</strong> Disable ad blockers, privacy extensions (uBlock, Privacy Badger, etc.)</li>
                    <li><strong>Network:</strong> Check if your network/firewall is blocking Supabase (ohpshxeynukbogwwezrt.supabase.co)</li>
                    <li><strong>Supabase Project:</strong> Verify your project is active in Supabase dashboard</li>
                    <li><strong>CORS:</strong> Make sure your domain is allowed in Supabase project settings</li>
                    <li><strong>Hard Refresh:</strong> Try Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to clear cache</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
