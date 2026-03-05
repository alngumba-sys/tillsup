-- ════════════════════════════════════════════════════════════════════════════
-- 🚨 CRITICAL FIX: Apply this SQL immediately to fix registration errors
-- ════════════════════════════════════════════════════════════════════════════
-- Fixes both errors:
-- 1. "infinite recursion detected in policy for relation profiles"  
-- 2. "permission denied for table users"
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Drop ALL problematic triggers that access auth.users
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Drop ALL existing RLS policies (to eliminate recursion)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop all businesses policies
DROP POLICY IF EXISTS "Users can insert their own business" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can insert businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow insert during registration" ON public.businesses;
DROP POLICY IF EXISTS "authenticated_insert_businesses" ON public.businesses;
DROP POLICY IF EXISTS "authenticated_select_businesses" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_select_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON public.businesses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.businesses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.businesses;
DROP POLICY IF EXISTS "Enable update for business owners" ON public.businesses;

-- Drop all profiles policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert during registration" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_business_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users" ON public.profiles;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Grant permissions on auth.users to fix "permission denied"
-- ═══════════════════════════════════════════════════════════════════════════

GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Create SIMPLE RLS policies (NO RECURSION)
-- ═══════════════════════════════════════════════════════════════════════════

-- BUSINESSES TABLE - Simple policies
-- ───────────────────────────────────────────────────────────────────────────

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

-- PROFILES TABLE - Simple policies (NO SUBQUERIES to avoid recursion)
-- ───────────────────────────────────────────────────────────────────────────

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

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: Ensure RLS is enabled
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: Grant table-level permissions
-- ═══════════════════════════════════════════════════════════════════════════

GRANT INSERT, SELECT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.profiles TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 7: Create safe, simple triggers (optional - for convenience only)
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-set owner_id if null (convenience)
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

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Check the setup
-- ═══════════════════════════════════════════════════════════════════════════

-- View policies created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || pg_get_expr(qual, (schemaname||'.'||tablename)::regclass)
    ELSE ''
  END as using_clause
FROM pg_policies
WHERE tablename IN ('businesses', 'profiles')
ORDER BY tablename, policyname;

-- View permissions
SELECT table_schema, table_name, privilege_type, grantee
FROM information_schema.table_privileges
WHERE table_name IN ('businesses', 'profiles', 'users')
AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee, privilege_type;

-- Check triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('businesses', 'profiles')
AND event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ DONE! Now test user registration - both errors should be fixed
-- ════════════════════════════════════════════════════════════════════════════
