-- ═══════════════════════════════════════════════════════════════════
-- COMPREHENSIVE FIX FOR ALL LOGIN ISSUES
-- ═══════════════════════════════════════════════════════════════════
-- This script will:
-- 1. Disable RLS to fix infinite recursion
-- 2. Show you all existing users
-- 3. Let you reset a user's password if needed
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: DISABLE RLS (Fix infinite recursion error)
-- ═══════════════════════════════════════════════════════════════════

SELECT '
════════════════════════════════════════════════════════════════════
STEP 1: DISABLING RLS ON PROFILES TABLE
════════════════════════════════════════════════════════════════════
' as step;

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all problematic policies
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

SELECT '✅ RLS DISABLED - Infinite recursion error fixed!' as status;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: LIST ALL USERS IN THE SYSTEM
-- ═══════════════════════════════════════════════════════════════════

SELECT '
════════════════════════════════════════════════════════════════════
STEP 2: LISTING ALL USERS IN YOUR DATABASE
════════════════════════════════════════════════════════════════════
' as step;

SELECT 
  u.email as "📧 Email",
  u.created_at as "📅 Created",
  u.last_sign_in_at as "🔐 Last Login",
  p.full_name as "👤 Name",
  p.role as "🎭 Role",
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as "Email Status",
  CASE 
    WHEN u.last_sign_in_at IS NOT NULL THEN '✅ Has Logged In'
    ELSE '⚠️ Never Logged In'
  END as "Login Status"
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: CHECK FOR ORPHANED PROFILES (users without auth records)
-- ═══════════════════════════════════════════════════════════════════

SELECT '
════════════════════════════════════════════════════════════════════
STEP 3: CHECKING FOR ORPHANED PROFILES
════════════════════════════════════════════════════════════════════
' as step;

SELECT 
  p.id,
  p.email as "⚠️ Orphaned Email",
  p.full_name as "Name",
  p.role as "Role",
  'No auth record found - cannot login!' as "Issue"
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: RESET PASSWORD (Optional - Uncomment and modify if needed)
-- ═══════════════════════════════════════════════════════════════════

/*
-- If you need to reset a user's password, uncomment this section
-- and replace 'user@example.com' with the actual email
-- and 'NewPassword123!' with the desired password

-- NOTE: You need to use Supabase Dashboard > Authentication > Users
-- to reset passwords, or use the Supabase Auth API

SELECT '
════════════════════════════════════════════════════════════════════
PASSWORD RESET INSTRUCTIONS
════════════════════════════════════════════════════════════════════

Option 1: Via Supabase Dashboard
1. Go to Supabase Dashboard
2. Click "Authentication" > "Users"
3. Find the user
4. Click "..." menu > "Reset Password"
5. User will receive reset email

Option 2: Via SQL (Set password directly - Development Only!)
-- Run this only if you have access to the auth schema

UPDATE auth.users
SET encrypted_password = crypt(''NewPassword123!'', gen_salt(''bf''))
WHERE email = ''user@example.com'';

⚠️  WARNING: Direct password updates bypass security measures
   Only use this in development/testing environments!

' as instructions;
*/

SELECT '
════════════════════════════════════════════════════════════════════
✅ DIAGNOSTIC COMPLETE!
════════════════════════════════════════════════════════════════════

WHAT TO DO NEXT:

1. ✅ RLS is now DISABLED - Login should work without recursion error

2. 📋 Check the user list above:
   - Is your email in the list?
   - Does it show "✅ Confirmed"?
   - Does it have a profile record?

3. 🔐 LOGIN TROUBLESHOOTING:

   If you see "Invalid login credentials":
   
   a) WRONG PASSWORD
      - Try resetting via "Forgot Password" link
      - Or reset via Supabase Dashboard
   
   b) EMAIL NOT CONFIRMED
      - Check if email shows "❌ Not Confirmed"
      - Confirm email via Supabase Dashboard
   
   c) NO AUTH RECORD
      - User exists in profiles but not in auth.users
      - Need to create auth record via Supabase Dashboard
   
   d) TYPO IN EMAIL
      - Double-check email spelling
      - Check for extra spaces

4. 🧪 TEST LOGIN:
   - Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
   - Try logging in with credentials from the list above
   - Check browser console for detailed error messages

5. ⚠️  SECURITY NOTE:
   - RLS is now DISABLED on profiles table
   - This is OK for development/testing
   - DO NOT use in production with real data

════════════════════════════════════════════════════════════════════
' as summary;
