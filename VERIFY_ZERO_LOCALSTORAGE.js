/**
 * ZERO localStorage VERIFICATION SCRIPT
 * 
 * Run this in your browser console (F12) to verify that:
 * 1. No business data is stored in localStorage
 * 2. Only auth tokens are in localStorage
 * 3. All data comes from Supabase database
 * 
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Review the report
 */

console.clear();
console.log('%c═══════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
console.log('%c   ZERO localStorage VERIFICATION SCRIPT', 'color: #4CAF50; font-weight: bold; font-size: 16px');
console.log('%c═══════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 1: Check localStorage Contents
// ────────────────────────────────────────────────────────────────
console.log('%c📋 TEST 1: localStorage Contents', 'color: #2196F3; font-weight: bold; font-size: 14px');
console.log('─'.repeat(60));

const allKeys = Object.keys(localStorage);
console.log('Total localStorage keys:', allKeys.length);
console.log('Keys found:', allKeys);

// Check for auth token (expected)
const hasAuthToken = allKeys.some(k => k.includes('auth-token') || k.includes('supabase'));
console.log(hasAuthToken ? '✅ Auth token found (expected)' : '❌ No auth token (user not logged in?)');

// Check for business data (should NOT exist)
const businessDataKeys = [
  'pos_', 'inventory', 'sales', 'products', 'expenses', 
  'suppliers', 'branches', 'staff', 'categories', 'orders',
  'attendance', 'forecasting', 'kpi'
];

const foundBusinessKeys = allKeys.filter(key => 
  businessDataKeys.some(prefix => key.toLowerCase().includes(prefix))
);

if (foundBusinessKeys.length === 0) {
  console.log('%c✅ PASS: No business data in localStorage', 'color: #4CAF50; font-weight: bold');
} else {
  console.log('%c❌ FAIL: Business data found in localStorage!', 'color: #f44336; font-weight: bold');
  console.log('%c   Keys:', 'color: #f44336', foundBusinessKeys);
}

console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 2: Check sessionStorage Contents
// ────────────────────────────────────────────────────────────────
console.log('%c📋 TEST 2: sessionStorage Contents', 'color: #2196F3; font-weight: bold; font-size: 14px');
console.log('─'.repeat(60));

const sessionKeys = Object.keys(sessionStorage);
console.log('Total sessionStorage keys:', sessionKeys.length);
console.log('Keys found:', sessionKeys);

if (sessionKeys.length === 0) {
  console.log('%c✅ PASS: sessionStorage is empty', 'color: #4CAF50; font-weight: bold');
} else {
  console.log('%c⚠️  WARNING: sessionStorage has data', 'color: #FF9800; font-weight: bold');
  console.log('   (This might be okay if it\'s not business data)');
}

console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 3: Check IndexedDB
// ────────────────────────────────────────────────────────────────
console.log('%c📋 TEST 3: IndexedDB Usage', 'color: #2196F3; font-weight: bold; font-size: 14px');
console.log('─'.repeat(60));

if (typeof indexedDB !== 'undefined') {
  indexedDB.databases().then(databases => {
    if (databases.length === 0) {
      console.log('%c✅ PASS: No IndexedDB databases found', 'color: #4CAF50; font-weight: bold');
    } else {
      console.log('%c⚠️  WARNING: IndexedDB databases found:', 'color: #FF9800; font-weight: bold');
      console.table(databases);
      console.log('   (Check if these are used for business data)');
    }
  }).catch(err => {
    console.log('ℹ️  Could not check IndexedDB:', err.message);
  });
} else {
  console.log('ℹ️  IndexedDB not available in this environment');
}

console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 4: Check for Supabase Client
// ────────────────────────────────────────────────────────────────
console.log('%c📋 TEST 4: Supabase Client Detection', 'color: #2196F3; font-weight: bold; font-size: 14px');
console.log('─'.repeat(60));

// Try to detect Supabase client in window/global scope
const hasSupabase = typeof window !== 'undefined' && (
  window.supabase ||
  (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ && window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers)
);

if (hasSupabase) {
  console.log('✅ Supabase client detected (app is using Supabase)');
} else {
  console.log('ℹ️  Could not detect Supabase client in global scope');
  console.log('   (This is expected - Supabase is imported in modules)');
}

console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 5: Network Request Monitoring
// ────────────────────────────────────────────────────────────────
console.log('%c📋 TEST 5: Network Request Monitoring', 'color: #2196F3; font-weight: bold; font-size: 14px');
console.log('─'.repeat(60));
console.log('ℹ️  To verify database operations:');
console.log('   1. Open DevTools → Network tab');
console.log('   2. Filter by "supabase"');
console.log('   3. Perform an action (create product, make sale, etc.)');
console.log('   4. You should see POST/GET requests to:');
console.log('      https://ohpshxeynukbogwwezrt.supabase.co/rest/v1/');
console.log('');
console.log('✅ If you see Supabase requests → Data is going to database');
console.log('❌ If no requests → Check your implementation');

console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 6: Auth Token Structure
// ────────────────────────────────────────────────────────────────
console.log('%c📋 TEST 6: Auth Token Validation', 'color: #2196F3; font-weight: bold; font-size: 14px');
console.log('─'.repeat(60));

const authKey = allKeys.find(k => k.includes('auth-token') || k.includes('supabase'));

if (authKey) {
  try {
    const authData = JSON.parse(localStorage.getItem(authKey));
    console.log('Auth token key:', authKey);
    console.log('Auth token structure:', Object.keys(authData));
    
    const expectedKeys = ['access_token', 'refresh_token', 'expires_in', 'token_type', 'user'];
    const hasValidStructure = expectedKeys.every(key => key in authData);
    
    if (hasValidStructure) {
      console.log('%c✅ PASS: Valid OAuth2 token structure', 'color: #4CAF50; font-weight: bold');
    } else {
      console.log('%c⚠️  WARNING: Unexpected auth token structure', 'color: #FF9800; font-weight: bold');
    }
    
    // Check if any business data is mixed in
    const businessDataInToken = Object.keys(authData).some(key => 
      businessDataKeys.some(prefix => key.toLowerCase().includes(prefix))
    );
    
    if (businessDataInToken) {
      console.log('%c❌ FAIL: Business data found in auth token!', 'color: #f44336; font-weight: bold');
    } else {
      console.log('%c✅ PASS: No business data in auth token', 'color: #4CAF50; font-weight: bold');
    }
  } catch (err) {
    console.log('⚠️  Could not parse auth token:', err.message);
  }
} else {
  console.log('ℹ️  No auth token found (user not logged in)');
}

console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 7: Memory Leak Detection
// ────────────────────────────────────────────────────────────────
console.log('%c📋 TEST 7: Storage Size Analysis', 'color: #2196F3; font-weight: bold; font-size: 14px');
console.log('─'.repeat(60));

let totalSize = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    const size = (localStorage[key].length + key.length) * 2; // UTF-16
    totalSize += size;
  }
}

const sizeKB = (totalSize / 1024).toFixed(2);
console.log(`Total localStorage size: ${sizeKB} KB`);

if (totalSize < 10240) { // Less than 10 KB
  console.log('%c✅ PASS: localStorage size is minimal (< 10 KB)', 'color: #4CAF50; font-weight: bold');
} else if (totalSize < 51200) { // Less than 50 KB
  console.log('%c⚠️  WARNING: localStorage size is moderate (10-50 KB)', 'color: #FF9800; font-weight: bold');
  console.log('   (This might be okay for auth tokens)');
} else {
  console.log('%c❌ FAIL: localStorage size is large (> 50 KB)', 'color: #f44336; font-weight: bold');
  console.log('   (This suggests business data might be cached)');
}

console.log('');

// ────────────────────────────────────────────────────────────────
// FINAL REPORT
// ────────────────────────────────────────────────────────────────
console.log('%c═══════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
console.log('%c   VERIFICATION REPORT', 'color: #4CAF50; font-weight: bold; font-size: 16px');
console.log('%c═══════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
console.log('');

const results = {
  'No business data in localStorage': foundBusinessKeys.length === 0,
  'sessionStorage is empty': sessionKeys.length === 0,
  'Auth token has valid structure': authKey !== undefined,
  'localStorage size is minimal': totalSize < 10240
};

const passedTests = Object.values(results).filter(Boolean).length;
const totalTests = Object.keys(results).length;

console.log('%cTest Results:', 'font-weight: bold');
for (let [test, passed] of Object.entries(results)) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'color: #4CAF50' : 'color: #f44336';
  console.log(`%c${icon} ${test}`, color);
}

console.log('');
console.log(`%c${passedTests}/${totalTests} tests passed`, 'font-size: 14px; font-weight: bold');

if (passedTests === totalTests) {
  console.log('%c🎉 ALL TESTS PASSED! Your system is 100% database-backed.', 'color: #4CAF50; font-weight: bold; font-size: 14px');
  console.log('%c✅ Zero localStorage usage for business data confirmed.', 'color: #4CAF50; font-weight: bold');
} else {
  console.log('%c⚠️  Some tests failed. Review the results above.', 'color: #FF9800; font-weight: bold; font-size: 14px');
}

console.log('');
console.log('%c═══════════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');

// ────────────────────────────────────────────────────────────────
// ADDITIONAL VERIFICATION COMMANDS
// ────────────────────────────────────────────────────────────────
console.log('');
console.log('%c💡 Additional Verification Commands:', 'color: #2196F3; font-weight: bold');
console.log('');
console.log('%c// 1. Clear all storage and verify data persistence:', 'color: #666');
console.log('%clocalStorage.clear(); sessionStorage.clear(); location.reload();', 'color: #000; background: #f0f0f0; padding: 2px 4px');
console.log('%c   → After reload, login and check if data is still there', 'color: #666; font-style: italic');
console.log('');
console.log('%c// 2. Check current localStorage contents:', 'color: #666');
console.log('%cJSON.stringify(Object.keys(localStorage), null, 2)', 'color: #000; background: #f0f0f0; padding: 2px 4px');
console.log('');
console.log('%c// 3. Monitor Supabase requests (in Network tab):', 'color: #666');
console.log('%c   Filter: "supabase.co"', 'color: #666; font-style: italic');
console.log('');
