-- ═══════════════════════════════════════════════════════════════════
-- 🚨 EMERGENCY FIX - RUN THIS NOW!
-- ═══════════════════════════════════════════════════════════════════
-- This disables RLS and removes all problematic policies
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: DISABLE RLS ON PROFILES
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- STEP 2: DROP ALL POLICIES ON PROFILES
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- STEP 3: VERIFY RLS IS DISABLED
SELECT 
    CASE 
        WHEN relrowsecurity THEN '❌ STILL ENABLED - Something went wrong!'
        ELSE '✅ RLS DISABLED - You can login now!'
    END as "RLS Status on profiles table"
FROM pg_class
WHERE relname = 'profiles';

-- STEP 4: SHOW ALL USERS
SELECT 
    u.email as "Email",
    CASE 
        WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
        ELSE '❌ NOT CONFIRMED - Cannot login!'
    END as "Status",
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ Has Profile'
        ELSE '❌ NO PROFILE'
    END as "Profile",
    p.full_name as "Name",
    p.role as "Role"
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
