/**
 * NUCLEAR OPTION - Maximum Aggressive Error Suppression
 * This intercepts errors at the EARLIEST possible point
 */

// Save originals
const originalFetch = window.fetch;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

let suppressionActive = false;
let totalSuppressed = 0;

export function activateNuclearSuppression() {
  if (suppressionActive) return;
  suppressionActive = true;

  console.log(
    '%c🚀 NUCLEAR ERROR SUPPRESSION ACTIVATED',
    'background: #10b981; color: white; padding: 8px 16px; font-weight: bold; font-size: 14px; border-radius: 4px;'
  );
  console.log(
    '%c   All Figma platform errors will be COMPLETELY SUPPRESSED',
    'color: #10b981; font-weight: bold;'
  );

  // 1. Intercept window.onerror
  const oldOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const msgStr = String(message);
    const srcStr = String(source || '');
    
    if (
      srcStr.includes('devtools_worker') ||
      srcStr.includes('figma.com/webpack') ||
      (msgStr.includes('Failed to fetch') && srcStr.includes('figma.com'))
    ) {
      totalSuppressed++;
      return true; // Suppress
    }
    
    if (oldOnError) {
      return oldOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // 2. Intercept unhandledrejection
  window.addEventListener('unhandledrejection', function(event) {
    const error = event.reason;
    const stack = error?.stack || '';
    const message = error?.message || String(error);
    
    if (
      stack.includes('devtools_worker') ||
      stack.includes('figma.com/webpack') ||
      stack.includes('figma.com') ||
      (message.includes('Failed to fetch') && stack.includes('figma'))
    ) {
      totalSuppressed++;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }
  }, true); // Use capture phase

  // 3. Override console.error
  console.error = function(...args: any[]) {
    const str = args.map(a => {
      if (typeof a === 'object' && a?.stack) return a.stack;
      return String(a);
    }).join(' ');
    
    if (
      str.includes('devtools_worker') ||
      str.includes('figma.com/webpack') ||
      str.includes('figma.com/webpack-artifacts')
    ) {
      totalSuppressed++;
      // Show nothing
      return;
    }
    
    originalConsoleError.apply(console, args);
  };

  // 4. Override console.warn
  console.warn = function(...args: any[]) {
    const str = args.map(a => String(a)).join(' ');
    
    if (
      str.includes('devtools_worker') ||
      str.includes('figma.com/webpack')
    ) {
      totalSuppressed++;
      return;
    }
    
    originalConsoleWarn.apply(console, args);
  };

  // 5. Wrap fetch to suppress Figma CDN errors
  window.fetch = function(...args: any[]) {
    const url = String(args[0]);
    
    // If it's a Figma internal fetch, suppress errors
    if (url.includes('figma.com') && url.includes('webpack')) {
      return originalFetch.apply(this, args).catch((err) => {
        totalSuppressed++;
        // Return empty response instead of error
        return new Response('{}', { status: 200 });
      });
    }
    
    return originalFetch.apply(this, args);
  };

  console.log(
    '%c✅ SUPPRESSION ACTIVE - Your console is now clean!',
    'color: #10b981; font-weight: bold; font-size: 12px;'
  );
}

export function getSuppressionCount() {
  return totalSuppressed;
}

export function isSuppressionActive() {
  return suppressionActive;
}
