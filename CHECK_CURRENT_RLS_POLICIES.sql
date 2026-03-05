-- ═══════════════════════════════════════════════════════════════════
-- CHECK CURRENT RLS STATUS AND POLICIES
-- ═══════════════════════════════════════════════════════════════════
-- This shows you exactly what policies are causing the recursion
-- ═══════════════════════════════════════════════════════════════════

SELECT '
🔍 STEP 1: Checking if RLS is enabled
═══════════════════════════════════════════════════════════════════
' as info;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '🔒 ENABLED'
    ELSE '🔓 DISABLED'
  END as status
FROM pg_tables 
WHERE tablename = 'profiles';

SELECT '
🔍 STEP 2: Listing ALL policies on profiles table
═══════════════════════════════════════════════════════════════════
' as info;

SELECT 
  policyname as "Policy Name",
  cmd as "Operation",
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅ Permissive'
    ELSE '🚫 Restrictive'
  END as "Type",
  qual as "USING Clause",
  with_check as "WITH CHECK Clause"
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT '
🔍 STEP 3: Identifying problematic policies
═══════════════════════════════════════════════════════════════════
' as info;

-- Check for policies that reference the profiles table (causes recursion)
SELECT 
  policyname as "⚠️ POTENTIALLY RECURSIVE POLICY",
  cmd as "Operation",
  qual as "USING Clause (Check for profiles table reference)"
FROM pg_policies
WHERE tablename = 'profiles'
  AND (
    qual::text LIKE '%profiles%' OR
    qual::text LIKE '%FROM%' OR
    qual::text LIKE '%JOIN%' OR
    qual::text LIKE '%SELECT%' OR
    with_check::text LIKE '%profiles%' OR
    with_check::text LIKE '%FROM%' OR
    with_check::text LIKE '%JOIN%' OR
    with_check::text LIKE '%SELECT%'
  );

SELECT '
🔍 STEP 4: Count of policies
══════════════════��════════════════════════════════════════════════
' as info;

SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'profiles';

SELECT '
📊 DIAGNOSIS COMPLETE
═══════════════════════════════════════════════════════════════════

🚨 CAUSES OF INFINITE RECURSION (42P17):

1. Policies that query the SAME table they protect
   Example: A SELECT policy on profiles that does:
   USING (business_id = (SELECT business_id FROM profiles WHERE ...))
   
2. Policies that join profiles to itself
   
3. Complex subqueries referencing profiles

✅ SAFE POLICIES use ONLY:
   - auth.uid() - Current user ID
   - auth.jwt() - Current user JWT claims
   - Direct column comparisons (id = auth.uid())
   - NO subqueries to profiles table
   - NO JOINs to profiles table

🔧 RECOMMENDED FIX:
   Run EMERGENCY_DISABLE_RLS_NOW.sql to disable RLS
   Then run RESTORE_RLS_WITH_WORKING_POLICIES.sql for safe policies

' as summary;
