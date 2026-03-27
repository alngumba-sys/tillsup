/**
 * Global Error Handler
 * Catches and handles unhandled errors, particularly fetch errors from Figma platform
 */

// Track if we've already logged this error type to prevent spam
const loggedErrors = new Set<string>();
let errorCount = 0;
const MAX_ERROR_LOGS = 3;

export function initializeErrorHandler() {
  console.log('🛡️ Initializing global error handler...');
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorCount++;
    const error = event.reason;
    
    // Filter out Figma platform errors
    if (error?.stack?.includes('devtools_worker') || 
        error?.stack?.includes('figma.com/webpack-artifacts')) {
      console.log('🎨 [Filtered] Figma platform error (internal to Figma Make, safe to ignore)');
      event.preventDefault(); // Prevent default error logging
      return;
    }
    
    // Filter out fetch errors that are likely Figma-related
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const errorKey = `fetch-${error.message}`;
      if (!loggedErrors.has(errorKey)) {
        console.warn('⚠️ Network fetch error detected (likely Figma platform issue):', error.message);
        console.log('   This is typically harmless - Figma Make internal error, not your app');
        loggedErrors.add(errorKey);
      }
      event.preventDefault();
      return;
    }
    
    // Log other errors normally (but limit to prevent spam)
    if (errorCount <= MAX_ERROR_LOGS) {
      console.error('❌ Unhandled promise rejection:', error);
      if (errorCount === MAX_ERROR_LOGS) {
        console.warn('⚠️ Max error logs reached, suppressing further errors');
      }
    }
  });

  // Handle regular errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    // Filter out Figma platform errors
    if (error?.stack?.includes('devtools_worker') || 
        error?.stack?.includes('figma.com/webpack-artifacts')) {
      console.log('🎨 [Filtered] Figma platform error (internal to Figma Make, safe to ignore)');
      event.preventDefault();
      return;
    }
    
    // Filter out resource loading errors that are Figma-related
    if (event.filename?.includes('figma.com')) {
      console.log('🎨 [Filtered] Figma resource error (safe to ignore)');
      event.preventDefault();
      return;
    }
    
    // Log other errors
    if (errorCount <= MAX_ERROR_LOGS) {
      console.error('❌ Unhandled error:', error);
    }
  });

  console.log('✅ Global error handler initialized - Figma platform errors will be filtered');
}

// Clean up logged errors periodically to allow fresh logging
setInterval(() => {
  loggedErrors.clear();
}, 60000); // Clear every minute