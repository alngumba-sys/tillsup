-- ═══════════════════════════════════════════════════════════════════
-- CONFIRM ALL USER EMAILS (Fix "Invalid credentials" due to unconfirmed emails)
-- ═══════════════════════════════════════════════════════════════════
-- Supabase requires email confirmation before login works
-- This script manually confirms all pending emails
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

SELECT 'Step 1: Checking unconfirmed emails...' as status;

SELECT 
  email,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '⚠️ UNCONFIRMED'
    ELSE '✅ CONFIRMED'
  END as confirmation_status
FROM auth.users
ORDER BY created_at DESC;

SELECT 'Step 2: Confirming all unconfirmed emails...' as status;

-- Confirm all emails
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

SELECT 'Step 3: Verification...' as status;

-- Check results
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as unconfirmed_users
FROM auth.users;

COMMIT;

SELECT '
✅ ALL USER EMAILS CONFIRMED!

🔄 Next Steps:
1. Go back to the login page
2. Enter your email and password
3. You should now be able to log in

📧 If you forgot your password, use the password reset feature
   or check the database for your email address.

' as summary;
