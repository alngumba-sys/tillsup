# Network Connection Troubleshooting Guide

## Issue: ERR_BLOCKED_BY_ADMINISTRATOR

If you're seeing "ERR_BLOCKED_BY_ADMINISTRATOR" errors when trying to create staff or access the database, this guide will help you resolve the issue.

### Common Causes

1. **Browser Extensions**
   - Ad blockers (uBlock Origin, AdBlock Plus, etc.)
   - Privacy extensions (Privacy Badger, Ghostery, etc.)
   - Script blockers (NoScript, ScriptSafe, etc.)

2. **Network/Firewall**
   - Corporate firewall blocking Supabase domains
   - School/University network restrictions
   - VPN blocking certain domains
   - Antivirus software blocking connections

3. **Supabase Project Issues**
   - Project paused due to inactivity
   - Project deleted or expired
   - Invalid credentials in code

### How to Fix

#### Step 1: Disable Browser Extensions

1. **Chrome/Edge:**
   - Click the puzzle icon (Extensions) in the toolbar
   - Disable all extensions temporarily
   - Refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
   - Try creating staff again

2. **Firefox:**
   - Click menu → Add-ons and Themes
   - Disable all extensions temporarily
   - Refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
   - Try creating staff again

#### Step 2: Check Network/Firewall

1. **Test Supabase Connection:**
   - Go to Staff page → Connection Test tab
   - Click "Run Connection Test"
   - Check which tests fail

2. **Try Different Network:**
   - Switch from WiFi to mobile hotspot
   - Try a different WiFi network
   - Disable VPN if using one

3. **Whitelist Supabase Domain:**
   - Add `*.supabase.co` to your firewall/antivirus whitelist
   - Specifically: `ohpshxeynukbogwwezrt.supabase.co`

#### Step 3: Verify Supabase Project

1. **Check Project Status:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Check if your project is active (not paused)
   - Verify project URL matches: `ohpshxeynukbogwwezrt.supabase.co`

2. **Check Email Confirmation Settings:**
   - Go to: Dashboard → Authentication → Providers → Email
   - Set "Confirm email" to **OFF** for staff creation to work
   - This allows admins to create staff accounts directly

3. **Check RLS Policies:**
   - Verify Row Level Security (RLS) policies are configured
   - Run the SQL scripts in `/supabase/` folder if needed

#### Step 4: Clear Browser Cache

1. **Hard Refresh:**
   - Windows/Linux: Ctrl+Shift+R
   - Mac: Cmd+Shift+R

2. **Clear All Cache:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data
   - Select "Cached images and files"
   - Click "Clear data"

#### Step 5: Try Incognito/Private Mode

1. Open browser in incognito/private mode
2. This runs without extensions
3. Try creating staff again
4. If it works, the issue is a browser extension

### Using the Connection Test Tool

1. **Access the Tool:**
   - Go to Staff page
   - Click "Connection Test" tab
   - Click "Run Connection Test"

2. **Interpret Results:**
   - ✅ **All Green:** Connection is fine, issue is elsewhere
   - ❌ **Basic Connection Failed:** Supabase client initialization issue
   - ❌ **Auth Connection Failed:** Network blocking Supabase auth
   - ❌ **Database Query Failed:** Network blocking Supabase database

### Still Having Issues?

If none of the above solutions work:

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for specific error messages
   - Screenshot and share with support

2. **Try Different Browser:**
   - Test in Chrome, Firefox, Edge, Safari
   - If it works in one browser, the issue is browser-specific

3. **Contact Support:**
   - Provide screenshots of:
     - Error messages
     - Connection test results
     - Browser console errors

### Prevention

1. **Whitelist Supabase:**
   - Add `*.supabase.co` to ad blocker whitelist
   - Add to antivirus/firewall exceptions

2. **Use Compatible Browser:**
   - Latest Chrome, Firefox, or Edge
   - Keep browser updated

3. **Avoid Restrictive Networks:**
   - Use personal WiFi instead of corporate/school networks
   - Use mobile hotspot if needed

## Technical Details

### What's Happening?

When you create a staff member:
1. Frontend sends request to Supabase database
2. Request includes authentication token
3. Supabase validates token and executes query
4. Response is sent back to frontend

If any step is blocked by browser extensions or network firewalls, you'll see:
- `ERR_BLOCKED_BY_ADMINISTRATOR`
- `Failed to fetch`
- `NetworkError`
- WebSocket connection failures

### Why Does This Happen?

- **Ad Blockers:** Block tracking/analytics scripts, sometimes block legitimate API calls
- **Privacy Extensions:** Block third-party cookies/requests, sometimes block Supabase
- **Firewalls:** Block unknown domains, especially cloud services like Supabase
- **CORS:** Browser security preventing cross-origin requests

### The Fix

The code has been updated with:
1. Better error detection for network issues
2. Specific error messages for blocked connections
3. Connection diagnostic tool
4. Retry mechanisms for transient failures

But ultimately, the fix is on the client side:
- Disable blocking extensions
- Use different network
- Verify Supabase project is active
