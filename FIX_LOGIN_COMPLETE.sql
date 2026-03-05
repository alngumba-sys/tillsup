-- ═══════════════════════════════════════════════════════════════════
-- COMPLETE LOGIN FIX - ALL TABLES RLS
-- ═══════════════════════════════════════════════════════════════════
-- This script fixes all RLS policies that could prevent login
-- 
-- Run this in your Supabase SQL Editor if you're unable to log in
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. FIX PROFILES TABLE RLS
-- ═══════════════════════════════════════════════════════════════════

-- Drop all existing profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Business owners can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Users MUST be able to read their own profile for login to work
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile (REQUIRED FOR LOGIN)
  id = auth.uid()
  OR
  -- Users can see other profiles in their business
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
)
WITH CHECK (
  id = auth.uid()
  OR
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE
TO authenticated
USING (
  id != auth.uid()
  AND business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. FIX BUSINESSES TABLE RLS
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "businesses_select_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_delete_policy" ON businesses;

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Users can view their business
CREATE POLICY "businesses_select_policy" ON businesses
FOR SELECT
TO authenticated
USING (
  -- Owner can see their business
  owner_id = auth.uid()
  OR
  -- Staff can see their business
  id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Only authenticated users can create businesses (during registration)
CREATE POLICY "businesses_insert_policy" ON businesses
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
);

-- Only business owners can update their business
CREATE POLICY "businesses_update_policy" ON businesses
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Only business owners can delete their business
CREATE POLICY "businesses_delete_policy" ON businesses
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- 3. FIX BRANCHES TABLE RLS
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "branches_select_policy" ON branches;
DROP POLICY IF EXISTS "branches_insert_policy" ON branches;
DROP POLICY IF EXISTS "branches_update_policy" ON branches;
DROP POLICY IF EXISTS "branches_delete_policy" ON branches;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select_policy" ON branches
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "branches_insert_policy" ON branches
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
      AND business_id = branches.business_id
      AND role = 'Business Owner'
  )
);

CREATE POLICY "branches_update_policy" ON branches
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

CREATE POLICY "branches_delete_policy" ON branches
FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

-- Check profiles policies
SELECT 'PROFILES POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

-- Check businesses policies
SELECT 'BUSINESSES POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'businesses' ORDER BY policyname;

-- Check branches policies
SELECT 'BRANCHES POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'branches' ORDER BY policyname;

-- ═══════════════════════════════════════════════════════════════════
-- POST-FIX INSTRUCTIONS
-- ═══════════════════════════════════════════════════════════════════
-- 
-- After running this script:
-- 1. Clear your browser cache (Ctrl+Shift+Delete)
-- 2. Close all browser tabs with your app
-- 3. Open a new tab and try logging in again
-- 4. If still failing, check console for new errors
--
-- Test query (run AFTER logging in):
-- SELECT id, email, role, business_id FROM profiles WHERE id = auth.uid();
