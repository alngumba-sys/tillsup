-- ═══════════════════════════════════════════════════════════════════
-- EMERGENCY: ALLOW ALL LOGINS (TEMPORARY FIX)
-- ═══════════════════════════════════════════════════════════════════
-- This temporarily makes profiles readable by ALL authenticated users
-- so you can log in and access your dashboard
-- 
-- ⚠️  WARNING: This is less secure but will allow login
-- We'll add proper security back after we fix the recursion
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Drop ALL SELECT policies on profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_own_select" ON profiles;
DROP POLICY IF EXISTS "profiles_business_select" ON profiles;

-- Create ONE simple policy: authenticated users can read profiles
-- This is VERY permissive but will definitely work
CREATE POLICY "profiles_select_all_authenticated" ON profiles
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to read profiles

SELECT '
⚠️  EMERGENCY FIX APPLIED

What this does:
- ALL authenticated users can now read ALL profiles
- This is TEMPORARY to let you log in
- We will add proper security back later

✅ You should now be able to:
1. Clear browser cache
2. Log in successfully
3. Access dashboard

Once you confirm login works, we can add back the business filtering.

' as summary;

COMMIT;
