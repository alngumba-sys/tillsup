-- ═══════════════════════════════════════════════════════════════════
-- QUICK FIX FOR INFINITE RECURSION ERROR (42P17)
-- ═══════════════════════════════════════════════════════════════════
-- COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- Then click "Run" (or press Ctrl+Enter)
-- Takes 2 seconds to complete
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Step 1: Remove old broken policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Step 2: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create new NON-RECURSIVE policies

-- SELECT: Users can view their own profile and profiles in their business
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  auth.uid() = id OR
  business_id = (SELECT business_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- INSERT: Users can only create their own profile (NO RECURSION!)
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- UPDATE: Users can only update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- DELETE: Only Business Owners can delete profiles in their business
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles owner 
    WHERE owner.id = auth.uid() 
      AND owner.role = 'Business Owner'
      AND owner.business_id = profiles.business_id
  )
);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- DONE! ✅
-- ═══════════════════════════════════════════════════════════════════
-- Now refresh your Tillsup app and the error should be gone!
-- ═══════════════════════════════════════════════════════════════════
