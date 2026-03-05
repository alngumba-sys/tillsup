-- ═══════════════════════════════════════════════════════════════════
-- CHECK LOGIN ISSUE - Quick Diagnostic
-- ═══════════════════════════════════════════════════════════════════
-- Run this to see what's happening with your login
-- ═══════════════════════════════════════════════════════════════════

-- 1. Check if your profile exists
SELECT 
  '1️⃣ Your Profile Status:' as step;

SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  business_id,
  branch_id,
  must_change_password,
  created_at
FROM profiles
WHERE email = 'demo@test.com';  -- Change this to your email

-- 2. Check what RLS policies are active
SELECT 
  '2️⃣ Active RLS Policies on Profiles:' as step;

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
WHERE tablename = 'profiles';

-- 3. Test if the profile SELECT query would work
-- This simulates what happens when you log in
SELECT 
  '3️⃣ Testing Profile Fetch (simulating auth.uid()):' as step;

-- First, find your user ID
SELECT 
  '   Your User ID:' as info,
  id 
FROM auth.users 
WHERE email = 'demo@test.com';  -- Change this to your email

-- 4. Check for potential infinite recursion in RLS
SELECT 
  '4️⃣ Checking for Infinite Recursion Risk:' as step;

-- This will show if the RLS policy references profiles table recursively
SELECT 
  policyname,
  CASE 
    WHEN qual LIKE '%profiles%' THEN '⚠️ RECURSION RISK'
    ELSE '✅ OK'
  END as recursion_check,
  qual as policy_definition
FROM pg_policies
WHERE tablename = 'profiles'
  AND cmd = 'SELECT';

-- 5. Simple solution: Create a non-recursive SELECT policy
SELECT 
  '5️⃣ Recommended Fix:' as step;

SELECT '
The issue is likely infinite recursion in RLS policies.
The SELECT policy checks the profiles table, which triggers the SELECT policy again.

Run this fix:
' as recommendation;

-- Drop all policies and create simple ones
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Create a simple policy that does NOT cause recursion
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
TO authenticated
USING (
  -- Simple: user can ALWAYS see their own profile
  -- This does NOT query the profiles table, so no recursion
  id = auth.uid()
);

-- Verify it worked
SELECT 
  '6️⃣ Verification:' as step;

SELECT 
  policyname,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
  AND cmd = 'SELECT';

SELECT '
✅ Now try logging in again!
' as next_step;
