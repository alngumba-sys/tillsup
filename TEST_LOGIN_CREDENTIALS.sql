-- ═══════════════════════════════════════════════════════════════════
-- TEST YOUR LOGIN CREDENTIALS
-- ═══════════════════════════════════════════════════════════════════
-- This shows you exactly what credentials exist in your database
-- ═══════════════════════════════════════════════════════════════════

SELECT '
════════════════════════════════════════════════════════════════════
📋 ALL USERS IN YOUR SYSTEM
════════════════════════════════════════════════════════════════════
' as info;

-- Show all users with their current status
SELECT 
  '🔐 ' || u.email as "Email (use this to login)",
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Yes'
    ELSE '❌ NO - Cannot login!'
  END as "Email Confirmed?",
  CASE 
    WHEN u.last_sign_in_at IS NOT NULL THEN '✅ Yes - ' || to_char(u.last_sign_in_at, 'YYYY-MM-DD HH24:MI')
    ELSE '⚠️ Never'
  END as "Ever Logged In?",
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Yes'
    ELSE '❌ NO - Profile missing!'
  END as "Has Profile?",
  COALESCE(p.full_name, '(no name)') as "Name",
  COALESCE(p.role, '(no role)') as "Role",
  to_char(u.created_at, 'YYYY-MM-DD HH24:MI') as "Created"
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

SELECT '
════════════════════════════════════════════════════════════════════
🔍 COMMON LOGIN ISSUES
════════════════════════════════════════════════════════════════════
' as info;

-- Check for users who cannot login
SELECT 
  issue,
  count(*) as "Count",
  string_agg(email, ', ') as "Affected Emails"
FROM (
  -- Users with unconfirmed emails
  SELECT 
    '❌ Email Not Confirmed' as issue,
    u.email
  FROM auth.users u
  WHERE u.email_confirmed_at IS NULL
  
  UNION ALL
  
  -- Users without profiles
  SELECT 
    '❌ No Profile Record' as issue,
    u.email
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE p.id IS NULL
) issues
GROUP BY issue;

SELECT '
════════════════════════════════════════════════════════════════════
🧪 TESTING STEPS
════════════════════════════════════════════════════════════════════

1. Look at the email list above
2. Pick an email that shows:
   ✅ Email Confirmed? = Yes
   ✅ Has Profile? = Yes

3. If you don''t know the password:
   - Go to Supabase Dashboard > Authentication > Users
   - Find the user
   - Click "..." menu > "Send Password Reset Email"
   - OR set a new password directly (dev only)

4. Try logging in with those credentials

5. If still getting "Invalid email or password":
   a) Check for typos (copy-paste the email)
   b) Try resetting the password
   c) Check browser console for detailed error logs

════════════════════════════════════════════════════════════════════
' as testing_steps;

-- Show RLS status
SELECT '
════════════════════════════════════════════════════════════════════
🔒 SECURITY STATUS
════════════════════════════════════════════════════════════════════
' as info;

SELECT 
  tablename as "Table",
  CASE 
    WHEN rowsecurity THEN '🔒 ENABLED (may cause 42P17 error)'
    ELSE '🔓 DISABLED (login should work)'
  END as "RLS Status"
FROM pg_tables 
WHERE tablename IN ('profiles', 'businesses', 'branches')
  AND schemaname = 'public'
ORDER BY tablename;
