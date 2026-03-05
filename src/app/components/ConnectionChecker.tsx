import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { Button } from "./ui/button";
import { isPreviewMode } from "../utils/previewMode";

/**
 * ConnectionChecker Component
 * 
 * Detects if the app is running in Figma preview mode or has network issues
 * and displays helpful warnings to the user.
 * 
 * UPDATED: Now hidden in preview mode - app uses mock data instead
 */
export function ConnectionChecker() {
  const [isInFigmaPreview, setIsInFigmaPreview] = useState(false);
  const [hasNetworkIssue, setHasNetworkIssue] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show warnings in preview mode - we handle this with mock data now
    if (isPreviewMode()) {
      return;
    }
    
    // Check if running in Figma preview
    const checkFigmaPreview = () => {
      // Figma preview typically has specific user agents or window properties
      const userAgent = navigator.userAgent.toLowerCase();
      const isFigma = userAgent.includes('figma') || 
                      window.location.hostname.includes('figma') ||
                      window.location.hostname.includes('fig.ma');
      
      setIsInFigmaPreview(isFigma);
    };

    // Check network connectivity - simplified without abort controller
    const checkNetwork = async () => {
      // Only check if browser says we're offline
      if (!navigator.onLine) {
        setHasNetworkIssue(true);
        return;
      }
      
      // Otherwise assume we're online and let actual requests handle errors
      setHasNetworkIssue(false);
    };

    checkFigmaPreview();
    checkNetwork();

    // Listen for online/offline events
    const handleOnline = () => {
      console.log("✅ Network connection restored");
      setHasNetworkIssue(false);
    };

    const handleOffline = () => {
      console.log("❌ Network connection lost");
      setHasNetworkIssue(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (dismissed) return null;

  if (isInFigmaPreview) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-2xl px-4">
        <Alert className="border-orange-500 bg-orange-50 shadow-lg">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <AlertTitle className="text-orange-900 font-semibold">
            Running in Figma Preview Mode
          </AlertTitle>
          <AlertDescription className="text-orange-800 space-y-2">
            <p>
              Figma Make preview blocks all network requests to Supabase. To use the app properly:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Deploy to Vercel: <code className="bg-orange-100 px-2 py-0.5 rounded">vercel deploy --prod</code></li>
              <li>Or run locally: <code className="bg-orange-100 px-2 py-0.5 rounded">npm run dev</code></li>
            </ol>
            <div className="flex gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setDismissed(true)}
                className="border-orange-600 text-orange-900 hover:bg-orange-100"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (hasNetworkIssue) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4">
        <Alert variant="destructive" className="shadow-lg">
          <WifiOff className="h-5 w-5" />
          <AlertTitle className="font-semibold">
            Network Connection Issue
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Cannot connect to the server. Please check your internet connection.</p>
            <div className="flex gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="border-white text-white hover:bg-white/10"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setDismissed(true)}
                className="border-white text-white hover:bg-white/10"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}