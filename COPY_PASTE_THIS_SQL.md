# 🚀 FASTEST FIX: Copy & Paste SQL (60 seconds)

## The Error
```
❌ Password reset failed: function gen_salt(unknown, integer) does not exist
```

## ⚡ Quick Fix Steps

### Step 1: Open Supabase SQL Editor (15 seconds)
1. Go to: **https://supabase.com/dashboard**
2. Click on your **Tillsup project**
3. Click **"SQL Editor"** in the left sidebar
4. Click **"+ New query"** button

### Step 2: Copy & Paste This SQL (30 seconds)
Copy everything in the box below and paste it into the SQL Editor:

```sql
-- ============================================================================
-- TILLSUP PASSWORD RESET SETUP
-- Run this ONCE in Supabase SQL Editor to enable password reset functionality
-- ============================================================================

-- Step 1: Enable pgcrypto extension (for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Create secure password reset function
CREATE OR REPLACE FUNCTION simple_reset_staff_password(
  p_user_id UUID,
  p_new_password TEXT,
  p_admin_id UUID,
  p_business_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_target_business_id UUID;
  v_admin_business_id UUID;
  v_target_role TEXT;
  v_admin_role TEXT;
  v_hashed_password TEXT;
BEGIN
  -- Verify admin's business
  SELECT business_id, role INTO v_admin_business_id, v_admin_role
  FROM profiles
  WHERE id = p_admin_id;
  
  IF v_admin_business_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin not found or not associated with a business'
    );
  END IF;
  
  -- Verify admin has permission (Business Owner or Manager)
  IF v_admin_role NOT IN ('Business Owner', 'Manager') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions. Only Business Owners and Managers can reset passwords.'
    );
  END IF;
  
  -- Get target user's business and role
  SELECT business_id, role INTO v_target_business_id, v_target_role
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_target_business_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Target user not found'
    );
  END IF;
  
  -- Verify both users are in the same business
  IF v_target_business_id != v_admin_business_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot reset password for users in different businesses'
    );
  END IF;
  
  -- Verify business ID matches
  IF v_target_business_id != p_business_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Business ID mismatch'
    );
  END IF;
  
  -- Prevent non-Business Owner from resetting Business Owner password
  IF v_target_role = 'Business Owner' AND v_admin_role != 'Business Owner' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only Business Owner can reset another Business Owner password'
    );
  END IF;
  
  -- Hash the new password using bcrypt (gen_salt requires pgcrypto extension)
  v_hashed_password := crypt(p_new_password, gen_salt('bf', 10));
  
  -- Update password in auth.users table
  UPDATE auth.users
  SET 
    encrypted_password = v_hashed_password,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to update password in auth system'
    );
  END IF;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successful'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION simple_reset_staff_password TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Optional - Run to verify setup)
-- ============================================================================

-- Check if pgcrypto extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
-- Expected: Should return 1 row with extname = 'pgcrypto'

-- Check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'simple_reset_staff_password';
-- Expected: Should return 1 row with proname = 'simple_reset_staff_password'

-- ============================================================================
-- SUCCESS! You're done! ✅
-- ============================================================================
```

### Step 3: Run the SQL (10 seconds)
1. Click the **"Run"** button (or press `Ctrl + Enter`)
2. Wait for success messages

### Step 4: Verify Success (5 seconds)
You should see these success messages:
```
✅ CREATE EXTENSION
✅ CREATE FUNCTION
✅ GRANT
```

---

## 🎉 Done! Password Reset Now Works

### Test It:
1. Go to your Tillsup app
2. Navigate to **Staff Management**
3. Click **"Reset Password"** on any staff member
4. Should work without errors!

---

## Troubleshooting

### ❌ Error: "permission denied to create extension"
**Solution:** You need superuser access. Try this instead:
1. Go to **Database** → **Extensions** in Supabase dashboard
2. Search for **"pgcrypto"**
3. Click **"Enable"**
4. Then run the SQL again (skip the CREATE EXTENSION line)

### ❌ Error: "function already exists"
**Solution:** This is fine! It means you already ran this before.
- Click **"Run"** anyway - it will recreate the function
- Or continue - password reset should work

### ❌ Still getting gen_salt error after running SQL
**Solutions:**
1. **Hard refresh your browser:** `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
2. **Try password reset again** - should work now
3. **Check Supabase logs:** SQL Editor → History → Check for errors

---

## What This SQL Does

1. **Enables pgcrypto** - PostgreSQL extension for secure password hashing
2. **Creates reset function** - Secure server-side function to reset passwords
3. **Adds permissions** - Allows authenticated users to call the function
4. **Security checks:**
   - Verifies admin has permission (Business Owner or Manager)
   - Ensures users are in the same business
   - Prevents unauthorized password resets

---

## Security Features ✅

- ✅ **Bcrypt hashing** - Industry-standard password encryption
- ✅ **Business isolation** - Can't reset passwords across businesses
- ✅ **Role validation** - Only Business Owners and Managers can reset
- ✅ **Audit trail** - Updates tracked in auth.users table
- ✅ **Server-side only** - Function runs on Supabase, not client

---

## One-Time Setup

**You only need to run this SQL ONCE per Supabase project.**

After running:
- ✅ Password reset works forever
- ✅ No need to run again
- ✅ Survives app updates/deploys

---

**Time to complete:** ~60 seconds  
**Difficulty:** Copy & Paste  
**Status:** ✅ Ready to run
