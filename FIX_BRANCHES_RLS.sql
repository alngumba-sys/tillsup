-- ═══════════════════════════════════════════════════════════════════
-- FIX BRANCHES TABLE RLS POLICY ERROR (42501)
-- ═══════════════════════════════════════════════════════════════════
-- This script fixes the "new row violates row-level security policy" 
-- error when creating branches
--
-- Error Code: 42501
-- Issue: RLS INSERT policy is preventing branch creation
--
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Drop existing policies to start fresh
DROP POLICY IF EXISTS "branches_select_policy" ON branches;
DROP POLICY IF EXISTS "branches_insert_policy" ON branches;
DROP POLICY IF EXISTS "branches_update_policy" ON branches;
DROP POLICY IF EXISTS "branches_delete_policy" ON branches;
DROP POLICY IF EXISTS "Business owners can manage branches" ON branches;
DROP POLICY IF EXISTS "Staff can view their branch" ON branches;
DROP POLICY IF EXISTS "Users can view branches of their business" ON branches;

-- Step 2: Ensure RLS is enabled
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SELECT policy - All authenticated users can view branches in their business
CREATE POLICY "branches_select_policy" ON branches
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  )
);

-- Step 4: Create INSERT policy - Business owners can create branches
-- IMPORTANT: This policy must allow inserts for business owners
CREATE POLICY "branches_insert_policy" ON branches
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check that the user is a Business Owner
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
      AND business_id = branches.business_id  -- Must match the business_id being inserted
      AND role = 'Business Owner'
  )
);

-- Step 5: Create UPDATE policy - Business owners can update branches
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

-- Step 6: Create DELETE policy - Only business owners can delete branches
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

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION QUERY
-- ═══════════════════════════════════════════════════════════════════
-- Run this to check if policies were created successfully:

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'branches'
ORDER BY policyname;

-- ═══════════════════════════════════════════════════════════════════
-- TEST YOUR FIX
-- ═══════════════════════════════════════════════════════════════════
-- After running this script, test creating a branch in your app
-- If you still get errors, check:
-- 1. Your user has role = 'Business Owner' in the profiles table
-- 2. Your user's business_id matches the business you're creating branch for
-- 3. Your auth.uid() is properly set in Supabase

-- Verify your user's profile:
-- SELECT id, email, role, business_id FROM profiles WHERE id = auth.uid();
