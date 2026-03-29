# 🔴 FIX "gen_salt does not exist" ERROR

## ⚡ 60 Second Fix

### Step 1: Open Supabase
1. Go to: **https://supabase.com/dashboard**
2. Click your **Tillsup project**
3. Click **"SQL Editor"** (in left sidebar)
4. Click **"+ New query"** button

### Step 2: Copy This SQL
**Select ALL the code below** (click the code block, Ctrl+A, Ctrl+C):

```sql
-- Enable password encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create password reset function
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
```

### Step 3: Paste and Run
1. **Paste** the SQL into the Supabase SQL Editor
2. Click the **"RUN"** button (or press Ctrl+Enter)
3. Wait for success messages

### Step 4: Verify Success
You should see these messages:
```
✅ CREATE EXTENSION
✅ CREATE FUNCTION  
✅ GRANT
```

### Step 5: Test Password Reset
1. Go back to your Tillsup app
2. Go to **Staff Management**
3. Click **"Reset Password"** on any staff member
4. **ERROR SHOULD BE GONE!** 🎉

---

## 🆘 Troubleshooting

### ❌ Error: "permission denied to create extension"

**Solution:**
1. In Supabase, go to **Database** → **Extensions**
2. Search for **"pgcrypto"**
3. Toggle it **ON**
4. Run the SQL again (it will skip the extension and just create the function)

### ❌ Error: "function already exists"

**This is OK!** Just means you ran it before. The function will be updated.

### ❌ Still getting "gen_salt" error after running SQL?

**Hard refresh your browser:**
- **Windows/Linux:** Press `Ctrl + Shift + R`
- **Mac:** Press `Cmd + Shift + R`

Then try password reset again.

---

## ✅ What This Does

- Enables `pgcrypto` extension (needed for password hashing)
- Creates `simple_reset_staff_password` function
- Grants permission to authenticated users
- **ONE-TIME SETUP** - Never needs to be run again

---

## 📞 Still Having Issues?

1. Check if SQL ran successfully (look for ✅ messages)
2. Hard refresh browser (Ctrl+Shift+R)
3. Check browser console (F12) for errors
4. Verify function exists by running this in SQL Editor:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'simple_reset_staff_password';
   ```
   Should return 1 row.

---

**Time to fix:** 60 seconds  
**Difficulty:** Copy & Paste  
**Permanent:** Yes - only run once  

**🚀 DO THIS NOW ↑**
