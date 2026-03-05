/**
 * NETWORK DIAGNOSTICS FOR ADD SUPPLIER/CATEGORY ISSUE
 * 
 * Since you were able to add data before, this will help identify
 * what changed (auth session, browser, network, etc.)
 * 
 * USAGE:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Follow the prompts
 */

console.clear();
console.log('%c═══════════════════════════════════════════════════════════════', 'color: #FF5722; font-weight: bold');
console.log('%c   NETWORK DIAGNOSTICS', 'color: #FF5722; font-weight: bold; font-size: 16px');
console.log('%c   Troubleshooting "Cannot Add Supplier/Category" Issue', 'color: #FF5722; font-size: 12px');
console.log('%c═══════════════════════════════════════════════════════════════', 'color: #FF5722; font-weight: bold');
console.log('');

let issuesFound = [];
let quickFixes = [];

// ────────────────────────────────────────────────────────────────
// TEST 1: Check Auth Token
// ────────────────────────────────────────────────────────────────
console.log('%c🔍 TEST 1: Checking Authentication...', 'color: #2196F3; font-weight: bold');

const authToken = localStorage.getItem('sb-tillsup-auth-token');

if (!authToken) {
  console.log('%c❌ ISSUE: No auth token found', 'color: #f44336; font-weight: bold');
  issuesFound.push('No auth token');
  quickFixes.push('ACTION: Logout and login again');
} else {
  try {
    const parsed = JSON.parse(authToken);
    const expiresAt = parsed.expires_at ? new Date(parsed.expires_at * 1000) : null;
    const now = new Date();
    
    console.log('   Token exists:', '✅');
    console.log('   Access token:', parsed.access_token ? '✅ Present' : '❌ Missing');
    console.log('   Expires at:', expiresAt ? expiresAt.toLocaleString() : 'Unknown');
    
    if (expiresAt && expiresAt < now) {
      console.log('%c❌ ISSUE: Auth token expired', 'color: #f44336; font-weight: bold');
      console.log('   Expired:', Math.floor((now - expiresAt) / 60000), 'minutes ago');
      issuesFound.push('Auth token expired');
      quickFixes.push('ACTION: Logout and login again');
    } else {
      console.log('   Status:', '%c✅ Valid', 'color: #4CAF50; font-weight: bold');
    }
  } catch (err) {
    console.log('%c❌ ISSUE: Auth token corrupted', 'color: #f44336; font-weight: bold');
    issuesFound.push('Auth token corrupted');
    quickFixes.push('ACTION: Run: localStorage.clear(); location.reload();');
  }
}

console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 2: Test Supabase Connection
// ────────────────────────────────────────────────────────────────
console.log('%c🔍 TEST 2: Testing Supabase Connection...', 'color: #2196F3; font-weight: bold');

async function testConnection() {
  try {
    const testUrl = 'https://ohpshxeynukbogwwezrt.supabase.co/rest/v1/';
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ocHNoeGV5bnVrYm9nd3dlenJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3MjM2NzgsImV4cCI6MjA1MTI5OTY3OH0.gKAXO4FqvEa7QqXJ5_JdqvDG5CL3SevbqmJJKhq1cCU';
    
    console.log('   Testing URL:', testUrl);
    
    const response = await fetch(testUrl, {
      headers: { 'apikey': apiKey }
    });
    
    console.log('   Response status:', response.status);
    console.log('   Response OK:', response.ok);
    
    if (response.ok) {
      console.log('   Status:', '%c✅ Supabase is reachable', 'color: #4CAF50; font-weight: bold');
    } else {
      console.log('%c❌ ISSUE: Supabase returned error status', 'color: #f44336; font-weight: bold');
      issuesFound.push('Supabase connection error: ' + response.status);
      quickFixes.push('ACTION: Check Supabase status page');
    }
  } catch (err) {
    console.log('%c❌ ISSUE: Cannot reach Supabase', 'color: #f44336; font-weight: bold');
    console.log('   Error:', err.message);
    issuesFound.push('Network error: ' + err.message);
    
    if (err.message.includes('Failed to fetch')) {
      quickFixes.push('ACTION: Try different browser or incognito mode');
      quickFixes.push('ACTION: Disable browser extensions (ad blockers)');
      quickFixes.push('ACTION: Check if antivirus/firewall is blocking');
    }
  }
}

await testConnection();
console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 3: Check Browser Extensions
// ────────────────────────────────────────────────────────────────
console.log('%c🔍 TEST 3: Checking Browser Environment...', 'color: #2196F3; font-weight: bold');

// Check if running in incognito/private mode (approximation)
const isLikelyPrivate = !window.indexedDB;
console.log('   Private/Incognito mode:', isLikelyPrivate ? '⚠️  Possible' : '✅ Normal mode');

// Check user agent
console.log('   Browser:', navigator.userAgent.split(' ').pop());

// Check if service workers are active
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    if (registrations.length > 0) {
      console.log('   Service workers:', '⚠️', registrations.length, 'active');
      issuesFound.push('Active service workers detected');
      quickFixes.push('ACTION: Unregister service workers or hard refresh');
    } else {
      console.log('   Service workers:', '✅ None');
    }
  });
}

console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 4: Check localStorage Space
// ────────────────────────────────────────────────────────────────
console.log('%c🔍 TEST 4: Checking localStorage Health...', 'color: #2196F3; font-weight: bold');

let totalSize = 0;
const keys = Object.keys(localStorage);

keys.forEach(key => {
  const size = (localStorage[key].length + key.length) * 2;
  totalSize += size;
});

const sizeKB = (totalSize / 1024).toFixed(2);
console.log('   Total keys:', keys.length);
console.log('   Total size:', sizeKB, 'KB');

if (totalSize > 5242880) { // 5 MB
  console.log('%c⚠️  WARNING: localStorage is getting full', 'color: #FF9800; font-weight: bold');
  issuesFound.push('localStorage nearly full');
  quickFixes.push('ACTION: Clear old data from localStorage');
}

// Check for suspicious keys
const suspiciousKeys = keys.filter(k => 
  k.includes('pos_') || k.includes('cache') || k.includes('old')
);

if (suspiciousKeys.length > 0) {
  console.log('%c⚠️  WARNING: Found potentially stale keys:', 'color: #FF9800; font-weight: bold');
  console.log('   Suspicious keys:', suspiciousKeys);
  issuesFound.push('Stale localStorage keys found');
  quickFixes.push('ACTION: Clear localStorage except auth token');
}

console.log('');

// ────────────────────────────────────────────────────────────────
// TEST 5: Test Actual Insert (if auth exists)
// ────────────────────────────────────────────────────────────────
if (authToken) {
  console.log('%c🔍 TEST 5: Testing Actual Database Insert...', 'color: #2196F3; font-weight: bold');
  console.log('   This will attempt a real test insert to categories table');
  console.log('   (You can delete it after)');
  console.log('');
  
  console.log('%cRun this command to test:', 'color: #666; font-weight: bold');
  console.log('%c' + `
async function testInsert() {
  const testCategory = {
    name: 'TEST_DIAGNOSTIC_' + Date.now(),
    description: 'Diagnostic test - safe to delete',
    business_id: JSON.parse(localStorage.getItem('sb-tillsup-auth-token')).user.user_metadata.businessId,
    status: 'active'
  };
  
  try {
    const response = await fetch('https://ohpshxeynukbogwwezrt.supabase.co/rest/v1/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ocHNoeGV5bnVrYm9nd3dlenJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3MjM2NzgsImV4cCI6MjA1MTI5OTY3OH0.gKAXO4FqvEa7QqXJ5_JdqvDG5CL3SevbqmJJKhq1cCU',
        'Authorization': 'Bearer ' + JSON.parse(localStorage.getItem('sb-tillsup-auth-token')).access_token,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testCategory)
    });
    
    console.log('Test insert result:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('%c✅ SUCCESS: Database insert works!', 'color: #4CAF50; font-weight: bold');
      console.log('   Inserted record:', data);
      console.log('%c   You can delete this test category from the UI', 'color: #666; font-style: italic');
    } else {
      const error = await response.text();
      console.log('%c❌ FAILED: Database insert blocked', 'color: #f44336; font-weight: bold');
      console.log('   Status:', response.status);
      console.log('   Error:', error);
    }
  } catch (err) {
    console.log('%c❌ NETWORK ERROR:', 'color: #f44336; font-weight: bold', err.message);
  }
}

testInsert();
  `, 'background: #f5f5f5; padding: 10px; border-radius: 4px; color: #000; font-family: monospace; font-size: 11px');
}

console.log('');

// ────────────────────────────────────────────────────────────────
// SUMMARY
// ────────────────────────────────────────────────────────────────
setTimeout(() => {
  console.log('%c═══════════════════════════════════════════════════════════════', 'color: #FF5722; font-weight: bold');
  console.log('%c   DIAGNOSTIC SUMMARY', 'color: #FF5722; font-weight: bold; font-size: 16px');
  console.log('%c═══════════════════════════════════════════════════════════════', 'color: #FF5722; font-weight: bold');
  console.log('');
  
  if (issuesFound.length === 0) {
    console.log('%c✅ No obvious issues detected', 'color: #4CAF50; font-weight: bold; font-size: 14px');
    console.log('');
    console.log('The error might be temporary. Try these:');
    console.log('  1. Hard refresh (Ctrl+Shift+R)');
    console.log('  2. Wait 1 minute and try again');
    console.log('  3. Try incognito/private mode');
    console.log('  4. Try different browser');
  } else {
    console.log('%c⚠️  Issues Found:', 'color: #FF9800; font-weight: bold; font-size: 14px');
    issuesFound.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    
    console.log('');
    console.log('%c🔧 Recommended Actions:', 'color: #2196F3; font-weight: bold; font-size: 14px');
    quickFixes.forEach((fix, i) => {
      console.log(`  ${i + 1}. ${fix}`);
    });
  }
  
  console.log('');
  console.log('%c💡 Quick Fixes to Try:', 'color: #9C27B0; font-weight: bold; font-size: 14px');
  console.log('');
  
  console.log('%c1. Logout and Login Again', 'color: #666; font-weight: bold');
  console.log('%c   localStorage.clear(); location.href = \"/\";', 'background: #f5f5f5; padding: 4px; font-family: monospace');
  console.log('');
  
  console.log('%c2. Hard Refresh', 'color: #666; font-weight: bold');
  console.log('   Windows/Linux: Ctrl + Shift + R');
  console.log('   Mac: Cmd + Shift + R');
  console.log('');
  
  console.log('%c3. Try Incognito/Private Mode', 'color: #666; font-weight: bold');
  console.log('   Ctrl + Shift + N (Chrome)');
  console.log('   Ctrl + Shift + P (Firefox)');
  console.log('');
  
  console.log('%c4. Disable Browser Extensions', 'color: #666; font-weight: bold');
  console.log('   Common culprits: Ad blockers, Privacy extensions, VPNs');
  console.log('');
  
  console.log('%c5. Clear Browser Cache', 'color: #666; font-weight: bold');
  console.log('   DevTools → Network → Disable cache checkbox');
  console.log('   Or: Settings → Privacy → Clear browsing data');
  console.log('');
  
  console.log('%c═══════════════════════════════════════════════════════════════', 'color: #FF5722; font-weight: bold');
}, 2000);
