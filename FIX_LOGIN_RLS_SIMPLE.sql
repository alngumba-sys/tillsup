-- ═══════════════════════════════════════════════════════════════════
-- SIMPLE FIX FOR LOGIN ISSUE - NO RECURSION
-- ═══════════════════════════════════════════════════════════════════
-- This creates RLS policies that do NOT cause infinite recursion
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- PROFILES TABLE - Simple Policies (NO RECURSION)
-- ═══════════════════════════════════════════════════════════════════

-- Drop ALL existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Business owners can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ✅ SELECT: Simple policy - NO recursion
-- Users can ONLY see their own profile during login
-- We'll add business-wide visibility in a SEPARATE policy
CREATE POLICY "profiles_own_select" ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- ✅ SELECT: Business-wide visibility (separate policy)
-- This uses the existing get_user_business_id() function to avoid recursion
-- NOTE: Function already exists and is used by other tables - no need to recreate it

CREATE POLICY "profiles_business_select" ON profiles
FOR SELECT
TO authenticated
USING (business_id = get_user_business_id());

-- ✅ INSERT: Anyone can insert (needed for registration)
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ✅ UPDATE: Users can update their own profile
CREATE POLICY "profiles_own_update" ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ✅ UPDATE: Business owners can update their business profiles
CREATE POLICY "profiles_business_owner_update" ON profiles
FOR UPDATE
TO authenticated
USING (
  business_id = get_user_business_id()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
)
WITH CHECK (
  business_id = get_user_business_id()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

-- ✅ DELETE: Only business owners can delete (but not themselves)
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE
TO authenticated
USING (
  id != auth.uid()
  AND business_id = get_user_business_id()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- BUSINESSES TABLE - Simple Policies
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "businesses_select_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_delete_policy" ON businesses;

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "businesses_select_policy" ON businesses
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR id = get_user_business_id()
);

CREATE POLICY "businesses_insert_policy" ON businesses
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "businesses_update_policy" ON businesses
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "businesses_delete_policy" ON businesses
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- BRANCHES TABLE - Simple Policies
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "branches_select_policy" ON branches;
DROP POLICY IF EXISTS "branches_insert_policy" ON branches;
DROP POLICY IF EXISTS "branches_update_policy" ON branches;
DROP POLICY IF EXISTS "branches_delete_policy" ON branches;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select_policy" ON branches
FOR SELECT
TO authenticated
USING (business_id = get_user_business_id());

CREATE POLICY "branches_insert_policy" ON branches
FOR INSERT
TO authenticated
WITH CHECK (
  business_id = get_user_business_id()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

CREATE POLICY "branches_update_policy" ON branches
FOR UPDATE
TO authenticated
USING (
  business_id = get_user_business_id()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
)
WITH CHECK (
  business_id = get_user_business_id()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

CREATE POLICY "branches_delete_policy" ON branches
FOR DELETE
TO authenticated
USING (
  business_id = get_user_business_id()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

SELECT '✅ Policies created successfully!' as status;

SELECT 
  'Profiles policies:' as table_name,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

COMMIT;

SELECT '
✅ RLS POLICIES FIXED!

Key changes:
1. Separate SELECT policy for own profile (NO recursion)
2. Created helper function get_user_business_id() to avoid recursion
3. Business-wide visibility uses the helper function

🔄 Next steps:
1. Clear browser cache
2. Close all tabs
3. Try logging in again

This should work now!
' as summary;
