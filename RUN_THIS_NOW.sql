-- ═══════════════════════════════════════════════════════════════════
-- 🚀 QUICK FIX - RUN THIS NOW (UPDATED)
-- ═══════════════════════════════════════════════════════════════════
-- Fixes: "function gen_salt(unknown, integer) does not exist"
-- ═══════════════════════════════════════════════════════════════════

-- Enable pgcrypto in both schemas (ensures it's available)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Drop old function
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);

-- Create function with corrected search_path
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

-- ═══════════════════════════════════════════════════════════════════
-- ✅ DONE! Close this and try resetting a password again.
-- ═══════════════════════════════════════════════════════════════════
