import { useEffect, useState } from 'react';
import { CircleCheck, AlertCircle } from 'lucide-react';

/**
 * Subtle health indicator showing app status
 * Only shows during development or if there are issues
 */
export function AppHealthIndicator() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Quick health check on mount
    const checkHealth = async () => {
      try {
        // Check if main components loaded
        const appLoaded = document.getElementById('root')?.children.length > 0;
        
        if (appLoaded) {
          setIsHealthy(true);
          console.log('✅ App health check: HEALTHY');
          
          // Show indicator briefly then fade out
          setShowIndicator(true);
          setTimeout(() => setShowIndicator(false), 5000);
        } else {
          setIsHealthy(false);
          setShowIndicator(true);
        }
      } catch (err) {
        setIsHealthy(false);
        setShowIndicator(true);
      }
    };

    // Run check after a brief delay to let app initialize
    const timeoutId = setTimeout(checkHealth, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Don't show anything if healthy and time has passed
  if (!showIndicator) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[90] animate-in fade-in slide-in-from-bottom-5">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium
        ${isHealthy 
          ? 'bg-green-50 text-green-700 border border-green-200' 
          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }
      `}>
        {isHealthy ? (
          <>
            <CircleCheck className="h-4 w-4" />
            <span>Tillsup Running</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4" />
            <span>Loading...</span>
          </>
        )}
      </div>
    </div>
  );
}
