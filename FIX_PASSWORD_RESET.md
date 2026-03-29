# 🔥 FIX PASSWORD RESET ERROR - 60 SECONDS

## Error You're Seeing:
```
Password reset failed: function gen_salt(unknown, integer) does not exist
```

## ⚡ 3-STEP FIX (Copy, Paste, Done!)

### Step 1: Open Supabase
Go to: https://supabase.com/dashboard
- Click your **Tillsup** project
- Click **"SQL Editor"** (left sidebar)
- Click **"+ New query"** button

### Step 2: Copy This SQL

Click the "Copy" button that appears when you click "Reset Password" in Tillsup, OR copy from below:

```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_reset_staff_password(UUID, TEXT, UUID);

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
  -- Get admin profile
  SELECT * INTO v_admin_profile FROM profiles WHERE id = p_admin_id;
  
  IF v_admin_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found');
  END IF;
  
  IF v_admin_profile.role NOT IN ('Business Owner', 'Manager') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get target user profile
  SELECT * INTO v_target_profile FROM profiles WHERE id = p_user_id;
  
  IF v_target_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Staff member not found');
  END IF;
  
  IF v_target_profile.business_id != p_business_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reset password for staff in different business');
  END IF;
  
  IF v_target_profile.role = 'Business Owner' AND v_admin_profile.role != 'Business Owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only Business Owner can reset another Business Owner password');
  END IF;
  
  -- Update the password in auth.users
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
```

### Step 3: Paste & Run
1. Paste the SQL into Supabase SQL Editor
2. Click the green **"Run"** button (or `Ctrl+Enter`)
3. Look for success messages:
   - ✅ `CREATE EXTENSION`
   - ✅ `CREATE FUNCTION`

## ✅ DONE!

Password reset will now work! Go back to Tillsup and try resetting a password again.

---

## Why This Happens

- New Supabase projects don't have the `pgcrypto` extension enabled by default
- Password hashing requires this extension and the custom function
- **This is one-time setup** - once done, it works forever

## Need Help?

If you still see errors after running the SQL:
1. Make sure you're in the correct Supabase project
2. Check the SQL Editor output for any red error messages
3. Try refreshing your Supabase dashboard

---

**⏱️ Total Time: 60 seconds | One-time only | Safe to run**
