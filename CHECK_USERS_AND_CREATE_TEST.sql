-- ═══════════════════════════════════════════════════════════════════
-- CHECK EXISTING USERS AND CREATE TEST USER
-- ═══════════════════════════════════════════════════════════════════

SELECT '
🔍 STEP 1: Checking existing users in auth.users table
═══════════════════════════════════════════════════════════════════
' as info;

-- Check auth.users table
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '⚠️ NOT CONFIRMED'
    ELSE '✅ CONFIRMED'
  END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

SELECT '
🔍 STEP 2: Checking profiles table
═══════════════════════════════════════════════════════════════════
' as info;

-- Check profiles table
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  business_id,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

SELECT '
🔍 STEP 3: Checking businesses table
═══════════════════════════════════════════════════════════════════
' as info;

-- Check businesses
SELECT 
  id,
  name,
  owner_id,
  subscription_status,
  created_at
FROM businesses
ORDER BY created_at DESC
LIMIT 10;

SELECT '
📊 ANALYSIS COMPLETE
═══════════════════════════════════════════════════════════════════

Based on the results above:

1. If auth.users is EMPTY:
   - You need to register a new account first
   - Go to /register and create an account
   - OR run the CREATE_TEST_USER.sql script below

2. If auth.users has users but email is NOT CONFIRMED:
   - Check your email for confirmation link
   - OR manually confirm (see script below)

3. If auth.users has users but you forgot password:
   - Use the password reset feature
   - OR run the RESET_PASSWORD.sql script

4. If profiles table is empty but auth.users has data:
   - Run the FIX_MISSING_PROFILES.sql script

' as summary;
