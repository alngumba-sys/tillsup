# Landing Page Visibility Fix

## Problem
You're experiencing an issue where the landing page is not visible when you access the application.

## What I've Fixed

### 1. **Updated Landing Page Loading Logic** (`/src/app/pages/Landing.tsx`)
- Added proper handling of the `loading` state from AuthContext
- The redirect to dashboard now only happens when both:
  - User is authenticated (`isAuthenticated === true`)
  - Authentication loading is complete (`loading === false`)
- Added a loading screen that shows when redirecting authenticated users
- This prevents blank screens during the initial auth check

### 2. **Added Console Logs for Debugging**
- Landing page now logs: `isAuthenticated` and `loading` states
- App.tsx logs when it loads
- This helps you see what's happening in the browser console

### 3. **Updated Page Title** (`/index.html`)
- Changed from "Enterprise POS System" to "Tillsup - Modern POS System"

## How to Test

1. **Open your browser's Developer Console** (F12 or Right-click → Inspect)
2. **Navigate to your application** (http://localhost:5173 or your deployment URL)
3. **Look for these console messages:**
   - `🚀 App component loaded` - Confirms App is rendering
   - `🏠 Landing page loaded, isAuthenticated: false, loading: true/false` - Shows landing page state
   - `🔐 Auth state change:...` - Shows Supabase auth events

## Troubleshooting Steps

### If you still see a blank page:

1. **Check Browser Console for Errors**
   - Look for any red error messages
   - Common issues: Supabase connection errors, CSS loading errors, JavaScript errors

2. **Clear Browser Cache and Storage**
   ```javascript
   // Run this in browser console:
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **Verify Supabase Connection**
   - Check if the Supabase credentials in `/src/lib/supabase.ts` are correct
   - Ensure your Supabase project is active and accessible

4. **Check Network Tab**
   - Open DevTools → Network tab
   - Look for failed requests (red)
   - Check if CSS files are loading (index.css, tailwind.css, theme.css)

### If you see the landing page briefly then get redirected:

This means you're already logged in. To see the landing page:
1. Log out from the application
2. Or clear storage (see step 2 above)
3. Then visit the homepage

### If the page loads but looks broken:

1. **Check CSS Loading**
   - Open DevTools → Network tab
   - Filter by CSS
   - Ensure all CSS files loaded successfully

2. **Check for Font Errors**
   - Look for font loading errors in console
   - Check `/src/styles/fonts.css`

## What Happens Now

### For Non-Authenticated Users:
1. App loads
2. AuthContext initializes (may take up to 8 seconds)
3. Landing page displays immediately (no more blank screen)
4. User can browse the landing page, click "Start Free Trial", "Sign In", etc.

### For Authenticated Users:
1. App loads
2. AuthContext detects existing session
3. Landing page shows a loading screen with Tillsup logo
4. User is redirected to `/app/dashboard`

## Diagnostic Page

I've created a **System Diagnostics Page** to help troubleshoot issues:

**How to access:** Navigate to `/diagnostic` in your browser
- Example: `http://localhost:5173/diagnostic`
- Or: `https://your-domain.com/diagnostic`

This page shows:
- ✅ Authentication status (loading, authenticated, user info)
- ✅ Business information (name, ID, subscription)
- ✅ Supabase connection status
- ✅ List of accessible database tables
- ✅ Branding assets status
- ✅ Browser information
- ✅ Any errors encountered

You can also:
- Refresh the Supabase check
- Reload the page
- Clear all storage and reload

**Use this page to quickly diagnose what's working and what's not!**

## Still Having Issues?

### Debug Checklist:
- [ ] Can you see console logs in browser DevTools?
- [ ] What is the last console message you see?
- [ ] Are there any errors (red text) in the console?
- [ ] Is the Network tab showing any failed requests?
- [ ] What URL are you visiting? (should be `/` for landing page)
- [ ] Have you tried clearing browser storage?

### Common Solutions:

**Problem**: "Business fetch timed out" error
**Solution**: Run the SQL fix in `/SIMPLE_FIX.sql` or `/RUN_THIS_NOW.sql` in your Supabase SQL Editor

**Problem**: Blank white screen
**Solution**: 
1. Check console for errors
2. Clear browser storage
3. Verify Supabase connection
4. Check that all CSS files are loading

**Problem**: Page stuck on loading
**Solution**:
1. The AuthContext has an 8-second timeout
2. Check if you can access Supabase (network issues?)
3. Look for "no session found" message in console

**Problem**: Can't access the app at all
**Solution**:
1. Make sure the dev server is running (`npm run dev` or `pnpm dev`)
2. Check the correct port (usually 5173)
3. Try `http://localhost:5173` directly in the browser

## Expected Console Output (No Errors)

```
🚀 App component loaded
🔐 Auth state change: INITIAL_SESSION Session: false
🚫 No session found on initial load
🏠 Landing page loaded, isAuthenticated: false, loading: false
```

## Expected Console Output (With Auth/Redirect)

```
🚀 App component loaded
🔐 Auth state change: INITIAL_SESSION Session: true
👤 User signed in, refreshing profile...
🔄 refreshUserProfile called for user abc-123-xyz, retry: 0
📡 Fetching profile from database...
📊 Profile fetch result: { profileData: true, error: null }
🏢 Fetching business for ID: business-123
🏢 Smart fetch: Trying owner_id first...
✅ Found via owner_id: My Business
✅ Setting user: user@example.com
✅ Business set: My Business
🏠 Landing page loaded, isAuthenticated: true, loading: false
🔀 Redirecting to dashboard...
```

---

## Next Steps

1. Open your app in the browser
2. Open DevTools Console (F12)
3. Share the console output if you're still having issues
4. Check the troubleshooting steps above

The landing page should now be visible! 🎉
