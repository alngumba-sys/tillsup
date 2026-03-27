# Tillsup Troubleshooting Guide

## 🚨 MOST COMMON ISSUE: Password Reset Error

**If you're seeing:** `function gen_salt does not exist`

**🎯 Quick Fix:** See `/ACTION_REQUIRED.md` or `/START_HERE_PASSWORD_RESET.md`

**Time:** 60 seconds | **Action:** Run SQL file in Supabase

---

## Common Issues and Solutions

---

## ⚠️ Warning: "useAuth called before AuthProvider fully initialized"

### Status: ✅ FIXED IN CODE

This warning has been **completely removed** from the codebase. If you're still seeing it, your browser is running cached (old) JavaScript.

### Solution: Clear Browser Cache

**Quick Fix - Hard Refresh:**
- **Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

**Full Cache Clear (Chrome/Edge/Brave):**
1. Press `F12` to open DevTools
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**For Local Development:**
```bash
# Stop dev server (Ctrl + C)
rm -rf node_modules/.vite
npm run dev
```

### Verify the Fix:
Open browser console and look for:
```
🚀 AuthProvider initialized - v2.0 (No init warnings)
```

If you see `v2.0`, you're running the latest code! ✅

See `/CACHE_CLEAR_INSTRUCTIONS.md` for detailed instructions.

---

## 🔒 Error: "function gen_salt(unknown) does not exist"

### Status: ✅ REQUIRES DATABASE SETUP

This error means the `pgcrypto` extension is not enabled in your Supabase database.

### Solution: Run SQL Setup (2 minutes)

**Step 1: Enable pgcrypto**
1. Go to Supabase Dashboard > SQL Editor
2. Click "New Query"
3. Run this command:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**Step 2: Create Password Reset Function**
1. Open `/supabase_simple_password_reset.sql`
2. Copy all contents
3. Paste into Supabase SQL Editor
4. Click "Run"

**Verify:**
- Try resetting a staff password in Tillsup
- You should see a temporary password generated ✅

See `/PASSWORD_RESET_SETUP.md` for detailed instructions.

---

## 🚫 Error: "User has no business ID" (Admin Users)

### Status: ✅ FIXED IN CODE

Admin users now get `business_id: "PLATFORM_ADMIN"` automatically.

### Solution:
If you created admin accounts before this fix:

1. Go to Supabase Dashboard > Table Editor
2. Select `profiles` table
3. Find your admin user
4. Update `business_id` to: `PLATFORM_ADMIN`

---

## 🔄 Error: Infinite Recursion (42P17) in RLS Policies

### Status: ✅ WORKAROUND IMPLEMENTED

Supabase RLS policies had a circular dependency issue.

### Solution: Already Implemented
The codebase now uses a workaround that avoids triggering RLS recursion:
- Initial profile creation uses service role
- Simplified policies that don't cause loops
- Proper error handling

No action needed - this is handled automatically.

---

## 🖼️ Favicon Not Updating

### Status: ✅ FIXED IN CODE

Dynamic favicon updater implemented in `/src/app/App.tsx`.

### Solution:
1. Upload favicon via Admin > Platform Assets
2. Hard refresh browser (`Ctrl + Shift + R`)
3. Check `<head>` in DevTools to verify `<link rel="icon">`

---

## 📦 Build Error: "figma:asset imports"

### Status: ✅ FIXED IN CODE

Replaced `figma:asset` imports with production-ready Unsplash URLs.

### Solution:
If you encounter similar errors:
- Check `/src/app/pages/LandingSimple.tsx` for reference
- Replace `figma:asset/...` with actual image URLs
- Use Unsplash for placeholder images

---

## 🐌 Slow Image Uploads

### Status: ✅ FIXED IN CODE

Automatic image compression implemented.

### How it Works:
- Images are compressed client-side before upload
- Max dimensions: 1920x1080
- Quality: 80%
- Significantly faster uploads

No action needed - works automatically.

---

## 🔐 Password Reset Email Not Sending

### Current Behavior:
Password reset generates a **temporary password** that admins share with staff directly.

### This is NOT an Email System:
- Temporary password is shown in a dialog box
- Admin copies and shares it with the staff member
- Staff logs in and is forced to change password
- **No email is sent** (by design)

### If You Want Email-Based Reset:
Would require:
1. SMTP configuration in Supabase
2. Email templates
3. Different implementation

---

## 🌐 Network Connectivity Errors

### Status: ✅ RESOLVED

Previous Supabase connection issues have been fixed.

### If You Still See Network Errors:
1. Check Supabase project status
2. Verify API keys in environment variables
3. Check browser console for specific error messages
4. Ensure you're not in "Preview Mode" when you need Supabase

---

## 📱 Responsive Design Issues

### Tillsup is Optimized For:
- ✅ Desktop (1920x1080 and above)
- ✅ Tablet (1024x768 and above)
- ⚠️ Mobile (limited - POS is primarily desktop)

### If Layout Breaks:
- Check viewport size
- Some features are desktop-only by design
- Use tablet/desktop for full functionality

---

## 🎨 Gradient Colors Appearing

### Design Rule:
**NO gradients** - Only solid colors using Tillsup blue (`#0891b2`)

### If You See Gradients:
This is a design violation. Please report:
1. Which component/page
2. Screenshot
3. Expected solid color

---

## 🔍 How to Debug

### Check Browser Console:
```
F12 -> Console Tab
```

Look for:
- Version indicators: `v2.0 (No init warnings)`
- Error messages with stack traces
- Warning messages
- Network errors in Network tab

### Check Supabase Logs:
1. Supabase Dashboard > Logs
2. Filter by error level
3. Check for RLS policy violations
4. Check for function errors

### Check File Versions:
Look for console logs like:
- `🚀 AuthProvider initialized - v2.0`
- `📦 App.tsx loaded - Initializing Tillsup POS`
- `✅ App() component rendering`

---

## 📚 Reference Documents

- `/PASSWORD_RESET_SETUP.md` - Database setup for password reset
- `/CACHE_CLEAR_INSTRUCTIONS.md` - How to clear browser cache
- `/supabase_simple_password_reset.sql` - SQL setup script

---

## 🆘 Still Having Issues?

1. **Hard refresh** browser (most common fix)
2. **Clear browser cache completely**
3. **Check Supabase Dashboard** for errors
4. **Check browser console** for specific errors
5. **Try Incognito/Private mode** to rule out extensions
6. **Restart development server** if running locally

---

**Most issues are resolved by clearing browser cache!** 🔄
