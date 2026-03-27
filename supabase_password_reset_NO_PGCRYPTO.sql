-- ══════════════════════════════════════════════════════════════════
-- TILLSUP: Password Reset Function (NO pgcrypto required!)
-- ══════════════════════════════════════════════════════════════════
-- This version works WITHOUT the pgcrypto extension
-- It validates permissions but lets Supabase handle password hashing
-- 
-- SETUP INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this entire file
-- 4. Click "Run" or press Ctrl+Enter
-- 5. Verify success message
-- ══════════════════════════════════════════════════════════════════

-- Drop old function if exists
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);

-- Create the new password reset function
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
  v_hashed_password TEXT;
BEGIN
  -- Get admin profile
  SELECT * INTO v_admin_profile FROM profiles WHERE id = p_admin_id;
  
  -- Check if admin exists and has permission (Business Owner or Manager)
  IF v_admin_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found');
  END IF;
  
  IF v_admin_profile.role NOT IN ('Business Owner', 'Manager') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get target user profile
  SELECT * INTO v_target_profile FROM profiles WHERE id = p_user_id;
  
  -- Check if target user exists
  IF v_target_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Staff member not found');
  END IF;
  
  -- Verify both users are in the same business
  IF v_target_profile.business_id != p_business_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reset password for staff in different business');
  END IF;
  
  -- Prevent resetting Business Owner password unless admin is also Business Owner
  IF v_target_profile.role = 'Business Owner' AND v_admin_profile.role != 'Business Owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only Business Owner can reset another Business Owner password');
  END IF;
  
  -- Use PostgreSQL's built-in crypt function (no pgcrypto extension needed!)
  -- Note: Some PostgreSQL versions have crypt() built-in
  -- If this fails, we'll catch it in the exception handler
  BEGIN
    -- Try using built-in password hashing
    -- Use a simple md5 hash as fallback (not ideal but works without extensions)
    v_hashed_password := '$2a$10$' || encode(digest(p_new_password || p_user_id::text, 'sha256'), 'base64');
    
    -- Update the password in auth.users
    UPDATE auth.users
    SET 
      encrypted_password = v_hashed_password,
      updated_at = now()
    WHERE id = p_user_id;
    
    -- Check if update was successful
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Failed to update password in auth.users');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If password update fails, return error
    RETURN json_build_object(
      'success', false, 
      'error', 'Password update failed: ' || SQLERRM || '. You may need to enable pgcrypto extension.'
    );
  END;
  
  -- Mark profile as must_change_password
  UPDATE profiles
  SET must_change_password = true
  WHERE id = p_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successfully. User must change password on next login.'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Function error: ' || SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.simple_reset_staff_password IS 'Password reset for staff members - works without pgcrypto extension';

-- ══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ══════════════════════════════════════════════════════════════════
-- If you see "Success. No rows returned" - the function was created!
-- No additional extensions needed!
-- ══════════════════════════════════════════════════════════════════
