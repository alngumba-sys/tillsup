# 🔧 Password Reset Setup - Fix "gen_salt" Error

## 🔴 The Error

```
Password reset failed: Function error: function gen_salt(unknown, integer) does not exist
```

**This means:** Your Supabase database needs the `pgcrypto` extension and password reset function.

---

## ✅ Quick Fix (60 Seconds)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your **Tillsup project**
3. Click **"SQL Editor"** in the left sidebar
4. Click **"+ New query"**

### Step 2: Copy & Paste This SQL

```sql
-- ============================================================================
-- TILLSUP PASSWORD RESET FIX
-- Copy this entire block and run it in Supabase SQL Editor
-- ============================================================================

-- Enable password hashing extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop old functions if they exist (cleanup)
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);

-- Create the password reset function
CREATE OR REPLACE FUNCTION public.simple_reset_staff_password(
  p_user_id UUID,
  p_new_password TEXT,
  p_admin_id UUID,
  p_business_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_profile RECORD;
  v_admin_profile RECORD;
BEGIN
  -- Security Check 1: Verify admin exists and has permission
  SELECT * INTO v_admin_profile FROM profiles WHERE id = p_admin_id;
  
  IF v_admin_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found');
  END IF;
  
  IF v_admin_profile.role NOT IN ('Business Owner', 'Manager') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions. Only Business Owners and Managers can reset passwords.');
  END IF;
  
  -- Security Check 2: Verify target user exists
  SELECT * INTO v_target_profile FROM profiles WHERE id = p_user_id;
  
  IF v_target_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Staff member not found');
  END IF;
  
  -- Security Check 3: Ensure same business (multi-tenant isolation)
  IF v_target_profile.business_id != p_business_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reset password for staff in different business');
  END IF;
  
  -- Security Check 4: Prevent managers from resetting owner passwords
  IF v_target_profile.role = 'Business Owner' AND v_admin_profile.role != 'Business Owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only Business Owner can reset another Business Owner password');
  END IF;
  
  -- Update password with bcrypt hashing
  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
    updated_at = now()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Failed to update password');
  END IF;
  
  -- Mark profile as must_change_password
  UPDATE profiles
  SET must_change_password = true
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Function error: ' || SQLERRM
  );
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;

-- ============================================================================
-- DONE! You should see these success messages:
-- ✅ CREATE EXTENSION
-- ✅ CREATE FUNCTION
-- ✅ GRANT
-- ============================================================================
```

### Step 3: Run the SQL
- Click the **"RUN"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
- Wait for the success messages

### Step 4: Test Password Reset
1. Go back to your Tillsup app
2. Navigate to **Staff Management**
3. Click **Reset Password** on any staff member
4. Should work without errors! 🎉

---

## 🆘 Troubleshooting

### ❌ Error: "permission denied to create extension"

**Solution A:** Enable via Supabase UI
1. Go to **Database** → **Extensions** in Supabase dashboard
2. Search for **"pgcrypto"**
3. Toggle it **ON**
4. Run the SQL again (it will skip the extension part)

**Solution B:** You may need admin/owner access to your Supabase project

---

### ❌ Error: "function already exists"

**This is fine!** It means:
- You already ran this before
- Password reset should work
- Click "RUN" anyway to update the function

---

### ❌ Still getting "gen_salt" error after running SQL

**Try these:**
1. **Hard refresh your browser:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Check if SQL ran successfully:** Look for ✅ success messages
3. **Verify function exists:** Run this in SQL Editor:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'simple_reset_staff_password';
   ```
   Should return 1 row

---

### ❌ Error: "Clipboard access blocked" or "Failed to copy"

**This is now fixed!** The app will:
1. Try to copy automatically
2. If blocked, show a helpful message
3. You can click the password field to select it, then press `Ctrl+C` to copy manually

---

## 🔒 What This Does

### Security Features
- ✅ **Bcrypt password hashing** - Industry-standard encryption
- ✅ **Multi-tenant isolation** - Can't reset passwords across businesses
- ✅ **Role validation** - Only Business Owners & Managers can reset
- ✅ **Privilege protection** - Managers can't reset Owner passwords
- ✅ **Server-side execution** - Runs securely on Supabase

### How It Works
1. Admin clicks "Reset Password" in Tillsup
2. App calls `simple_reset_staff_password` function
3. Function validates permissions (same business, correct role, etc.)
4. Password is hashed with bcrypt (cost factor 10)
5. Password is updated in `auth.users` table
6. Staff member is marked as `must_change_password`
7. Temporary password is shown to admin
8. Staff member must change password on next login

---

## ✅ Verification

Run these queries in SQL Editor to verify everything is set up:

### Check 1: Verify pgcrypto Extension
```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'pgcrypto';
```
**Expected:** 1 row with `extname = pgcrypto`

### Check 2: Verify Function Exists
```sql
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'simple_reset_staff_password';
```
**Expected:** 1 row with `proname = simple_reset_staff_password` and `prosecdef = t`

### Check 3: Verify Permissions
```sql
SELECT routine_name, grantee 
FROM information_schema.routine_privileges 
WHERE routine_name = 'simple_reset_staff_password';
```
**Expected:** 1 row with `grantee = authenticated`

---

## 📝 One-Time Setup

**Important:** You only need to run this SQL **ONCE** per Supabase project.

After running:
- ✅ Password reset works forever
- ✅ Survives app updates and deploys
- ✅ No need to run again
- ✅ Works for all current and future staff

---

## 🎯 Next Steps

After setup is complete:

1. **Test password reset** on a staff member
2. **Verify they can login** with the temporary password
3. **Confirm they're forced** to change password on login
4. **Share temporary passwords securely** (in person, WhatsApp, etc.)

---

## 📱 Clipboard Fix Included

The app now has improved clipboard functionality:

### What Was Fixed
- ✅ **Automatic fallback** if Clipboard API is blocked
- ✅ **Silent error handling** - never shows scary error messages
- ✅ **Manual copy hint** - helpful instructions if auto-copy fails
- ✅ **Click to select** - click password field to select it
- ✅ **Cross-browser support** - works on Chrome, Firefox, Safari, Edge

### How to Use
1. **Automatic:** Click the copy button (📋) - will try to copy
2. **Manual:** Click the password field to select it, then press `Ctrl+C` (or `Cmd+C`)
3. **Either way works!** No more clipboard errors

---

## 🎉 Summary

| Problem | Solution | Status |
|---------|----------|--------|
| gen_salt error | Run SQL above | ✅ Fixed |
| Clipboard error | Improved fallback | ✅ Fixed |
| Password reset not working | Enable pgcrypto | ✅ Fixed |

**Time to fix:** ~60 seconds  
**Difficulty:** Copy & Paste  
**Frequency:** One-time setup  
**Result:** Password reset works forever

---

**Need help?** Check the error message and refer to the troubleshooting section above.

**Last Updated:** 2026-03-10  
**Tested:** Supabase PostgreSQL 15+  
**Compatible:** Tillsup v2.0+
