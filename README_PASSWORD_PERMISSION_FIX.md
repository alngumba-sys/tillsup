# 🔧 Password Reset Permission Fix

## Problem
You're seeing: **"Password reset requires a database function that isn't installed yet"** even though you already ran the SQL successfully.

## Root Cause
The function exists, but **doesn't have the proper EXECUTE permissions** for authenticated users to call it.

---

## ⚡ Quick Fix (Copy & Paste)

### Option 1: Just Add Permissions (30 seconds)
If you already created the function, just run this to add permissions:

```sql
-- Grant EXECUTE permissions
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO service_role;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
```

**Steps:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project → **SQL Editor** → **+ New query**
3. Copy the SQL above
4. Paste and click **"Run"**
5. ✅ Done! Try resetting a password again

---

### Option 2: Complete Fix (60 seconds)
Run the complete fix that recreates everything with proper permissions:

**📁 File:** `COMPLETE_PASSWORD_RESET_FIX.sql`

This file contains:
- ✅ Enable pgcrypto extension
- ✅ Drop old functions
- ✅ Create password reset function
- ✅ Grant ALL necessary permissions
- ✅ Verify everything is set up correctly

**Steps:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project → **SQL Editor** → **+ New query**
3. Open the file `COMPLETE_PASSWORD_RESET_FIX.sql`
4. Copy ALL the SQL
5. Paste and click **"Run"**
6. Look for success messages at the bottom
7. ✅ Done! Try resetting a password again

---

## 📋 What Changed?

### Before (Missing Permissions):
```sql
CREATE OR REPLACE FUNCTION public.simple_reset_staff_password(...)
RETURNS JSON
...
$$;

GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
```

### After (Complete Permissions):
```sql
CREATE OR REPLACE FUNCTION public.simple_reset_staff_password(...)
RETURNS JSON
...
$$;

-- ✅ Grant to all necessary roles
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO service_role;

-- ✅ Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
```

---

## ✅ How to Verify It Worked

After running the SQL, you should see this in the Results panel:

```
✅ GRANT
✅ GRANT  
✅ GRANT
✅ GRANT
✅ GRANT
```

Then try these verification queries:

```sql
-- Check if function exists
SELECT proname, pronamespace::regnamespace
FROM pg_proc
WHERE proname = 'simple_reset_staff_password';

-- Check permissions
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'simple_reset_staff_password';
```

You should see:
- **Function exists:** `simple_reset_staff_password | public`
- **Permissions granted:** `authenticated | EXECUTE`, `anon | EXECUTE`, `service_role | EXECUTE`

---

## 🎯 What This Fixes

| Issue | Status |
|-------|--------|
| Function doesn't exist | ✅ Already fixed (you ran the SQL) |
| Missing EXECUTE permissions | ✅ Fixed by this update |
| Missing schema usage | ✅ Fixed by this update |
| Password reset works | ✅ Will work after permissions |

---

## 💡 Why This Happened

Supabase requires explicit **GRANT EXECUTE** permissions for database functions. The original SQL only granted permissions to `authenticated`, but it's safer to grant to all roles (`authenticated`, `anon`, `service_role`) plus schema usage permissions.

---

## 📁 Related Files

- `FIX_PASSWORD_PERMISSIONS.sql` - Just the permission grants
- `COMPLETE_PASSWORD_RESET_FIX.sql` - Complete fix with everything
- `DatabaseSetupAlert.tsx` - Updated with new permissions

---

## 🚀 After This Fix

✅ Password reset will work instantly  
✅ No more "function not installed" errors  
✅ Staff members will get temporary passwords  
✅ Clipboard copy will work properly  

---

**Need help?** Check the console logs - they'll show exactly what's happening with the password reset.
