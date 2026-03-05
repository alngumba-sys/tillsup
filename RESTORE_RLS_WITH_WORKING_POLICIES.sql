-- ═══════════════════════════════════════════════════════════════════
-- RESTORE RLS WITH WORKING POLICIES (NO INFINITE RECURSION)
-- ═══════════════════════════════════════════════════════════════════
-- This script re-enables RLS and creates simple, non-recursive policies
-- that will keep login working while restoring security
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

SELECT '
🔒 STEP 1: Re-enabling RLS on profiles table
═══════════════════════════════════════════════════════════════════
' as info;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

SELECT '
🗑️  STEP 2: Dropping all existing policies (clean slate)
═══════════════════════════════════════════════════════════════════
' as info;

-- Drop ALL existing policies to avoid conflicts
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

SELECT '
✅ STEP 3: Creating NEW non-recursive policies
═══════════════════════════════════════════════════════════════════
' as info;

-- ═══════════════════════════════════════════════════════════════════
-- POLICY 1: SELECT - Users can read their own profile
-- ═══════════════════════════════════════════════════════════════════
-- CRITICAL: Use auth.uid() directly - DO NOT reference profiles table
-- This prevents infinite recursion
CREATE POLICY "profiles_select_own"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- ═══════════════════════════════════════════════════════════════════
-- POLICY 2: UPDATE - Users can update their own profile
-- ═══════════════════════════════════════════════════════════════════
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);

-- ═══════════════════════════════════════════════════════════════════
-- POLICY 3: INSERT - Allow profile creation during signup
-- ═══════════════════════════════════════════════════════════════════
-- This allows the signup trigger to create profiles
CREATE POLICY "profiles_insert_own"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
);

-- ═══════════════════════════════════════════════════════════════════
-- POLICY 4: DELETE - Users can delete their own profile (optional)
-- ═══════════════════════════════════════════════════════════════════
CREATE POLICY "profiles_delete_own"
ON profiles
FOR DELETE
TO authenticated
USING (
  id = auth.uid()
);

SELECT '
🔍 STEP 4: Verifying policies
═══════════════════════════════════════════════════════════════════
' as info;

-- List all policies
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
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT '
✅ RLS RE-ENABLED WITH SIMPLE POLICIES!
═══════════════════════════════════════════════════════════════════

🔒 Security Restored:
- Users can only read/write their OWN profile
- No infinite recursion (uses auth.uid() directly)
- Login should still work normally

⚠️  LIMITATION:
- Business Owners cannot read other profiles yet
- Branch-based filtering not implemented yet

🔄 Next Steps:
1. Test login again to ensure it still works
2. If successful, we can add more sophisticated policies for:
   - Business owners reading all profiles in their business
   - Branch managers reading profiles in their branch
   - Admin features

📊 Test Your Login Now:
1. Sign out
2. Log back in
3. Verify dashboard loads correctly

' as summary;

COMMIT;

SELECT 'Transaction committed successfully!' as result;
