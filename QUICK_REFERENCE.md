# 🚀 Tillsup Quick Reference - Common Fixes

## 🔴 Error: "Authentication system initializing..."

**When:** Trying to login  
**Fix:** Hard refresh browser  
**How:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)  
**Time:** 5 seconds  
**Details:** See `QUICK_FIX_LOGIN_ERROR.md`

---

## 🔴 Error: "function gen_salt(unknown, integer) does not exist"

**When:** Resetting staff passwords  
**Fix:** Run SQL in Supabase  
**How:** See `COPY_PASTE_THIS_SQL.md`  
**Time:** 60 seconds  
**One-time:** Yes

**Quick SQL:**
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- (See COPY_PASTE_THIS_SQL.md for full function)
```

---

## 🛠️ File Guide

### Login Issues
- `QUICK_FIX_LOGIN_ERROR.md` - 30-second browser refresh guide
- `AUTH_INIT_ERROR_FIX.md` - Detailed technical explanation
- `CHANGELOG_AUTH_FIX.md` - What was changed

### Password Reset Issues
- `COPY_PASTE_THIS_SQL.md` ⭐ **START HERE** - Quick SQL copy-paste
- `FIX_NOW.md` - Visual step-by-step guide
- `supabase_password_reset_FIXED.sql` - Full SQL with comments
- `PASSWORD_RESET_ERROR_SUMMARY.md` - Complete reference

### This File
- `QUICK_REFERENCE.md` - You are here

---

## 📋 Common Tasks

### Hard Refresh Browser
**Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`  
**Mac:** `Cmd + Shift + R`  
**Chrome/Edge:** F12 → Right-click refresh → "Empty Cache and Hard Reload"

### Clear Browser Cache
**Chrome/Edge:**
1. `Ctrl + Shift + Delete` (or `Cmd + Shift + Delete`)
2. Select "Cached images and files"
3. Time range: "All time"
4. Click "Clear data"

### Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Click your Tillsup project
3. Click "SQL Editor" (left sidebar)
4. Click "+ New query"

### Run SQL in Supabase
1. Paste SQL in editor
2. Click "RUN" or press `Ctrl+Enter` (`Cmd+Enter` on Mac)
3. Check for success messages

---

## 🎯 Diagnostic Tools

### Check Auth Context (Login Issues)
Look for **AuthDiagnostic panel** in bottom-right of login page.

Should show:
```
Login Function: ✓ Present
Function Name: login
```

If it shows `✗ Missing` or `anonymous` → Hard refresh browser

### Check Database Function (Password Reset)
Run in Supabase SQL Editor:
```sql
SELECT proname FROM pg_proc WHERE proname = 'simple_reset_staff_password';
```

Should return 1 row. If empty → Run setup SQL

### Check pgcrypto Extension
Run in Supabase SQL Editor:
```sql
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```

Should return 1 row. If empty → Enable in Database → Extensions

---

## 🔧 Troubleshooting Flowchart

### Login Not Working?
```
Is error "Authentication system initializing..."?
├─ YES → Hard refresh browser (Ctrl+Shift+R)
└─ NO → Check console (F12) for actual error
```

### Password Reset Not Working?
```
Is error "gen_salt does not exist"?
├─ YES → Run SQL from COPY_PASTE_THIS_SQL.md
└─ NO → Check error message
    ├─ "Insufficient permissions" → You're not Owner/Manager
    ├─ "Different businesses" → User in different business
    └─ Other → See PASSWORD_RESET_ERROR_SUMMARY.md
```

---

## ⚡ Emergency Fixes

### Nothing Works / Everything Broken
1. **Hard refresh browser** (always try this first)
2. **Open incognito window** (test if it's a cache issue)
3. **Check Supabase status** - https://status.supabase.com
4. **Check browser console** - F12 → Console tab
5. **Try different browser** - Chrome, Firefox, Safari, Edge

### "Cannot connect to Supabase"
1. Check internet connection
2. Check Supabase status - https://status.supabase.com
3. Verify Supabase credentials in `/src/lib/supabase.ts`
4. Check browser is not blocking requests

### "Database RLS Error" / "Infinite Recursion"
This is already handled in Tillsup with a workaround.
If you see a banner, follow the instructions in the banner.

---

## 📱 Contact

### Need Help?
1. Check the error message
2. Find relevant file above
3. Follow the guide
4. Most issues: Browser cache (hard refresh)

### Files Not Helping?
1. Check browser console (F12)
2. Check Supabase logs (Dashboard → Logs)
3. Verify database connection
4. Try fresh browser/incognito

---

## ✅ Checklist for New Setup

Setting up Tillsup for the first time?

- [ ] Supabase project created
- [ ] Environment variables configured (`.env`)
- [ ] Database tables created (migrations run)
- [ ] pgcrypto extension enabled
- [ ] Password reset function created
- [ ] First business registered
- [ ] Login tested
- [ ] Password reset tested
- [ ] Staff created
- [ ] All features working

---

## 🎓 Key Concepts

### Hard Refresh vs Regular Refresh
- **Regular refresh** (F5): May use cached files
- **Hard refresh** (Ctrl+Shift+R): Forces new download

### Browser Cache
- Browsers save JavaScript/CSS for speed
- Can cause issues after code updates
- Hard refresh solves most cache issues

### SQL Functions in Supabase
- Run once, work forever
- Server-side (secure)
- Can't be modified from client
- Like stored procedures

### SECURITY DEFINER
- PostgreSQL function privilege
- Runs with creator's permissions
- Allows secure access to protected tables
- Used for password reset function

---

## 📊 Success Metrics

### Login Working?
- [ ] Can access login page
- [ ] Can enter credentials
- [ ] Login succeeds without errors
- [ ] Redirects to dashboard

### Password Reset Working?
- [ ] Can click "Reset Password"
- [ ] No `gen_salt` error
- [ ] Temporary password generated
- [ ] Staff can login with new password

### System Health?
- [ ] No console errors
- [ ] No network errors
- [ ] All pages load
- [ ] Database queries work

---

## 🔗 Quick Links

### Documentation
- `/AUTH_INIT_ERROR_FIX.md` - Login error details
- `/COPY_PASTE_THIS_SQL.md` - Password reset SQL
- `/PASSWORD_RESET_ERROR_SUMMARY.md` - Complete reference

### Supabase
- Dashboard: https://supabase.com/dashboard
- Status: https://status.supabase.com
- Docs: https://supabase.com/docs

### Tools
- Browser DevTools: F12
- Incognito Mode: Ctrl+Shift+N (Cmd+Shift+N)
- Hard Refresh: Ctrl+Shift+R (Cmd+Shift+R)

---

**Keep this file handy for quick reference!**

Last Updated: 2026-03-10  
Version: 2.0
