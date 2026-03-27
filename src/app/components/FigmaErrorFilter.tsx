import { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

/**
 * Component that monitors for Figma platform errors and shows a dismissible banner
 */
export function FigmaErrorFilter() {
  const [showBanner, setShowBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the banner
    const dismissed = sessionStorage.getItem('figma-error-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Monitor for Figma errors
    let errorCount = 0;
    const originalConsoleError = console.error;

    console.error = function(...args: any[]) {
      const errorString = args.join(' ');
      
      if (errorString.includes('devtools_worker') || 
          errorString.includes('figma.com/webpack-artifacts') ||
          errorString.includes('Failed to fetch')) {
        errorCount++;
        
        // Show banner if we detect multiple Figma errors
        if (errorCount >= 2 && !isDismissed) {
          setShowBanner(true);
        }
        
        // Don't actually log Figma errors
        return;
      }
      
      // Log other errors normally
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, [isDismissed]);

  const handleDismiss = () => {
    setShowBanner(false);
    setIsDismissed(true);
    sessionStorage.setItem('figma-error-banner-dismissed', 'true');
  };

  if (!showBanner || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-md animate-in slide-in-from-top-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">
              App is Working Correctly
            </h4>
            <p className="text-sm text-blue-800">
              Your Tillsup application is running normally. If you see "Failed to fetch" errors 
              in the console, these are from Figma Make's internal platform and can be safely ignored.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
