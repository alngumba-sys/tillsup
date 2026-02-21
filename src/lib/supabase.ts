import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohpshxeynukbogwwezrt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ocHNoeGV5bnVrYm9nd3dlenJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODM4NjQsImV4cCI6MjA4NzE1OTg2NH0.elha4Cw-xQrzXvHxBhsAaCasVv6eSLD-CHBEdFOMmDY';

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
    lock: debugLock
  }
});
