import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://ohpshxeynukbogwwezrt.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ocHNoeGV5bnVrYm9nd3dlenJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODM4NjQsImV4cCI6MjA4NzE1OTg2NH0.elha4Cw-xQrzXvHxBhsAaCasVv6eSLD-CHBEdFOMmDY';

// Hybrid lock implementation to handle potentially different expectations
// and bypass Navigator LockManager timeouts
const debugLock: any = async (name: string, ...args: any[]) => {
  // navigator.locks.request(name, callback) or (name, options, callback)
  // The callback is always the last argument
  const func = args[args.length - 1];
  if (typeof func === 'function') {
      return func();
  }
  return Promise.resolve();
};

// Ensure it has the request method if the client expects a NavigatorLockManager object interface
debugLock.request = debugLock;
debugLock.query = async () => ({});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-tillsup-auth-token', // Unique key for main app session
    lock: debugLock
  },
  global: {
    headers: {
      'X-Client-Info': 'tillsup-web'
    },
    fetch: (url, options = {}) => {
      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal
      })
        .then(response => {
          clearTimeout(timeoutId);
          return response;
        })
        .catch(err => {
          clearTimeout(timeoutId);
          // Suppress network errors - these are common and handled by individual components
          // Only log if it's not a network/abort error
          if (err.name !== 'AbortError' && err.name !== 'TypeError') {
            console.debug('Supabase request failed:', err.message);
          }
          throw err;
        });
    }
  },
  db: {
    schema: 'public'
  }
  // Disable realtime entirely to prevent WebSocket errors
  // Can be re-enabled if needed: realtime: { params: { eventsPerSecond: 10 } }
});