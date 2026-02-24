-- ══════════════════════════════════════════════════════════════════
-- TILLSUP: Admin Password Reset Function
-- ══════════════════════════════════════════════════════════════════
-- This function allows Business Owners and Managers to reset staff
-- passwords securely. It updates both auth.users and profiles tables.
-- 
-- SETUP INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this entire file
-- 4. Click "Run" or press Ctrl+Enter
-- 5. Verify success message
-- ══════════════════════════════════════════════════════════════════

-- Create the password reset function
CREATE OR REPLACE FUNCTION public.admin_reset_staff_password(
  target_user_id UUID,
  new_password TEXT,
  admin_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_profile RECORD;
  admin_profile RECORD;
  result JSON;
BEGIN
  -- Get admin profile
  SELECT * INTO admin_profile FROM profiles WHERE id = admin_user_id;
  
  -- Check if admin exists and has permission (Business Owner or Manager)
  IF admin_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found');
  END IF;
  
  IF admin_profile.role NOT IN ('Business Owner', 'Manager') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get target user profile
  SELECT * INTO target_profile FROM profiles WHERE id = target_user_id;
  
  -- Check if target user exists
  IF target_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Staff member not found');
  END IF;
  
  -- Verify both users are in the same business
  IF target_profile.business_id != admin_profile.business_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reset password for staff in different business');
  END IF;
  
  -- Prevent resetting Business Owner password unless admin is also Business Owner
  IF target_profile.role = 'Business Owner' AND admin_profile.role != 'Business Owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only Business Owner can reset another Business Owner password');
  END IF;
  
  -- Update the password in auth.users (requires SECURITY DEFINER)
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Mark profile as must_change_password
  UPDATE profiles
  SET must_change_password = true
  WHERE id = target_user_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_reset_staff_password TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.admin_reset_staff_password IS 'Allows Business Owners and Managers to reset staff passwords securely';

-- ══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ══════════════════════════════════════════════════════════════════
-- If you see "Success. No rows returned" - the function was created!
-- You can now use the password reset feature in Tillsup.
-- 
-- The complete flow:
-- 1. Admin clicks "Reset Password" for a staff member
-- 2. System generates a secure 12-character temporary password
-- 3. This function updates the password in Supabase Auth
-- 4. Profile is marked with must_change_password = true
-- 5. Staff logs in with temporary password
-- 6. System redirects to Change Password page
-- 7. Staff creates their own secure password
-- 8. must_change_password flag is cleared
-- 9. Staff gains full access to the system
-- ══════════════════════════════════════════════════════════════════
