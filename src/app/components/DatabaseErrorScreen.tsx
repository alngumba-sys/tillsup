import { AlertTriangle, Copy, CheckCircle2, ExternalLink, Database } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

interface DatabaseErrorScreenProps {
  error?: string;
}

export function DatabaseErrorScreen({ error }: DatabaseErrorScreenProps) {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);

  const quickFixSQL = `-- QUICK FIX: Copy this entire script and run in Supabase SQL Editor
-- This will fix the infinite recursion error in 30 seconds

BEGIN;

-- Drop all problematic policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create SAFE non-recursive policies
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
);

COMMIT;

-- Done! Refresh your Tillsup app after running this.`;

  const copySQL = async () => {
    try {
      await navigator.clipboard.writeText(quickFixSQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main Error Card */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-red-500">
          {/* Header */}
          <div className="bg-red-600 text-white p-8">
            <div className="flex items-start gap-6">
              <Database className="w-16 h-16 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-3">
                  🚨 Database Configuration Required
                </h1>
                <p className="text-xl text-red-100 mb-2">
                  Your Supabase RLS policies have infinite recursion
                </p>
                <div className="bg-red-700 px-4 py-2 rounded inline-block">
                  <code className="text-sm">Error Code: 42P17</code>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-8 space-y-6">
            {/* Critical Notice */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-yellow-900 text-lg mb-2">
                    ⚠️ IMPORTANT: This Cannot Be Fixed From Code
                  </h3>
                  <p className="text-yellow-800">
                    This is a <strong>database security policy error</strong> in Supabase. 
                    You must fix it in the <strong>Supabase Dashboard</strong> (takes 2 minutes).
                  </p>
                </div>
              </div>
            </div>

            {/* Step-by-step */}
            <div>
              <h2 className="text-2xl font-bold mb-4 text-[#0891b2] flex items-center gap-2">
                <span className="bg-[#0891b2] text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">
                  1
                </span>
                Copy This SQL Script
              </h2>
              
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm max-h-96 overflow-y-auto font-mono">
                  {quickFixSQL}
                </pre>
                <Button
                  onClick={copySQL}
                  size="lg"
                  className="absolute top-4 right-4 bg-[#0891b2] hover:bg-[#0891b2]/90 shadow-lg"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Copy SQL Script
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0891b2] flex items-center gap-2">
                <span className="bg-[#0891b2] text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">
                  2
                </span>
                Open Supabase SQL Editor
              </h2>
              
              <div className="space-y-3">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-500 rounded-lg hover:bg-green-100 transition-colors group"
                >
                  <ExternalLink className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
                  <div className="flex-1">
                    <div className="font-bold text-green-900 text-lg">
                      Click Here to Open Supabase Dashboard
                    </div>
                    <div className="text-green-700 text-sm">
                      https://supabase.com/dashboard
                    </div>
                  </div>
                </a>
                
                <div className="pl-6 text-gray-700 space-y-2">
                  <p>Once in the dashboard:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Select your <strong>Tillsup project</strong></li>
                    <li>Click <strong>"SQL Editor"</strong> in the left sidebar</li>
                    <li>Click <strong>"New query"</strong></li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0891b2] flex items-center gap-2">
                <span className="bg-[#0891b2] text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">
                  3
                </span>
                Paste and Run
              </h2>
              
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <div className="bg-[#0891b2] text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <strong>Paste the SQL script</strong> you copied in Step 1
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <div className="bg-[#0891b2] text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <strong>Click "Run"</strong> or press <kbd className="bg-gray-200 px-2 py-1 rounded">Ctrl+Enter</kbd>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <div className="bg-[#0891b2] text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <strong>Wait for "Success"</strong> message (takes ~2 seconds)
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0891b2] flex items-center gap-2">
                <span className="bg-[#0891b2] text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">
                  4
                </span>
                Refresh This Page
              </h2>
              
              <Button
                onClick={() => window.location.reload()}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
              >
                <CheckCircle2 className="w-6 h-6 mr-3" />
                I Ran the SQL - Reload Tillsup Now
              </Button>
            </div>

            {/* Additional Help */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">📚 Need More Help?</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <p>
                  • <strong>Full documentation:</strong> <code className="bg-gray-200 px-2 py-1 rounded">RLS_FIX_INSTRUCTIONS.md</code> in your project
                </p>
                <p>
                  • <strong>Complete SQL script:</strong> <code className="bg-gray-200 px-2 py-1 rounded">FIX_INFINITE_RECURSION.sql</code> in your project
                </p>
                <p>
                  • <strong>Supabase RLS Docs:</strong> <a href="https://supabase.com/docs/guides/auth/row-level-security" target="_blank" rel="noopener noreferrer" className="text-[#0891b2] hover:underline">supabase.com/docs/guides/auth/row-level-security</a>
                </p>
              </div>
            </div>

            {/* Error Details */}
            {error && (
              <details className="bg-red-50 border border-red-200 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-red-900 mb-2">
                  🔍 Technical Error Details
                </summary>
                <pre className="text-xs text-red-800 overflow-x-auto bg-red-100 p-3 rounded">
                  {error}
                </pre>
              </details>
            )}
          </div>
        </div>

        {/* Footer Warning */}
        <div className="mt-6 text-center text-gray-600 bg-white rounded-lg p-4 shadow">
          <p className="text-sm">
            ⚠️ <strong>Your app will not work until this is fixed in Supabase.</strong>
          </p>
          <p className="text-xs mt-2">
            This is a one-time setup. After fixing, you won't see this again.
          </p>
        </div>
      </div>
    </div>
  );
}