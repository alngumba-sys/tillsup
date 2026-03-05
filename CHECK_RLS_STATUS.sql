-- ═══════════════════════════════════════════════════════════════════
-- CHECK RLS POLICY STATUS
-- ═══════════════════════════════════════════════════════════════════
-- This checks what RLS policies are currently active on the profiles table
-- ═══════════════════════════════════════════════════════════════════

SELECT '
🔍 CHECKING RLS POLICY STATUS ON PROFILES TABLE
═══════════════════════════════════════════════════════════════════
' as info;

-- Check if RLS is enabled on profiles table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';

SELECT '
📋 CURRENT SELECT POLICIES ON PROFILES TABLE
═══════════════════════════════════════════════════════════════════
' as info;

-- List all SELECT policies on profiles table
SELECT 
  polname as policy_name,
  polcmd as command,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command_type,
  pg_get_expr(qual, polrelid) as using_expression,
  polroles::regrole[] as roles
FROM pg_policy
WHERE polrelid = 'profiles'::regclass
ORDER BY polname;

SELECT '
🧪 TEST: CAN WE QUERY PROFILES WITHOUT ERROR?
═══════════════════════════════════════════════════════════════════
' as info;

-- Try to count profiles (this should work if RLS is working)
DO $$
DECLARE
  profile_count integer;
  test_user_id uuid;
BEGIN
  -- Get first user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Set the session to that user
    PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
    
    -- Try to query profiles table
    SELECT COUNT(*) INTO profile_count FROM profiles WHERE id = test_user_id;
    
    RAISE NOTICE '✅ SUCCESS: Found % profile(s) for user %', profile_count, test_user_id;
  ELSE
    RAISE NOTICE '⚠️  No users found in auth.users table';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: % - %', SQLSTATE, SQLERRM;
    RAISE NOTICE 'This likely means RLS policies are still causing issues!';
END $$;

SELECT '
📊 SUMMARY
═══════════════════════════════════════════════════════════════════
Check the results above:
1. Is RLS enabled on profiles? (should be TRUE)
2. What SELECT policies exist? (should see profiles_select_all_authenticated)
3. Did the test query work? (should see SUCCESS message)

If test failed with recursion error, the EMERGENCY fix did not apply properly.
' as summary;
