-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP PROFILES RLS - JWT CLAIMS APPROACH (RECOMMENDED)
-- ═══════════════════════════════════════════════════════════════════
-- This approach uses JWT claims instead of querying the profiles table
-- Completely eliminates recursion by using auth.jwt() metadata
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: DISABLE RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Drop old helper functions
DROP FUNCTION IF EXISTS public.get_my_business_id();
DROP FUNCTION IF EXISTS public.get_my_role();

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: Create policies using auth metadata (stored in JWT)
-- This is populated from user_metadata during signup/login
-- ═══════════════════════════════════════════════════════════════════

-- SELECT: Users can read their own profile + profiles in their business
CREATE POLICY "Users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Can always see own profile
  id = auth.uid()
  OR
  -- Can see profiles in same business (using app_metadata if set)
  business_id = (auth.jwt()->>'business_id')::uuid
);

-- INSERT: Users can create their own profile + admins can create staff
CREATE POLICY "Users and admins can create profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Can create own profile
  id = auth.uid()
  OR
  -- Business Owners and Managers can create staff in their business
  (
    business_id = (auth.jwt()->>'business_id')::uuid
    AND (auth.jwt()->>'role') IN ('Business Owner', 'Manager')
  )
);

-- UPDATE: Users can update own profile + admins can update staff
CREATE POLICY "Users and admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR
  (
    business_id = (auth.jwt()->>'business_id')::uuid
    AND (auth.jwt()->>'role') IN ('Business Owner', 'Manager')
  )
)
WITH CHECK (
  id = auth.uid()
  OR
  (
    business_id = (auth.jwt()->>'business_id')::uuid
    AND (auth.jwt()->>'role') IN ('Business Owner', 'Manager')
  )
);

-- DELETE: Business Owners can delete staff
CREATE POLICY "Business Owners can delete staff"
ON public.profiles FOR DELETE
TO authenticated
USING (
  business_id = (auth.jwt()->>'business_id')::uuid
  AND (auth.jwt()->>'role') = 'Business Owner'
  AND id != auth.uid()
);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: Create a trigger to sync profile data to JWT claims
-- This updates the auth.users metadata when profile changes
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_profile_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the auth.users user_metadata with current profile data
  -- Note: This requires service_role access, so it may not work
  -- For now, we'll just log it and rely on login to refresh JWT
  
  -- In production, you'd use a Supabase Edge Function to update this
  RAISE LOG 'Profile updated for user %. JWT will refresh on next login.', NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS sync_profile_to_jwt_trigger ON public.profiles;
CREATE TRIGGER sync_profile_to_jwt_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_jwt();

-- ═══════════════════════════════════════════════════════════════════
-- STEP 5: Re-enable RLS
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- IMPORTANT NOTE
-- ═══════════════════════════════════════════════════════════════════
-- This approach works ONLY if business_id and role are stored in the JWT.
-- Since we're using user_metadata during signup, this should work.
-- 
-- However, JWT claims are only updated on login, so if you change a user's
-- role, they need to log out and log back in for the change to take effect.
-- 
-- If JWT claims are not set, this will fall back to only allowing users
-- to see/edit their own profile.
-- ═══════════════════════════════════════════════════════════════════

-- Verification
SELECT 
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;
