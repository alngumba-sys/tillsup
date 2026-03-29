-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP PASSWORD RESET - FIX GEN_SALT ERROR
-- ═══════════════════════════════════════════════════════════════════
-- This fixes: "function gen_salt(unknown, integer) does not exist"
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Enable pgcrypto extension in the public schema
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Step 2: Also try enabling in extensions schema (Supabase default)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Step 3: Drop old function
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);

-- Step 4: Create function with proper search_path that includes extensions
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
  
  -- Check admin permissions
  IF v_admin_profile.role NOT IN ('Business Owner', 'Manager') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get target user profile
  SELECT * INTO v_target_profile FROM profiles WHERE id = p_user_id;
  
  IF v_target_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Verify same business
  IF v_admin_profile.business_id != p_business_id THEN
    RETURN json_build_object('success', false, 'error', 'Admin not in specified business');
  END IF;
  
  IF v_target_profile.business_id != p_business_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reset password for staff in different business');
  END IF;
  
  -- Check Business Owner protection
  IF v_target_profile.role = 'Business Owner' AND v_admin_profile.role != 'Business Owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only Business Owner can reset another Business Owner password');
  END IF;
  
  -- Encrypt password using pgcrypto (now accessible via search_path)
  v_encrypted_password := crypt(p_new_password, gen_salt('bf'));
  
  -- Update password in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_password,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Failed to update password');
  END IF;
  
  -- Mark for password change
  UPDATE profiles
  SET must_change_password = true
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Function error: ' || SQLERRM
    );
END;
$$;

-- Step 5: Grant all necessary permissions
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA anon TO authenticated;

-- Step 6: Verify pgcrypto is available
SELECT 
    n.nspname as schema,
    e.extname as extension,
    e.extversion as version
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'pgcrypto';

-- Step 7: Verify function was created
SELECT 
    proname as function_name,
    pronamespace::regnamespace as schema,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'simple_reset_staff_password';

-- ═══════════════════════════════════════════════════════════════════
-- SUCCESS INDICATORS:
-- ═══════════════════════════════════════════════════════════════════
-- Query 1-2: "CREATE EXTENSION" or "already exists" ✅
-- Query 3: "DROP FUNCTION" ✅
-- Query 4: "CREATE FUNCTION" ✅
-- Query 5-8: "GRANT" ✅
-- Query 9: Shows pgcrypto in public or extensions schema ✅
-- Query 10: Shows simple_reset_staff_password function ✅
--
-- ✅ If you see these, password reset will work!
-- ═══════════════════════════════════════════════════════════════════
