-- ============================================================================
-- TILLSUP PASSWORD RESET FIX
-- This fixes the error: "function gen_salt(unknown, integer) does not exist"
-- 
-- HOW TO USE:
-- 1. Copy this entire file (Ctrl+A, Ctrl+C)
-- 2. Go to Supabase Dashboard → SQL Editor → New query
-- 3. Paste this code
-- 4. Click "RUN" (or press Ctrl+Enter)
-- 5. Done! Password reset will work forever.
-- ============================================================================

-- Step 1: Enable password encryption extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Create the password reset function
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
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
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
  
  -- Update password with bcrypt hashing (cost factor 10)
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
  
  -- Return success
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

-- Step 3: Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;

-- ============================================================================
-- DONE! You should see these success messages:
-- ✅ CREATE EXTENSION
-- ✅ CREATE FUNCTION
-- ✅ GRANT
--
-- Now go to your Tillsup app and try resetting a password!
-- The "gen_salt" error will be GONE! 🎉
-- ============================================================================
