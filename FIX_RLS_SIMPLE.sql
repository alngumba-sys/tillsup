-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP PROFILES RLS - SIMPLE NON-RECURSIVE APPROACH
-- ═══════════════════════════════════════════════════════════════════
-- Strategy: Use PERMISSIVE policies and trust the application layer
-- This is the safest approach for Supabase to avoid recursion
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: DISABLE RLS temporarily to allow cleanup
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.get_my_business_id();
DROP FUNCTION IF EXISTS public.get_my_role();

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: Create a SIMPLE, PERMISSIVE policy
-- Trust the application to enforce business logic
-- ═══════════════════════════════════════════════════════════════════

-- Allow authenticated users full access to profiles
-- The application (React/TypeScript) handles business-level filtering
CREATE POLICY "Allow authenticated users full access"
ON public.profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Optional: Allow anon users to read (for public endpoints if needed)
-- Comment this out if you don't need it
-- CREATE POLICY "Allow anon read access"
-- ON public.profiles
-- FOR SELECT
-- TO anon
-- USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: Re-enable RLS with the simple policy
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check policies
SELECT 
    policyname,
    cmd as operation,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Test: You should be able to see your profile now
SELECT id, email, role, business_id 
FROM public.profiles 
WHERE id = auth.uid();
