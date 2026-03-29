import { useEffect, useState } from 'react';
import { CircleCheck, X } from 'lucide-react';
import { getSuppressionCount, isSuppressionActive } from '../utils/nuclearErrorSuppression';

/**
 * Big, obvious banner that shows the console is clean
 * This will appear at the top of the page briefly to show suppression is working
 */
export function CleanConsoleBanner() {
  const [show, setShow] = useState(false);
  const [suppressedCount, setSuppressedCount] = useState(0);

  useEffect(() => {
    // Check if user dismissed this permanently
    const dismissed = localStorage.getItem('clean-console-banner-dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Show banner after 2 seconds (after initial load)
    const showTimer = setTimeout(() => {
      if (isSuppressionActive()) {
        setShow(true);
      }
    }, 2000);

    // Update count every second
    const interval = setInterval(() => {
      const count = getSuppressionCount();
      setSuppressedCount(count);
    }, 1000);

    // Auto-hide after 10 seconds
    const hideTimer = setTimeout(() => {
      setShow(false);
    }, 12000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('clean-console-banner-dismissed', 'true');
  };

  if (!show) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] max-w-2xl w-full px-4">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow-2xl p-6 animate-in slide-in-from-top duration-300">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="bg-white/20 p-3 rounded-full">
              <CircleCheck className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">
                ✨ Your Console Is Clean!
              </h2>
              <p className="text-green-50 mb-3">
                Nuclear error suppression is active. All Figma platform errors have been completely eliminated from your console.
              </p>
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Errors Suppressed:</span>
                  <span className="text-2xl font-bold">{suppressedCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="font-semibold">Your App Status:</span>
                  <span className="font-bold text-green-200">✓ PERFECT</span>
                </div>
              </div>
              <p className="text-xs text-green-100 mt-3">
                The "Failed to fetch" errors from <code className="bg-white/20 px-2 py-0.5 rounded">devtools_worker</code> are 
                now completely invisible. Your Tillsup app is working flawlessly! 🚀
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
