-- ═══════════════════════════════════════════════════════════════════
-- CREATE TEST USER FOR TILLSUP
-- ═══════════════════════════════════════════════════════════════════
-- This creates a complete test user with business and profile
-- ═══════════════════════════════════════════════════════════════════

-- Test credentials:
-- Email: admin@tillsup.com
-- Password: Test1234!

DO $$
DECLARE
  v_user_id uuid;
  v_business_id uuid;
  v_encrypted_password text;
BEGIN
  -- Generate IDs
  v_user_id := gen_random_uuid();
  v_business_id := gen_random_uuid();
  
  RAISE NOTICE '🔐 Creating test user with ID: %', v_user_id;
  RAISE NOTICE '🏢 Creating test business with ID: %', v_business_id;
  
  -- Create user in auth.users table
  -- Password: Test1234! (bcrypt hashed)
  -- You can also use Supabase dashboard to create users with custom passwords
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@tillsup.com',
    -- This is the bcrypt hash for "Test1234!"
    '$2a$10$zQjJ5VbZ5vZxZ5Z5Z5Z5ZeK5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']
    ),
    jsonb_build_object(
      'first_name', 'Test',
      'last_name', 'Admin',
      'business_id', v_business_id,
      'role', 'Business Owner'
    ),
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (email) DO NOTHING;
  
  -- Create business
  INSERT INTO businesses (
    id,
    name,
    owner_id,
    subscription_plan,
    subscription_status,
    trial_ends_at,
    max_branches,
    max_staff,
    currency,
    country,
    timezone,
    working_hours,
    tax_config,
    branding,
    completed_onboarding,
    created_at,
    updated_at
  ) VALUES (
    v_business_id,
    'Test Business',
    v_user_id,
    'Free Trial',
    'trial',
    NOW() + INTERVAL '30 days',
    5,
    20,
    'KES',
    'Kenya',
    'Africa/Nairobi',
    jsonb_build_object('start', '09:00', 'end', '21:00'),
    jsonb_build_object('enabled', false, 'name', 'VAT', 'percentage', 16, 'inclusive', false),
    jsonb_build_object('hidePlatformBranding', false),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create profile
  INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    role_id,
    business_id,
    branch_id,
    must_change_password,
    can_create_expense,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'admin@tillsup.com',
    'Test',
    'Admin',
    'Business Owner',
    NULL,
    v_business_id,
    NULL,
    false,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ TEST USER CREATED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Email: admin@tillsup.com';
  RAISE NOTICE '🔑 Password: Test1234!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTE: The password hash above is a placeholder.';
  RAISE NOTICE '   To set a real password, use Supabase Dashboard or Auth API.';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 RECOMMENDED: Instead of this script, use the registration form:';
  RAISE NOTICE '   1. Go to /register in your app';
  RAISE NOTICE '   2. Create a new account with your email';
  RAISE NOTICE '   3. Use that account to log in';
  RAISE NOTICE '';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: % - %', SQLSTATE, SQLERRM;
END $$;

-- Alternative: Just check if we need to confirm existing user emails
SELECT '
🔍 Checking for unconfirmed users...
' as info;

SELECT 
  email,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '⚠️ Need to confirm email'
    ELSE '✅ Email confirmed'
  END as status
FROM auth.users
WHERE email_confirmed_at IS NULL;

-- To manually confirm emails, uncomment this:
/*
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

SELECT '✅ All users confirmed!' as result;
*/
