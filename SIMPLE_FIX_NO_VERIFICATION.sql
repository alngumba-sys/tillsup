-- ════════════════════════════════════════════════════════════════════════════
-- SIMPLE FIX - NO VERIFICATION QUERIES (Use if APPLY_THIS_FIXED.sql fails)
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Drop ALL problematic triggers
DROP TRIGGER IF EXISTS validate_business_owner_trigger ON public.businesses CASCADE;
DROP TRIGGER IF EXISTS auto_set_business_owner_trigger ON public.businesses CASCADE;
DROP TRIGGER IF EXISTS ensure_business_owner_id ON public.businesses CASCADE;
DROP TRIGGER IF EXISTS set_business_owner_before_insert ON public.businesses CASCADE;
DROP TRIGGER IF EXISTS validate_profile_id_trigger ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS ensure_profile_id_before_insert ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_invite ON auth.users CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS public.validate_business_owner_id() CASCADE;
DROP FUNCTION IF EXISTS public.auto_set_business_owner_id() CASCADE;
DROP FUNCTION IF EXISTS public.set_business_owner_id() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_profile_id_matches_user() CASCADE;
DROP FUNCTION IF EXISTS public.validate_profile_id() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_invite() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;

-- Drop ALL existing RLS policies
DROP POLICY IF EXISTS "Users can insert their own business" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can insert businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow insert during registration" ON public.businesses;
DROP POLICY IF EXISTS "authenticated_insert_businesses" ON public.businesses;
DROP POLICY IF EXISTS "authenticated_select_businesses" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_select_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert" ON public.businesses;
DROP POLICY IF EXISTS "businesses_select" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update" ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete" ON public.businesses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.businesses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.businesses;
DROP POLICY IF EXISTS "Enable update for business owners" ON public.businesses;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert during registration" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_business_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users" ON public.profiles;

-- Grant permissions on auth.users
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;

-- Create SIMPLE RLS policies for BUSINESSES
CREATE POLICY "businesses_insert" 
ON public.businesses 
FOR INSERT 
TO authenticated 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "businesses_select"
ON public.businesses
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "businesses_update"
ON public.businesses
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "businesses_delete"
ON public.businesses
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Create SIMPLE RLS policies for PROFILES
CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = profiles.business_id 
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant table-level permissions
GRANT INSERT, SELECT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Create safe trigger (optional - for convenience)
CREATE OR REPLACE FUNCTION public.set_owner_id_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_set_owner_id
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owner_id_if_null();

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ DONE! Registration errors should be fixed. Test it now!
-- ════════════════════════════════════════════════════════════════════════════
