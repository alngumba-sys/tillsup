╔══════════════════════════════════════════════════════════════════════════════╗
║                     STAFF CREATION ERROR - QUICK FIX                         ║
║                                                                              ║
║  ERROR: ERR_BLOCKED_BY_ADMINISTRATOR when creating staff                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
 ✅ SOLUTION 1: DISABLE BROWSER EXTENSIONS (90% OF CASES)
═══════════════════════════════════════════════════════════════════════════════

The error is caused by browser extensions blocking Supabase API calls.

CHROME/EDGE:
1. Click the puzzle icon 🧩 (top-right)
2. Turn OFF these extensions:
   • uBlock Origin
   • AdBlock Plus
   • Privacy Badger
   • Any other ad blocker or privacy extension

3. Press Ctrl+Shift+R (hard refresh)
4. Try creating staff again

FIREFOX:
1. Click menu ☰ → Add-ons
2. Disable all extensions temporarily
3. Press Ctrl+Shift+R (hard refresh)
4. Try creating staff again

═══════════════════════════════════════════════════════════════════════════════
 ✅ SOLUTION 2: TRY INCOGNITO MODE (FASTEST TEST)
═══════════════════════════════════════════════════════════════════════════════

1. Open incognito/private window:
   • Chrome: Ctrl+Shift+N
   • Firefox: Ctrl+Shift+P
   • Safari: Cmd+Shift+N

2. Log in to Tillsup
3. Try creating staff
4. If it works → The issue is a browser extension

═══════════════════════════════════════════════════════════════════════════════
 ✅ SOLUTION 3: USE CONNECTION TEST TOOL
═══════════════════════════════════════════════════════════════════════════════

1. Go to Staff page in Tillsup
2. Click "Connection Test" tab
3. Click "Run Connection Test"
4. Check what fails:
   • Database Query Failed → Network blocking Supabase
   • Auth Connection Failed → Firewall blocking
   • All tests pass → Issue is elsewhere

═══════════════════════════════════════════════════════════════════════════════
 ✅ SOLUTION 4: TRY DIFFERENT NETWORK
═══════════════════════════════════════════════════════════════════════════════

If corporate/school network is blocking Supabase:

1. Use mobile hotspot instead of WiFi
2. Try from home WiFi
3. Disable VPN if using one

═══════════════════════════════════════════════════════════════════════════════
 ✅ SOLUTION 5: CHECK SUPABASE SETTINGS
═══════════════════════════════════════════════════════════════════════════════

1. Go to https://app.supabase.com
2. Open your project
3. Go to: Authentication → Providers → Email
4. Set "Confirm email" to OFF
   (REQUIRED for staff creation to work)
5. Save changes

═══════════════════════════════════════════════════════════════════════════════
 📋 CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

□ Disabled ad blocker/privacy extensions
□ Hard refreshed page (Ctrl+Shift+R)
□ Tried incognito mode
□ Ran Connection Test
□ Tried mobile hotspot/different WiFi
□ Verified Supabase email confirmation is OFF
□ Cleared browser cache

═══════════════════════════════════════════════════════════════════════════════
 🔍 WHAT'S BEING BLOCKED?
═══════════════════════════════════════════════════════════════════════════════

Domain: ohpshxeynukbogwwezrt.supabase.co

Ad blockers and firewalls see Supabase API calls as "tracking" and block them.

TO FIX PERMANENTLY:
Add *.supabase.co to your ad blocker's whitelist

═══════════════════════════════════════════════════════════════════════════════
 🆘 STILL NOT WORKING?
═══════════════════════════════════════════════════════════════════════════════

1. Press F12 (open Developer Tools)
2. Go to Console tab
3. Screenshot all red errors
4. Check STAFF_CREATION_FIX.md for detailed guide
5. Check NETWORK_CONNECTION_TROUBLESHOOTING.md for advanced help

═══════════════════════════════════════════════════════════════════════════════
 ℹ️  FILES UPDATED
═══════════════════════════════════════════════════════════════════════════════

✓ AuthContext.tsx - Added network error detection
✓ StaffManagementTab.tsx - Added network error handling
✓ Staff.tsx - Added Connection Test tab
✓ SupabaseConnectionTest.tsx - New diagnostic tool
✓ STAFF_CREATION_FIX.md - Detailed troubleshooting guide
✓ NETWORK_CONNECTION_TROUBLESHOOTING.md - Technical guide
✓ This file - Quick reference

═══════════════════════════════════════════════════════════════════════════════

Last Updated: February 27, 2025
Version: 1.0
