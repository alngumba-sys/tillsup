import { useState, useEffect, useRef } from "react";
import { AlertTriangle, X, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { isPreviewMode } from "../utils/previewMode";

/**
 * RLSErrorBanner Component
 * 
 * Shows a persistent but dismissible banner at the top when RLS errors are detected
 * Hidden in preview mode (Figma Make)
 */
export function RLSErrorBanner() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Don't show banner in preview mode
    if (isPreviewMode()) {
      setShow(false);
      return;
    }
    
    const checkForRLSError = () => {
      const hasRLSError = sessionStorage.getItem('rls-recursion-error');
      const dismissed = sessionStorage.getItem('rls-banner-dismissed');
      if (hasRLSError === 'true' && dismissed !== 'true') {
        setShow(true);
      }
    };

    checkForRLSError();
    const interval = setInterval(checkForRLSError, 2000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('rls-banner-dismissed', 'true');
    setShow(false);
  };

  const sqlFix = `DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;  
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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

  const copySQL = async () => {
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(sqlFix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback: select the textarea content
      if (textareaRef.current) {
        textareaRef.current.select();
        try {
          // Try old-school copy
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err2) {
          // If all else fails, just select it so user can Ctrl+C
          alert('Please press Ctrl+C (or Cmd+C on Mac) to copy the SQL');
        }
      }
    }
  };

  const selectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 border-b-4 border-yellow-600 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-900 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold text-yellow-900">
                  ⚠️ Database Configuration Issue - Limited Functionality
                </p>
                <p className="text-sm text-yellow-800 mt-1">
                  Some features may not work correctly. {!expanded && (
                    <button
                      onClick={() => setExpanded(true)}
                      className="underline hover:no-underline font-medium"
                    >
                      Click here to fix
                    </button>
                  )}
                </p>
              </div>
              
              <button
                onClick={dismiss}
                className="text-yellow-900 hover:text-yellow-950 p-1"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {expanded && (
              <div className="mt-4 bg-yellow-50 rounded-lg p-4 space-y-3">
                <div className="text-sm text-gray-700 space-y-2">
                  <p className="font-semibold text-gray-900">Quick Fix (2 minutes):</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0891b2] hover:underline inline-flex items-center gap-1"
                      >
                        Open Supabase Dashboard <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>Click "SQL Editor" in the left sidebar</li>
                    <li>Select all the SQL below (click the box, then Ctrl+A or Cmd+A)</li>
                    <li>Copy it (Ctrl+C or Cmd+C)</li>
                    <li>Paste in Supabase SQL Editor and click "Run"</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>

                {/* Visible SQL Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-900">
                      SQL Fix Script:
                    </label>
                    <Button
                      onClick={copySQL}
                      size="sm"
                      className="bg-[#0891b2] hover:bg-[#0891b2]/90"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Try to Copy
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <textarea
                    ref={textareaRef}
                    className="w-full h-48 p-3 bg-gray-900 text-gray-100 font-mono text-xs rounded border-2 border-gray-700 focus:border-[#0891b2] focus:outline-none resize-none"
                    value={sqlFix}
                    onClick={selectAll}
                    readOnly
                  />
                  
                  <p className="text-xs text-gray-600 italic">
                    💡 Click the box above, press Ctrl+A (or Cmd+A), then Ctrl+C (or Cmd+C) to copy
                  </p>
                </div>

                <Button
                  onClick={() => setExpanded(false)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Hide Instructions
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}