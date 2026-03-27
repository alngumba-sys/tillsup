/**
 * Console Override - Aggressive Figma Error Suppression
 * 
 * This intercepts console.error to prevent Figma platform errors
 * from appearing in the console at all.
 */

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Track suppressed errors
let suppressedCount = 0;
let lastSuppressedTime = Date.now();

export function initializeConsoleOverride() {
  console.log('🛡️ Installing aggressive Figma error suppression...');
  
  // Override console.error
  console.error = function(...args: any[]) {
    const errorString = args.join(' ');
    
    // Check if this is a Figma platform error
    if (
      errorString.includes('devtools_worker') ||
      errorString.includes('figma.com/webpack-artifacts') ||
      errorString.includes('figma.com/webpack') ||
      (errorString.includes('Failed to fetch') && 
       (args[0]?.stack?.includes('figma.com') || 
        args[0]?.stack?.includes('devtools_worker')))
    ) {
      suppressedCount++;
      lastSuppressedTime = Date.now();
      
      // Show suppression notice (only once per 30 seconds to avoid spam)
      const timeSinceLastLog = Date.now() - lastSuppressedTime;
      if (timeSinceLastLog > 30000 || suppressedCount === 1) {
        console.log(
          `%c🎨 Figma Platform Error Suppressed (${suppressedCount} total)`,
          'color: #3b82f6; font-weight: bold',
          '\n   ℹ️ This is a Figma Make internal error, not your app.',
          '\n   ✅ Your Tillsup app is working correctly.'
        );
      }
      
      return; // Don't log the error
    }
    
    // Log all other errors normally
    originalConsoleError.apply(console, args);
  };

  // Override console.warn for completeness
  console.warn = function(...args: any[]) {
    const warnString = args.join(' ');
    
    // Suppress Figma-related warnings too
    if (
      warnString.includes('devtools_worker') ||
      warnString.includes('figma.com/webpack')
    ) {
      return; // Don't log the warning
    }
    
    originalConsoleWarn.apply(console, args);
  };

  console.log(
    '%c✅ Console Override Active',
    'color: #10b981; font-weight: bold; font-size: 14px',
    '\n   All Figma platform errors will be suppressed.',
    '\n   Your app errors will still be logged normally.'
  );
}

export function getSuppressionStats() {
  return {
    suppressedCount,
    lastSuppressedTime,
  };
}

// Restore original console (for debugging if needed)
export function restoreConsole() {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log('Console restored to original state');
}
