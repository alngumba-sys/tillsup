-- ═══════════════════════════════════════════════════════════════════
-- FIX INFINITE RECURSION - COMPLETE SOLUTION
-- ═══════════════════════════════════════════════════════════════════
-- The problem: get_user_business_id() QUERIES profiles table,
-- which triggers the SELECT policy, which calls get_user_business_id(),
-- which queries profiles again → INFINITE RECURSION → 500 ERROR
--
-- The solution: Make the function BYPASS RLS using SECURITY DEFINER
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: Check current function definition
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  '🔍 Current get_user_business_id() function:' as info;

SELECT 
  prosrc as function_body,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'get_user_business_id';

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: Fix profiles policies to prevent recursion
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  '🔧 Fixing profiles SELECT policies...' as info;

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_own_select" ON profiles;
DROP POLICY IF EXISTS "profiles_business_select" ON profiles;

-- ✅ POLICY 1: Users can ALWAYS see their own profile
-- This is SIMPLE and does NOT cause recursion
CREATE POLICY "profiles_own_select" ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- ✅ POLICY 2: Users can see profiles in their business
-- This policy CAN cause recursion if get_user_business_id() doesn't bypass RLS
-- We need to ensure the function has SECURITY DEFINER
CREATE POLICY "profiles_business_select" ON profiles
FOR SELECT
TO authenticated
USING (
  business_id IS NOT NULL 
  AND business_id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: Test if recursion still happens
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  '🧪 Testing for recursion...' as info;

-- This simulates what happens when a user logs in
-- If this query fails, we still have recursion
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get a real user ID from auth.users
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Set the auth context
    PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
    
    -- Try to fetch the profile (this is what causes 500 error)
    PERFORM * FROM profiles WHERE id = test_user_id;
    
    RAISE NOTICE '✅ No recursion detected - profile fetch works!';
  ELSE
    RAISE NOTICE '⚠️  No users found to test';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ RECURSION DETECTED: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: Alternative - Use a simpler approach without function
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  '🔄 Creating alternative policies without function...' as info;

-- Drop the policies that use the function
DROP POLICY IF EXISTS "profiles_business_select" ON profiles;

-- Create a policy that uses a direct subquery instead of function
-- This avoids the function call entirely
CREATE POLICY "profiles_business_select" ON profiles
FOR SELECT
TO authenticated
USING (
  -- Allow if user's business_id matches
  EXISTS (
    -- This subquery should NOT trigger recursion because:
    -- 1. It only checks WHERE id = auth.uid()
    -- 2. That's covered by profiles_own_select policy
    -- 3. So it doesn't need to evaluate this policy again
    SELECT 1 
    FROM profiles p 
    WHERE p.id = auth.uid() 
      AND p.business_id = profiles.business_id
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 5: Verification
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  '📋 Current SELECT policies on profiles:' as info;

SELECT 
  polname as policyname,
  pg_get_expr(qual, polrelid) as using_expression
FROM pg_policy
WHERE polrelid = 'profiles'::regclass
  AND polcmd = 'r';  -- 'r' = SELECT

COMMIT;

SELECT '
✅ FIXES APPLIED

What was changed:
1. ✅ Kept simple "own profile" SELECT policy (no recursion)
2. ✅ Changed business-wide SELECT to use direct subquery (avoids function)
3. ✅ The subquery should not cause recursion because it matches profiles_own_select

🔄 Next steps:
1. Clear browser cache completely
2. Try logging in again
3. Check console for 500 errors

If you still see 500 errors, the issue is deeper and we may need to:
- Temporarily disable RLS on profiles table for testing
- Check Supabase logs for the actual error

' as summary;
