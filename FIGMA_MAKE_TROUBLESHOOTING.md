# 🔧 Figma Make - Troubleshooting Guide

## Problem: "I can't see the dashboard"

### ✅ **FIXED!** 

The Landing page now automatically redirects you to the dashboard when you're logged in.

---

## How It Works Now

```
┌─────────────────────────────────────────────┐
│  1. You open Figma Make                     │
│     ↓                                       │
│  2. App checks if you're logged in          │
│     ↓                                       │
│     ┌─────────────┬───────────────┐        │
│     │             │               │        │
│     ▼             ▼               │        │
│  Not Logged In  Logged In         │        │
│     │             │               │        │
│     ▼             ▼               │        │
│  Landing Page  Dashboard ✅       │        │
│     │                             │        │
│     ↓                             │        │
│  Click Login                      │        │
│     │                             │        │
│     ↓                             │        │
│  Enter credentials                │        │
│     │                             │        │
│     ↓                             │        │
│  Dashboard ✅ ────────────────────┘        │
│                                            │
└────────────────────────────────────────────┘
```

---

## Common Issues & Solutions

### 1. Seeing Landing Page Instead of Dashboard

**Symptoms:**
- You're logged in but see the landing page
- You have to manually click "Login" every time

**Solution:**
✅ **Already fixed!** The Landing page now checks authentication and auto-redirects.

**What was changed:**
```typescript
// Added auto-redirect on Landing page
useEffect(() => {
  if (!loading && isAuthenticated) {
    navigate("/app/dashboard", { replace: true });
  }
}, [isAuthenticated, loading, navigate]);
```

---

### 2. Blank Screen or Loading Forever

**Symptoms:**
- White/blank screen
- "Loading..." message that never goes away

**Possible Causes:**
1. Authentication is stuck
2. Supabase connection issue
3. JavaScript error

**Solutions:**

#### Check Browser Console (F12)
```
1. Press F12 in browser
2. Click "Console" tab
3. Look for red errors
4. Share screenshot if you see errors
```

#### Check Supabase Connection
```
1. Open /src/lib/supabase.ts
2. Verify URL: https://ohpshxeynukbogwwezrt.supabase.co
3. Verify key is present (should be long string)
```

#### Force Logout
```javascript
// Paste in browser console (F12)
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

---

### 3. Can't Login

**Symptoms:**
- Login button doesn't work
- Error message appears
- Stuck on login page

**Solutions:**

#### Check Credentials
```
✓ Email is correct
✓ Password is correct
✓ Account exists in Supabase
```

#### Check Supabase Dashboard
```
1. Go to: https://supabase.com/dashboard/project/ohpshxeynukbogwwezrt
2. Click "Authentication" → "Users"
3. Check if your user exists
4. Check user's email is verified
```

#### Check Network Tab
```
1. Press F12
2. Click "Network" tab
3. Try logging in
4. Look for failed requests (red)
5. Click failed request to see error details
```

---

### 4. Dashboard Shows But No Data

**Symptoms:**
- Dashboard loads but everything is empty/zero
- No sales, no inventory, no staff

**This is normal!**
- New accounts have no data yet
- You need to add data first

**Solutions:**

#### Add Test Data
```
1. Go to "Inventory" → Click "Add Item"
2. Create a product
3. Go to "POS Terminal" → Make a test sale
4. Go to "Staff" → Add a staff member
5. Return to dashboard → See data appear!
```

#### Check Database in Supabase
```
1. Go to Supabase Dashboard
2. Click "Table Editor"
3. Check tables: inventory, sales, staff
4. Verify data is being saved
```

---

### 5. Navigation Not Working

**Symptoms:**
- Can't navigate to different pages
- Clicking menu items doesn't work
- URL changes but page doesn't

**Solutions:**

#### Check Browser Console
```
1. Press F12
2. Click "Console" tab
3. Look for routing errors
4. Look for "Cannot read property" errors
```

#### Check Routes
```
Dashboard: /app/dashboard
POS:       /app/pos
Inventory: /app/inventory
Staff:     /app/staff
Reports:   /app/reports
```

#### Try Direct URL
```
Manually type in browser:
https://your-preview-url/app/dashboard
```

---

### 6. "Not Authorized" or "Access Denied"

**Symptoms:**
- Can login but can't access pages
- "Not authorized" message
- Redirected to login

**Causes:**
- Wrong role/permissions
- Business not set up
- Branch not assigned

**Solutions:**

#### Check Your Role
```javascript
// Paste in browser console (F12)
const { data } = await supabase.auth.getUser();
console.log('User:', data.user);
```

#### Check Your Profile
```
1. Go to Supabase Dashboard
2. Table Editor → profiles
3. Find your user
4. Check: role, business_id, branch_id
```

#### First Time User?
```
1. You might need to complete onboarding
2. Go to: /app/onboarding
3. Fill in business details
4. Try again
```

---

### 7. Images Not Loading

**Symptoms:**
- Product images broken
- Logo not showing
- Image upload fails

**Solutions:**

#### Check Supabase Storage
```
1. Go to Supabase Dashboard
2. Click "Storage"
3. Check "product-images" bucket exists
4. Check RLS policies allow access
```

#### Check Image URL
```
Should look like:
https://ohpshxeynukbogwwezrt.supabase.co/storage/v1/object/public/product-images/...
```

#### Re-upload Image
```
1. Go to inventory item
2. Click edit
3. Upload image again
4. System auto-compresses
```

---

### 8. Performance Issues / Slow Loading

**Symptoms:**
- Pages load slowly
- UI feels sluggish
- Delays when clicking

**Solutions:**

#### Check Network Speed
```
1. Press F12
2. Click "Network" tab
3. Look for slow requests (red/orange)
4. Check file sizes
```

#### Check Database Indexes
```
Large datasets may need indexes
Contact support if queries are slow
```

#### Clear Browser Cache
```
1. Press Ctrl+Shift+Delete (Windows)
2. Press Cmd+Shift+Delete (Mac)
3. Select "Cached images and files"
4. Click "Clear data"
5. Refresh page
```

---

### 9. Staff Creation Still Shows Errors

**Symptoms:**
- `ERR_BLOCKED_BY_ADMINISTRATOR`
- Can't create new staff

**Solution:**
Deploy the Edge Function! See **[QUICK_START.md](QUICK_START.md)**

```bash
npm install -g supabase
supabase link --project-ref ohpshxeynukbogwwezrt
supabase functions deploy create-staff
```

---

### 10. M-PESA Payment Not Working

**Symptoms:**
- M-PESA option doesn't work
- Payment fails

**Note:**
M-PESA requires additional setup:
- Business M-PESA account
- API credentials
- Webhook configuration

**This is expected** if you haven't set up M-PESA yet. Use Cash/Card for testing.

---

## Debug Checklist

When something isn't working, check these in order:

```
□ Step 1: Check browser console for errors (F12)
□ Step 2: Verify Supabase project is active
□ Step 3: Check network tab for failed requests
□ Step 4: Verify user is logged in (check local storage)
□ Step 5: Check user profile in database has correct role
□ Step 6: Try in incognito/private browsing mode
□ Step 7: Clear cache and cookies
□ Step 8: Try different browser
□ Step 9: Check Supabase RLS policies
□ Step 10: Review error logs in Supabase Dashboard
```

---

## Getting Debug Information

### Browser Console
```
1. Press F12
2. Click "Console" tab
3. Copy all red errors
4. Screenshot and share
```

### Network Tab
```
1. Press F12
2. Click "Network" tab
3. Reproduce issue
4. Find failed request (red)
5. Click it → Click "Response"
6. Screenshot and share
```

### Supabase Logs
```
1. Go to Supabase Dashboard
2. Click "Logs" → "Postgres Logs"
3. Look for errors around time of issue
4. Share relevant log entries
```

### User Information
```javascript
// Paste in console to get debug info
const debugInfo = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: session } = await supabase.auth.getSession();
  console.log('User:', user);
  console.log('Session:', session);
  console.log('Local Storage:', localStorage);
};
debugInfo();
```

---

## Quick Fixes

### Nuclear Option (Reset Everything)
```javascript
// ⚠️ WARNING: This will log you out!
// Paste in browser console (F12)
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('supabase-auth-token');
window.location.href = '/';
```

### Force Reload
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Disable Browser Extensions
```
1. Try in Incognito/Private mode
2. If it works, a browser extension is the issue
3. Disable extensions one by one
4. Common culprits: Ad blockers, privacy tools
```

---

## Still Having Issues?

### Check These Resources

1. **Documentation Index**: [INDEX.md](INDEX.md)
2. **Figma Make Guide**: [RUN_IN_FIGMA_MAKE.md](RUN_IN_FIGMA_MAKE.md)
3. **Implementation Summary**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

### Supabase Support
- Dashboard: https://supabase.com/dashboard/project/ohpshxeynukbogwwezrt
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `ERR_BLOCKED_BY_ADMINISTRATOR` | Browser extension blocking | Deploy Edge Function |
| `Network request failed` | Internet/Supabase down | Check connection |
| `Invalid JWT` | Session expired | Log out and back in |
| `Row-level security policy` | Permission denied | Check user role |
| `Duplicate key value` | Record already exists | Use different email/SKU |
| `Not authenticated` | Not logged in | Log in first |

---

## Prevention Tips

### Best Practices
- ✅ Keep browser updated
- ✅ Clear cache regularly
- ✅ Use incognito for testing
- ✅ Check console for warnings
- ✅ Monitor Supabase Dashboard
- ✅ Test in different browsers
- ✅ Document what works/doesn't work

### Monitoring
```
Regular checks:
1. Supabase project status
2. Database size (free tier limits)
3. API usage (free tier limits)
4. Storage usage (free tier limits)
```

---

**Most issues are solved by checking the browser console and Supabase Dashboard!** 🔍
