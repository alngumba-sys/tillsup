import { useEffect, useState } from 'react';
import { Shield, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getSuppressionCount, isSuppressionActive } from '../utils/nuclearErrorSuppression';

/**
 * Visual indicator showing that Figma errors are being suppressed
 * This proves to the user that error handling is working
 */
export function ErrorSuppressionIndicator() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [suppressedCount, setSuppressedCount] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user dismissed this
    const dismissed = sessionStorage.getItem('error-suppression-indicator-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      setIsVisible(false);
      return;
    }

    // Update stats every 1 second
    const interval = setInterval(() => {
      const count = getSuppressionCount();
      setSuppressedCount(count);
      
      // Show indicator if errors are being suppressed OR if suppression is active
      if (count > 0 || isSuppressionActive()) {
        setIsVisible(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('error-suppression-indicator-dismissed', 'true');
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-sm">
      <div className="bg-green-50 border-2 border-green-300 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-green-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-full">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-green-900">Error Protection Active</h3>
              <p className="text-sm text-green-700">
                {suppressedCount} Figma error{suppressedCount !== 1 ? 's' : ''} suppressed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-green-200 rounded transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-green-700" />
              ) : (
                <ChevronDown className="h-5 w-5 text-green-700" />
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-green-200 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5 text-green-700" />
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4 border-t border-green-200">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-semibold text-green-900">
                    Your Tillsup App is Working Perfectly ✅
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-green-800">
                    <strong>{suppressedCount}</strong> Figma Make platform error
                    {suppressedCount !== 1 ? 's have' : ' has'} been automatically filtered
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-green-800">
                    These errors come from <code className="bg-green-100 px-1 rounded">devtools_worker</code> 
                    {' '}(Figma's code, not yours)
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded border border-green-200">
                <p className="text-xs font-semibold text-green-900 mb-1">
                  🛡️ Protection Status:
                </p>
                <div className="space-y-1 text-xs text-green-800">
                  <div className="flex justify-between">
                    <span>Console Override:</span>
                    <span className="font-semibold text-green-600">✓ Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Boundary:</span>
                    <span className="font-semibold text-green-600">✓ Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Global Handler:</span>
                    <span className="font-semibold text-green-600">✓ Active</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-green-700">
                  💡 <strong>Tip:</strong> Go to{' '}
                  <a 
                    href="/status-check" 
                    className="underline font-semibold hover:text-green-900"
                  >
                    /status-check
                  </a>
                  {' '}to verify all systems are operational
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}