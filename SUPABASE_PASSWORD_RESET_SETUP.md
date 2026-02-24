# Supabase Password Reset Setup Guide

## Problem
When an admin resets a staff member's password in Tillsup, the temporary password is generated but not actually set in Supabase Auth. This is because updating auth.users requires server-side code with service_role privileges.

## Solution
We need to create a Supabase Edge Function to handle password resets securely.

## Setup Steps

### Step 1: Create the Database Function

Run this SQL in your Supabase SQL Editor:

```sql
-- Create a function to reset staff passwords (requires service_role or proper RLS)
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
```

### Step 2: Verify the Function

Test the function in SQL Editor:

```sql
-- Test (replace UUIDs with your actual user IDs)
SELECT public.admin_reset_staff_password(
  'staff-user-id-here'::UUID,
  'TempPassword123!',
  'admin-user-id-here'::UUID
);
```

### Step 3: Update Your Environment

The frontend code has been updated to call this database function instead of just generating a password on the client side.

## How It Works

1. **Admin clicks "Reset Password"** in Staff Management
2. **System generates a secure temporary password** (12 characters, mixed case, numbers, symbols)
3. **Frontend calls the database function** with:
   - Target staff user ID
   - Generated temporary password
   - Admin's user ID (for authorization)
4. **Database function validates**:
   - Admin has proper role (Business Owner or Manager)
   - Both users are in same business
   - Target user exists
   - Role-based restrictions (e.g., only Business Owner can reset another Owner's password)
5. **Password is updated in auth.users**
6. **Profile is marked with must_change_password = true**
7. **Admin sees the temporary password** to share with staff
8. **Staff logs in with temporary password**
9. **System automatically redirects to Change Password page**
10. **Staff creates their own secure password**
11. **must_change_password flag is cleared**
12. **Staff gains full access**

## Security Features

- ✅ Server-side validation (can't be bypassed from client)
- ✅ Business isolation (can't reset passwords across businesses)
- ✅ Role-based access control
- ✅ Temporary password requirement
- ✅ Force password change on first login
- ✅ Automatic routing to password change page

## Troubleshooting

### Error: "Permission denied for function admin_reset_staff_password"
- Make sure you ran the GRANT EXECUTE command
- Verify you're logged in as an authenticated user

### Error: "Password reset failed"
- Check Supabase logs in Dashboard > Logs > Postgres Logs
- Verify both admin and staff user IDs exist in profiles table
- Ensure users are in the same business

### Staff can't login with temporary password
- Verify the database function executed successfully
- Check that encrypted_password was updated in auth.users
- Try the password reset again

### Staff not redirected to Change Password page
- Check that must_change_password = true in profiles table
- Verify AuthGuard is working (check browser console)
- Check Login.tsx is properly handling the mustChangePassword flag

## Testing Checklist

- [ ] Admin can reset staff password
- [ ] Temporary password is displayed to admin
- [ ] Staff can login with temporary password
- [ ] Staff is redirected to Change Password page
- [ ] Staff can successfully change to new password
- [ ] must_change_password flag is cleared after change
- [ ] Staff is redirected to dashboard after password change
- [ ] Admin in Business A cannot reset password for staff in Business B
- [ ] Manager cannot reset Business Owner password
- [ ] All password changes are logged in Supabase Auth logs
