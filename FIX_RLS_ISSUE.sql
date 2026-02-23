-- =====================================================
-- FIX RLS ISSUE - Business Exists But Can't Be Accessed
-- =====================================================
-- 
-- PROBLEM: The business record with ID 7250c216-c81f-44c7-b9d6-1bb16a10b14d exists
-- but the user can't access it due to RLS (Row Level Security) policies.
-- This is likely because the owner_id doesn't match the user's ID.
--
-- =====================================================

-- STEP 1: Check what's in the database
-- Run this first to see the current state:

SELECT 
    b.id as business_id,
    b.name as business_name,
    b.owner_id,
    p.id as profile_id,
    p.email,
    p.first_name,
    p.last_name,
    p.business_id as profile_business_id
FROM businesses b
LEFT JOIN profiles p ON p.business_id = b.id
WHERE b.id = '7250c216-c81f-44c7-b9d6-1bb16a10b14d'
   OR p.business_id = '7250c216-c81f-44c7-b9d6-1bb16a10b14d';

-- =====================================================
-- STEP 2: Get Leah's user ID
-- =====================================================

SELECT id, email, first_name, last_name, business_id, role
FROM profiles
WHERE email = 'leah.wangui@tillsup.com';

-- =====================================================
-- STEP 3: Fix the owner_id mismatch
-- =====================================================
-- Replace <LEAH_USER_ID> with the actual ID from Step 2

UPDATE businesses
SET owner_id = (
    SELECT id FROM profiles 
    WHERE email = 'leah.wangui@tillsup.com' 
    LIMIT 1
)
WHERE id = '7250c216-c81f-44c7-b9d6-1bb16a10b14d';

-- =====================================================
-- STEP 4: Verify the fix
-- =====================================================

SELECT 
    b.id,
    b.name,
    b.owner_id,
    p.email as owner_email,
    p.first_name || ' ' || p.last_name as owner_name
FROM businesses b
LEFT JOIN profiles p ON p.id = b.owner_id
WHERE b.id = '7250c216-c81f-44c7-b9d6-1bb16a10b14d';

-- =====================================================
-- ALTERNATIVE: If the business is orphaned (owner doesn't exist)
-- =====================================================
-- Delete the orphaned business and let the app auto-create a new one:

-- DELETE FROM businesses 
-- WHERE id = '7250c216-c81f-44c7-b9d6-1bb16a10b14d';

-- Then update Leah's profile to trigger auto-creation:
-- UPDATE profiles 
-- SET business_id = NULL 
-- WHERE email = 'leah.wangui@tillsup.com';
