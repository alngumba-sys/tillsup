-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP PASSWORD RESET - COMPLETE FIX (WITH PERMISSIONS)
-- ═══════════════════════════════════════════════════════════════════
-- This is the COMPLETE fix that includes everything you need
-- Run this in Supabase SQL Editor → SQL Editor → + New query
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Enable pgcrypto extension (for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Step 2: Drop old functions if they exist
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_reset_staff_password(UUID, TEXT, UUID);

-- Step 3: Create the password reset function
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
  v_encrypted_password TEXT;
BEGIN
  -- Get admin profile
  SELECT * INTO v_admin_profile FROM profiles WHERE id = p_admin_id;
  
  IF v_admin_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin profile not found');
  END IF;
  
  -- Check admin permissions (only Business Owner and Manager can reset)
  IF v_admin_profile.role NOT IN ('Business Owner', 'Manager') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get target user profile
  SELECT * INTO v_target_profile FROM profiles WHERE id = p_user_id;
  
  IF v_target_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Verify both users are in same business
  IF v_admin_profile.business_id != p_business_id THEN
    RETURN json_build_object('success', false, 'error', 'Admin not in specified business');
  END IF;
  
  IF v_target_profile.business_id != p_business_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reset password for staff in different business');
  END IF;
  
  -- Prevent resetting Business Owner password unless admin is also Business Owner
  IF v_target_profile.role = 'Business Owner' AND v_admin_profile.role != 'Business Owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only Business Owner can reset another Business Owner password');
  END IF;
  
  -- Encrypt the password using pgcrypto
  v_encrypted_password := crypt(p_new_password, gen_salt('bf'));
  
  -- Update password in auth.users table
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_password,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Failed to update password');
  END IF;
  
  -- Mark that user must change password on next login
  UPDATE profiles
  SET must_change_password = true
  WHERE id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$$;

-- Step 4: Grant EXECUTE permissions to all necessary roles
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO service_role;

-- Step 5: Grant schema usage permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;

-- Step 6: Verify the function was created successfully
SELECT 
    proname as function_name,
    pronamespace::regnamespace as schema,
    prokind as kind,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'simple_reset_staff_password';

-- Step 7: Verify permissions were granted
SELECT 
    routine_name as function_name,
    grantee as role,
    privilege_type as permission
FROM information_schema.routine_privileges
WHERE routine_name = 'simple_reset_staff_password'
ORDER BY grantee, privilege_type;

-- ═══════════════════════════════════════════════════════════════════
-- SUCCESS INDICATORS:
-- ═══════════════════════════════════════════════════════════════════
-- After running this script, you should see:
--
-- Query 1 (Extension): "CREATE EXTENSION" or "already exists"
-- Query 2-3 (Drop): "DROP FUNCTION" (even if they didn't exist)
-- Query 4 (Create): "CREATE FUNCTION"
-- Query 5-7 (Grant): "GRANT" 
-- Query 8 (Verify Function): Shows one row with:
--   - function_name: simple_reset_staff_password
--   - schema: public
--   - kind: f (function)
--   - is_security_definer: true
-- Query 9 (Verify Permissions): Shows rows like:
--   - authenticated | EXECUTE
--   - anon | EXECUTE
--   - service_role | EXECUTE
--
-- ✅ If you see these, the fix is complete!
-- ✅ Close this dialog and try resetting a password again
-- ═══════════════════════════════════════════════════════════════════