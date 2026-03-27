# 🚀 QUICK START - Fix Password Reset Now

## The Problem
✖️ "function gen_salt(unknown, integer) does not exist"

## The Solution (30 seconds)

### Easiest: Use Pre-Made File ⭐

Open: **`RUN_THIS_NOW.sql`**  
Copy everything → Paste in Supabase → Run

---

### OR: Copy This SQL Directly:

```sql
-- Enable pgcrypto in both schemas
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Drop old function
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);

-- Recreate with correct search_path
CREATE OR REPLACE FUNCTION public.simple_reset_staff_password(
  p_user_id UUID,
  p_new_password TEXT,
  p_admin_id UUID,
  p_business_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin_profile RECORD;
  v_target_profile RECORD;
BEGIN
  SELECT * INTO v_admin_profile FROM profiles WHERE id = p_admin_id;
  IF v_admin_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found');
  END IF;
  
  IF v_admin_profile.role NOT IN ('Business Owner', 'Manager') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  SELECT * INTO v_target_profile FROM profiles WHERE id = p_user_id;
  IF v_target_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_target_profile.business_id != p_business_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reset password for staff in different business');
  END IF;
  
  IF v_target_profile.role = 'Business Owner' AND v_admin_profile.role != 'Business Owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only Business Owner can reset another Business Owner password');
  END IF;
  
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')), updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Failed to update password');
  END IF;
  
  UPDATE profiles SET must_change_password = true WHERE id = p_user_id;
  
  RETURN json_build_object('success', true, 'message', 'Password reset successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Function error: ' || SQLERRM);
END;
$$;

-- Grant all permissions
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
```

---

### Run It:
1. Go to https://supabase.com/dashboard
2. Open your project → **SQL Editor** → **+ New query**
3. Paste the SQL above
4. Click **Run**
5. ✅ Done!

---

## Verify It Worked

Should see:
```
✅ CREATE EXTENSION (or "already exists")
✅ CREATE EXTENSION (or "already exists")
✅ DROP FUNCTION
✅ CREATE FUNCTION
✅ GRANT (multiple times)
```

---

## Test It

1. Close any error dialogs in Tillsup
2. Go to Staff Management
3. Click Reset Password
4. ✅ **Should work!**

---

## Need More Help?

| Document | Purpose |
|----------|---------|
| `START_HERE.md` | Ultra-simple guide |
| `RUN_THIS_NOW.sql` | Shortest SQL to fix it |
| `FIX_GEN_SALT_ERROR.sql` | Fix with verification |
| `COMPLETE_PASSWORD_RESET_FIX.sql` | Complete rebuild |
| `FIX_GEN_SALT_README.md` | Detailed explanation |
| `PASSWORD_RESET_FINAL_FIX.md` | Full troubleshooting |

---

**That's it! 30 seconds and you're done.** 🎉
