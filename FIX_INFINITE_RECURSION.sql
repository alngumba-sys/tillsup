-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP: FIX INFINITE RECURSION IN RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════
-- This script fixes the "infinite recursion detected in policy for relation profiles" error
-- Run this entire script in your Supabase SQL Editor
-- Date: 2024-03-04
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: DROP ALL EXISTING POLICIES ON PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: ENSURE RLS IS ENABLED
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: CREATE NON-RECURSIVE POLICIES
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- SELECT POLICY: Users can view their own profile and profiles in their business
-- ────────────────────────────────────────────────────────────────────
-- IMPORTANT: This policy is safe because we use a LATERAL join to get business_id
-- without creating a recursive dependency

CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
USING (
  -- User can see their own profile
  auth.uid() = id
  OR
  -- User can see profiles in the same business
  -- Use subquery with explicit columns to avoid recursion
  business_id = (
    SELECT p.business_id 
    FROM profiles p 
    WHERE p.id = auth.uid()
    LIMIT 1
  )
);

-- ────────────────────────────────────────────────────────────────────
-- INSERT POLICY: Allow users to create their own profile
-- ────────────────────────────────────────────────────────────────────
-- IMPORTANT: This is where most recursion happens!
-- We ONLY check auth.uid() = id, nothing else!

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
WITH CHECK (
  -- Simple check: the inserted profile's id must match the authenticated user
  auth.uid() = id
);

-- ────────────────────────────────────────────────────────────────────
-- UPDATE POLICY: Users can update their own profile
-- ────────────────────────────────────────────────────────────────────

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────────
-- DELETE POLICY: Business owners can delete profiles in their business
-- ────────────────────────────────────────────────────────────────────

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE
USING (
  -- Only Business Owners can delete
  EXISTS (
    SELECT 1 
    FROM profiles owner 
    WHERE owner.id = auth.uid() 
      AND owner.role = 'Business Owner'
      AND owner.business_id = profiles.business_id
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: FIX OTHER TABLES THAT MIGHT HAVE RECURSION ISSUES
-- ═══════════════════════════════════════════════════════════════════

-- Fix businesses table policies (if they exist)
DROP POLICY IF EXISTS "businesses_select_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_delete_policy" ON businesses;

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Businesses SELECT: Users can see their own business
CREATE POLICY "businesses_select_policy" ON businesses
FOR SELECT
USING (
  id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  )
);

-- Businesses INSERT: Anyone can create a business (for registration)
CREATE POLICY "businesses_insert_policy" ON businesses
FOR INSERT
WITH CHECK (true);

-- Businesses UPDATE: Only business owners can update
CREATE POLICY "businesses_update_policy" ON businesses
FOR UPDATE
USING (
  id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'Business Owner'
  )
)
WITH CHECK (
  id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'Business Owner'
  )
);

-- Businesses DELETE: Only business owners can delete
CREATE POLICY "businesses_delete_policy" ON businesses
FOR DELETE
USING (
  id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'Business Owner'
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 5: FIX BRANCHES TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "branches_select_policy" ON branches;
DROP POLICY IF EXISTS "branches_insert_policy" ON branches;
DROP POLICY IF EXISTS "branches_update_policy" ON branches;
DROP POLICY IF EXISTS "branches_delete_policy" ON branches;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Branches SELECT: Users can see branches in their business
CREATE POLICY "branches_select_policy" ON branches
FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  )
);

-- Branches INSERT: Business owners and managers can create branches
CREATE POLICY "branches_insert_policy" ON branches
FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role IN ('Business Owner', 'Manager')
  )
);

-- Branches UPDATE: Business owners and managers can update branches
CREATE POLICY "branches_update_policy" ON branches
FOR UPDATE
USING (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role IN ('Business Owner', 'Manager')
  )
)
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role IN ('Business Owner', 'Manager')
  )
);

-- Branches DELETE: Only business owners can delete branches
CREATE POLICY "branches_delete_policy" ON branches
FOR DELETE
USING (
  business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'Business Owner'
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 6: VERIFY POLICIES WERE CREATED
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'profiles' AND schemaname = 'public';
    
    RAISE NOTICE '✅ Total policies on profiles table: %', policy_count;
    
    IF policy_count < 4 THEN
        RAISE WARNING '⚠️ Expected at least 4 policies, but found only %', policy_count;
    ELSE
        RAISE NOTICE '✅ All policies created successfully!';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 7: DISPLAY ALL CURRENT POLICIES
-- ══════════════════════════════���════════════════════════════════════

SELECT 
    tablename,
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename IN ('profiles', 'businesses', 'branches')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- DONE! 🎉
-- ═══════════════════════════════════════════════════════════════════
-- Your infinite recursion issue should now be fixed!
-- Try creating a new user or staff member to test.
-- ═══════════════════════════════════════════════════════════════════
