/**
 * ULTRA-AGGRESSIVE ERROR SUPPRESSION
 * This must be loaded FIRST, before anything else
 */

(function() {
  'use strict';
  
  // Track suppression
  window.__figmaErrorsSuppressed = 0;
  
  console.log(
    '%c⚡ ULTRA-AGGRESSIVE ERROR SUPPRESSION LOADING...', 
    'background: #dc2626; color: white; padding: 10px 20px; font-weight: bold; font-size: 16px;'
  );
  
  // Save ALL original methods
  const _error = console.error;
  const _warn = console.warn;
  const _log = console.log;
  const _info = console.info;
  const _debug = console.debug;
  
  // Helper function to detect Figma errors
  function isFigmaError(args) {
    const str = args.map(a => {
      if (typeof a === 'object' && a !== null) {
        if (a.stack) return a.stack;
        if (a.message) return a.message;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    }).join(' ');
    
    return (
      str.includes('devtools_worker') ||
      str.includes('figma.com/webpack') ||
      str.includes('figma.com/webpack-artifacts') ||
      (str.includes('Failed to fetch') && str.includes('figma')) ||
      str.includes('devtools_worker-7f68a886400dcd44')
    );
  }
  
  // Override ALL console methods
  console.error = function(...args) {
    if (isFigmaError(args)) {
      window.__figmaErrorsSuppressed++;
      return; // SUPPRESS
    }
    _error.apply(console, args);
  };
  
  console.warn = function(...args) {
    if (isFigmaError(args)) {
      window.__figmaErrorsSuppressed++;
      return; // SUPPRESS
    }
    _warn.apply(console, args);
  };
  
  console.log = function(...args) {
    if (isFigmaError(args)) {
      window.__figmaErrorsSuppressed++;
      return; // SUPPRESS
    }
    _log.apply(console, args);
  };
  
  console.info = function(...args) {
    if (isFigmaError(args)) {
      window.__figmaErrorsSuppressed++;
      return; // SUPPRESS
    }
    _info.apply(console, args);
  };
  
  console.debug = function(...args) {
    if (isFigmaError(args)) {
      window.__figmaErrorsSuppressed++;
      return; // SUPPRESS
    }
    _debug.apply(console, args);
  };
  
  // Intercept window.onerror
  const _onerror = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const msg = String(message);
    const src = String(source || '');
    
    if (
      src.includes('devtools_worker') ||
      src.includes('figma.com/webpack') ||
      (msg.includes('Failed to fetch') && src.includes('figma'))
    ) {
      window.__figmaErrorsSuppressed++;
      return true; // Prevent default
    }
    
    if (_onerror) {
      return _onerror(message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Intercept unhandledrejection - CAPTURE PHASE
  window.addEventListener('unhandledrejection', function(event) {
    const error = event.reason;
    const stack = error?.stack || '';
    const msg = error?.message || String(error);
    
    if (
      stack.includes('devtools_worker') ||
      stack.includes('figma.com/webpack') ||
      stack.includes('figma.com') ||
      (msg.includes('Failed to fetch'))
    ) {
      window.__figmaErrorsSuppressed++;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }
  }, true); // CAPTURE PHASE
  
  // Intercept error events - CAPTURE PHASE
  window.addEventListener('error', function(event) {
    const src = event.filename || '';
    const msg = event.message || '';
    
    if (
      src.includes('devtools_worker') ||
      src.includes('figma.com/webpack') ||
      (msg.includes('Failed to fetch') && src.includes('figma'))
    ) {
      window.__figmaErrorsSuppressed++;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return true;
    }
  }, true); // CAPTURE PHASE
  
  console.log(
    '%c✅ ULTRA-AGGRESSIVE SUPPRESSION ACTIVE', 
    'background: #10b981; color: white; padding: 8px 16px; font-weight: bold; font-size: 14px;'
  );
  console.log(
    '%c   → All console methods overridden', 
    'color: #10b981; font-weight: bold;'
  );
  console.log(
    '%c   → All error events intercepted (capture phase)', 
    'color: #10b981; font-weight: bold;'
  );
  console.log(
    '%c   → Figma errors will be INVISIBLE', 
    'color: #10b981; font-weight: bold;'
  );
  
})();
