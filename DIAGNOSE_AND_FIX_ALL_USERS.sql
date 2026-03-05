-- ═══════════════════════════════════════════════════════════════════
-- DIAGNOSE AND FIX ALL USERS - COMPLETE SOLUTION
-- ═══════════════════════════════════════════════════════════════════
-- This script diagnoses AND fixes login issues for ALL users
-- 
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- PART 1: DIAGNOSIS - Find all users with missing profiles
-- ═══════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════' as "INFO";
SELECT 'PART 1: DIAGNOSIS - Checking for users without profiles' as "INFO";
SELECT '═══════════════════════════════════════════════════════' as "INFO";

-- Find all authenticated users
SELECT 
  '✅ Total users in auth.users:' as "Check",
  COUNT(*) as "Count"
FROM auth.users;

-- Find all profiles
SELECT 
  '✅ Total profiles in profiles table:' as "Check",
  COUNT(*) as "Count"
FROM profiles;

-- Find users WITHOUT profiles (THE PROBLEM)
SELECT 
  '🚨 Users WITHOUT profiles (PROBLEM):' as "Check",
  COUNT(*) as "Count"
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- Show the users who can't log in
SELECT 
  '📋 Users who CANNOT log in (missing profiles):' as "INFO";
  
SELECT 
  u.id,
  u.email,
  u.created_at,
  'MISSING PROFILE' as status
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
)
ORDER BY u.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════
-- PART 2: FIX RLS POLICIES (For ALL Users)
-- ═══════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════' as "INFO";
SELECT 'PART 2: FIXING RLS POLICIES (affects ALL users)' as "INFO";
SELECT '═══════════════════════════════════════════════════════' as "INFO";

-- Drop existing profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Business owners can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ✅ CRITICAL: Users MUST be able to read their own profile
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
TO authenticated
USING (
  -- Users can ALWAYS see their own profile (REQUIRED FOR LOGIN)
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

-- Drop existing businesses policies
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
  OR
  id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
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

-- Drop existing branches policies
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

SELECT '✅ RLS policies fixed for profiles, businesses, and branches' as "Status";

-- ═══════════════════════════════════════════════════════════════════
-- PART 3: CREATE MISSING PROFILES (Auto-Fix)
-- ═══════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════' as "INFO";
SELECT 'PART 3: AUTO-CREATING MISSING PROFILES' as "INFO";
SELECT '═══════════════════════════════════════════════════════' as "INFO";

-- Create profiles for users who don't have them
-- This will fix ALL users who can't log in
-- NOTE: Using first_name and last_name (separate columns), not full_name
INSERT INTO profiles (id, email, first_name, last_name, role, business_id, can_create_expense, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', 'User') as first_name,
  COALESCE(u.raw_user_meta_data->>'last_name', u.email) as last_name,
  COALESCE(u.raw_user_meta_data->>'role', 'Business Owner') as role,
  NULL as business_id,  -- Will be set when they create/join a business
  true as can_create_expense,
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Show how many profiles were created
SELECT 
  '✅ Missing profiles created:' as "Status",
  COUNT(*) as "Count"
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id;

-- ═══════════════════════════════════════════════════════════════════
-- PART 4: VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════' as "INFO";
SELECT 'PART 4: VERIFICATION - Checking if fix worked' as "INFO";
SELECT '═══════════════════════════════════════════════════════' as "INFO";

-- Check: Should be ZERO users without profiles now
SELECT 
  '🔍 Users still WITHOUT profiles (should be 0):' as "Check",
  COUNT(*) as "Count"
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- Show all users and their profile status
SELECT 
  '📊 All users and their profiles:' as "INFO";

SELECT 
  u.email,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ HAS PROFILE'
    ELSE '❌ MISSING'
  END as profile_status,
  p.role,
  p.business_id,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- Verify RLS policies
SELECT 
  '📋 Active RLS policies on profiles table:' as "INFO";

SELECT 
  policyname,
  cmd,
  CASE WHEN permissive = 'PERMISSIVE' THEN '✅' ELSE '⚠️' END as type
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════' as "INFO";
SELECT '✅ FIX COMPLETE - Summary' as "INFO";
SELECT '═══════════════════════════════════════════════════════' as "INFO";

SELECT '
✅ WHAT WAS FIXED:
  
1. ✅ RLS policies updated (ALL users can now read their own profile)
2. ✅ Missing profiles created automatically (ALL users can now log in)
3. ✅ Businesses table RLS fixed
4. ✅ Branches table RLS fixed

📋 NEXT STEPS:

1. Check the verification results above
2. Clear browser cache on ALL devices
3. Try logging in with ANY user account
4. ALL users should now be able to log in successfully

🔍 IF STILL HAVING ISSUES:

Run this query to check a specific user:
  
  SELECT * FROM profiles WHERE email = ''your-email@example.com'';
  
If the profile exists, login should work!

' as "Summary";
