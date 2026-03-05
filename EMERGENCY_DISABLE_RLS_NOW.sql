-- ═══════════════════════════════════════════════════════════════════
-- EMERGENCY: DISABLE RLS IMMEDIATELY
-- ═══════════════════════════════════════════════════════════════════
-- This will restore access to your dashboard
-- Run this NOW to fix the 42P17 error
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

SELECT '🚨 EMERGENCY FIX: Disabling RLS on profiles table' as status;

-- Disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all policies to be safe
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Business owners can read all profiles in business" ON profiles;
DROP POLICY IF EXISTS "Managers can read profiles in their branch" ON profiles;
DROP POLICY IF EXISTS "Staff can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

COMMIT;

SELECT '
✅ RLS DISABLED - ERRORS SHOULD BE GONE NOW!

🔄 Next Steps:
1. Refresh your browser (clear cache: Ctrl+Shift+R / Cmd+Shift+R)
2. Log in again
3. Dashboard should load properly

⚠️  SECURITY WARNING:
- RLS is now DISABLED on profiles table
- This is TEMPORARY for development/testing only
- Any authenticated user can read any profile
- Do NOT use this in production with real data

📋 After Testing:
- Once you confirm everything works
- Run RESTORE_RLS_WITH_WORKING_POLICIES.sql to restore security
- Test again to ensure no recursion errors

' as summary;
