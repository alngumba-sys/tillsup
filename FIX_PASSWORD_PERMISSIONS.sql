-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP PASSWORD RESET - PERMISSION FIX
-- ═══════════════════════════════════════════════════════════════════
-- This script fixes permission issues for the password reset function
-- Run this in Supabase SQL Editor if you get "function not installed" error
-- even after creating the function successfully
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Verify the function exists
SELECT proname, pronamespace::regnamespace, proacl
FROM pg_proc
WHERE proname = 'simple_reset_staff_password';

-- Step 2: Grant explicit execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO service_role;

-- Step 3: Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Step 4: Verify permissions were granted
SELECT 
    routine_name,
    routine_schema,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'simple_reset_staff_password'
ORDER BY grantee, privilege_type;

-- ═══════════════════════════════════════════════════════════════════
-- SUCCESS INDICATORS:
-- ═══════════════════════════════════════════════════════════════════
-- ✅ You should see "simple_reset_staff_password" in the first query
-- ✅ The final query should show EXECUTE privileges for:
--    - authenticated
--    - anon  
--    - service_role
-- ═══════════════════════════════════════════════════════════════════
