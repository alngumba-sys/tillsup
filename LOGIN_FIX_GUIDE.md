# 🔴 Unable to Log In - Quick Fix Guide

## Problem
You can't log in to Tillsup. The console shows:
- ✅ "Login successful!"
- ❌ "Internal Server Error" when fetching profile
- ❌ Login gets stuck or fails

## Root Cause
**RLS (Row-Level Security) policies** on the `profiles` table are blocking you from reading your own profile after authentication succeeds.

---

## ✅ SOLUTION - 3 Simple Steps

### Step 1: Open Supabase SQL Editor
1. Go to **Supabase Dashboard**
2. Click **SQL Editor** in the left sidebar

### Step 2: Run the Fix Script
Choose ONE of these options:

**Option A: Complete Fix (Recommended)**
- Copy the entire contents of `/FIX_LOGIN_COMPLETE.sql`
- Paste into SQL Editor
- Click **RUN**

**Option B: Just Profiles Table**
- Copy the entire contents of `/FIX_LOGIN_PROFILES_RLS.sql`
- Paste into SQL Editor
- Click **RUN**

### Step 3: Clear Cache & Try Again
1. **Clear browser cache**: `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
2. **Close all browser tabs** with your app
3. **Open new tab** and go to your app
4. **Try logging in** again

---

## 🔍 What the Fix Does

The SQL script recreates RLS policies with the **critical rule**:

```sql
-- Users can ALWAYS read their own profile
id = auth.uid()
```

This ensures:
- ✅ Authentication works
- ✅ You can read your own profile after login
- ✅ Dashboard loads properly
- ✅ All app features work

---

## 🚨 Still Not Working?

### Check 1: Verify Policies Were Created
Run this in Supabase SQL Editor:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';
```

You should see:
- ✅ `profiles_select_policy` (SELECT)
- ✅ `profiles_insert_policy` (INSERT)
- ✅ `profiles_update_policy` (UPDATE)
- ✅ `profiles_delete_policy` (DELETE)

### Check 2: Verify Your Profile Exists
Run this in Supabase SQL Editor:
```sql
-- First, check if your email is in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'your-email@example.com';  -- Replace with YOUR email

-- Then check if profile exists
SELECT id, email, role, business_id 
FROM profiles 
WHERE email = 'your-email@example.com';  -- Replace with YOUR email
```

**Expected Results:**
- ✅ Found in `auth.users` table
- ✅ Found in `profiles` table with matching `id`

**If profile is missing:**
```sql
-- Create profile manually
INSERT INTO profiles (id, email, role, business_id)
VALUES (
  'YOUR-USER-ID-FROM-AUTH-USERS',  -- Copy from auth.users query above
  'your-email@example.com',
  'Business Owner',
  'YOUR-BUSINESS-ID'  -- Get from businesses table
);
```

### Check 3: Check Console Errors
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try logging in
4. Look for errors

**Common errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `42501` | RLS policy blocking | Run `/FIX_LOGIN_COMPLETE.sql` |
| `PGRST116` | Profile not found | Create profile manually (see Check 2) |
| `Failed to fetch` | Network/CORS issue | Check Supabase URL in `.env` |
| `Invalid credentials` | Wrong email/password | Reset password |

### Check 4: Verify Supabase Configuration
Check your environment variables in Supabase project settings:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Make sure these match your Supabase project.

### Check 5: Test Authentication Directly
Run this test in Supabase SQL Editor:
```sql
-- This should return YOUR user ID (not NULL)
SELECT auth.uid();
```

- **If NULL**: You're not authenticated in SQL Editor
- **If shows ID**: Auth is working, problem is RLS policies

---

## 🔧 Alternative: Temporarily Disable RLS (Testing Only)

**⚠️ WARNING: Only for testing, NEVER in production!**

```sql
-- Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

Try logging in. If it works, the problem is definitely RLS policies.

**Re-enable RLS immediately after testing:**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

Then run `/FIX_LOGIN_COMPLETE.sql` to fix properly.

---

## 📋 Checklist

Before asking for help, verify:

- [ ] Ran `/FIX_LOGIN_COMPLETE.sql` in Supabase SQL Editor
- [ ] Cleared browser cache
- [ ] Closed all browser tabs and reopened
- [ ] Verified policies exist (Check 1)
- [ ] Verified profile exists (Check 2)
- [ ] Checked console for specific error codes
- [ ] Supabase URL and keys are correct

---

## 🎯 Expected Outcome

After applying the fix:
1. ✅ Login form submits
2. ✅ "Login successful!" in console
3. ✅ Profile fetched successfully
4. ✅ Redirected to dashboard
5. ✅ Dashboard loads with your data

---

## 📞 Need More Help?

If you've tried everything above and still can't log in:

1. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Look for errors around your login attempts

2. **Export Console Errors**:
   - Right-click in console
   - "Save as..." to export errors
   - Share the error log

3. **Share Screenshots**:
   - Console errors
   - Network tab showing failed requests
   - SQL query results from checks above

---

**Last Updated:** March 5, 2026  
**Status:** ✅ Tested & Working
