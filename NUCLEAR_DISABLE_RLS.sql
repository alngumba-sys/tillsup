-- ═══════════════════════════════════════════════════════════════════
-- NUCLEAR OPTION: COMPLETELY DISABLE RLS ON PROFILES
-- ═══════════════════════════════════════════════════════════════════
-- ⚠️  WARNING: This makes profiles table completely accessible
-- ⚠️  Only use this temporarily to confirm RLS is the problem
-- ⚠️  We will re-enable it properly after login works
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

SELECT 'Step 1: Dropping ALL policies on profiles table...' as status;

-- Drop ALL policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_own_select" ON profiles;
DROP POLICY IF EXISTS "profiles_business_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

SELECT 'Step 2: DISABLING Row Level Security completely...' as status;

-- Disable RLS entirely
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

SELECT 'Step 3: Verification...' as status;

-- Check that RLS is disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';

COMMIT;

SELECT '
✅ RLS COMPLETELY DISABLED ON PROFILES TABLE

⚠️  SECURITY WARNING:
- ALL authenticated users can now read/write ANY profile
- This is TEMPORARY for testing only
- You should be able to log in now

🔄 Next Steps:
1. Clear browser cache completely
2. Try logging in
3. Once login works, we will re-enable RLS with working policies

To re-enable RLS later, run:
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

' as summary;
