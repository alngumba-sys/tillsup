import { useState, useEffect } from "react";
import { AlertTriangle, Copy, CircleCheck, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

/**
 * RLSErrorModal Component
 * 
 * Shows a modal with instructions to fix infinite recursion RLS errors
 */
export function RLSErrorModal() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Listen for RLS errors from console
    const checkForRLSError = () => {
      // Check if there's an RLS error in sessionStorage
      const hasRLSError = sessionStorage.getItem('rls-recursion-error');
      if (hasRLSError === 'true') {
        setShow(true);
      }
    };

    checkForRLSError();
    
    // Check periodically for error
    const interval = setInterval(checkForRLSError, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const sqlScript = `-- Run this in Supabase SQL Editor to fix infinite recursion

-- 1. Drop all existing policies on profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- 2. Create non-recursive policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  auth.uid() = id OR
  business_id = (SELECT business_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles owner 
    WHERE owner.id = auth.uid() 
      AND owner.role = 'Business Owner'
      AND owner.business_id = profiles.business_id
  )
);`;

  const copyToClipboard = async () => {
    // Method 1: Try Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(sqlScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err) {
        console.log("Clipboard API blocked, trying fallback...");
      }
    }
    
    // Method 2: Fallback to execCommand
    try {
      const textArea = document.createElement("textarea");
      textArea.value = sqlScript;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (err) {
      console.log("execCommand failed:", err);
    }
    
    // Method 3: Silent fail with visual hint
    // User can still manually select the code
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Database Policy Error Detected
              </h2>
              <p className="text-red-100">
                Infinite recursion in RLS policies prevents profile creation
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Problem */}
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm">
                  Error Code: 42P17
                </span>
              </h3>
              <p className="text-gray-700">
                Your Supabase Row Level Security (RLS) policies on the <code className="bg-gray-100 px-2 py-1 rounded">profiles</code> table 
                are checking the profiles table recursively, causing an infinite loop.
              </p>
            </div>

            {/* Solution Steps */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-[#00719C]">
                🛠️ How to Fix (5 minutes)
              </h3>
              <ol className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="font-semibold text-[#00719C] flex-shrink-0">1.</span>
                  <div>
                    <strong>Open your Supabase Dashboard</strong>
                    <br />
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#00719C] hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      Go to Supabase Dashboard <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-[#00719C] flex-shrink-0">2.</span>
                  <div>
                    <strong>Navigate to SQL Editor</strong>
                    <br />
                    <span className="text-sm text-gray-600">
                      In your Supabase project, click on <strong>SQL Editor</strong> in the left sidebar
                    </span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-[#00719C] flex-shrink-0">3.</span>
                  <div>
                    <strong>Copy and run this SQL script</strong>
                    <div className="mt-2 relative">
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-64 overflow-y-auto">
                        {sqlScript}
                      </pre>
                      <Button
                        onClick={copyToClipboard}
                        size="sm"
                        className="absolute top-2 right-2 bg-[#00719C] hover:bg-[#00719C]/90"
                      >
                        {copied ? (
                          <>
                            <CircleCheck className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy SQL
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-[#00719C] flex-shrink-0">4.</span>
                  <div>
                    <strong>Click "Run" in the SQL Editor</strong>
                    <br />
                    <span className="text-sm text-gray-600">
                      Wait for the success message
                    </span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-[#00719C] flex-shrink-0">5.</span>
                  <div>
                    <strong>Refresh this page</strong>
                    <br />
                    <span className="text-sm text-gray-600">
                      The error should be gone!
                    </span>
                  </div>
                </li>
              </ol>
            </div>

            {/* Alternative: Full Script */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Pro Tip:</strong> There's a complete SQL fix script in your project root: 
                <code className="bg-blue-100 px-2 py-1 rounded ml-1">FIX_INFINITE_RECURSION.sql</code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem('rls-recursion-error');
              setShow(false);
            }}
          >
            I'll Fix This Later
          </Button>
          <Button
            onClick={() => window.location.reload()}
            className="bg-[#00719C] hover:bg-[#00719C]/90"
          >
            I Fixed It - Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}
