-- ═══════════════════════════════════════════════════════════════════
-- QUICK REFERENCE: Owner ID Fixes
-- ═══════════════════════════════════════════════════════════════════
-- Use these queries for quick diagnostics and manual fixes
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 🔍 DIAGNOSTIC QUERIES (Read-Only)
-- ───────────────────────────────────────────────────────────────────

-- 1. Find all businesses with NULL owner_id
SELECT 
    id,
    name,
    owner_id,
    country,
    created_at
FROM public.businesses
WHERE owner_id IS NULL
ORDER BY created_at DESC;

-- 2. Find businesses with invalid owner_id (user doesn't exist)
SELECT 
    b.id,
    b.name,
    b.owner_id,
    b.created_at,
    'User not found in auth.users' as issue
FROM public.businesses b
WHERE b.owner_id IS NOT NULL
  AND b.owner_id NOT IN (SELECT id FROM auth.users)
ORDER BY b.created_at DESC;

-- 3. Find businesses where owner exists but has no profile
SELECT 
    b.id,
    b.name,
    b.owner_id,
    u.email as owner_email,
    'Owner has no profile' as issue
FROM public.businesses b
JOIN auth.users u ON b.owner_id = u.id
LEFT JOIN public.profiles p ON b.owner_id = p.id
WHERE p.id IS NULL
ORDER BY b.created_at DESC;

-- 4. Health check - Count of valid vs invalid businesses
SELECT 
    COUNT(*) as total_businesses,
    COUNT(CASE WHEN owner_id IS NOT NULL 
               AND owner_id IN (SELECT id FROM auth.users) 
          THEN 1 END) as valid_businesses,
    COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as null_owner_id,
    COUNT(CASE WHEN owner_id IS NOT NULL 
               AND owner_id NOT IN (SELECT id FROM auth.users) 
          THEN 1 END) as invalid_owner_id
FROM public.businesses;

-- 5. Show businesses with their owner details
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.owner_id,
    u.email as owner_email,
    p.first_name || ' ' || p.last_name as owner_name,
    p.phone_number,
    b.created_at,
    b.country,
    b.subscription_plan
FROM public.businesses b
LEFT JOIN auth.users u ON b.owner_id = u.id
LEFT JOIN public.profiles p ON b.owner_id = p.id
ORDER BY b.created_at DESC
LIMIT 20;

-- 6. Find businesses where owner_id doesn't match profile's business_id
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.owner_id,
    p.business_id as profile_business_id,
    p.email,
    'Mismatch: owner not in this business' as issue
FROM public.businesses b
JOIN public.profiles p ON b.owner_id = p.id
WHERE p.business_id != b.id
  AND p.role = 'Business Owner';

-- ───────────────────────────────────────────────────────────────────
-- 🔧 MANUAL FIX QUERIES (Write Operations - Use with Caution!)
-- ───────────────────────────────────────────────────────────────────

-- 7. Fix NULL owner_id by matching with Business Owner profile
-- This finds the Business Owner profile for each business and sets owner_id
UPDATE public.businesses b
SET owner_id = (
    SELECT p.id
    FROM public.profiles p
    WHERE p.business_id = b.id
      AND p.role = 'Business Owner'
      AND p.id IN (SELECT id FROM auth.users)
    LIMIT 1
)
WHERE b.owner_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.business_id = b.id
      AND p.role = 'Business Owner'
      AND p.id IN (SELECT id FROM auth.users)
  );

-- 8. Fix invalid owner_id by matching with Business Owner profile
UPDATE public.businesses b
SET owner_id = (
    SELECT p.id
    FROM public.profiles p
    WHERE p.business_id = b.id
      AND p.role = 'Business Owner'
      AND p.id IN (SELECT id FROM auth.users)
    LIMIT 1
)
WHERE b.owner_id IS NOT NULL
  AND b.owner_id NOT IN (SELECT id FROM auth.users)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.business_id = b.id
      AND p.role = 'Business Owner'
      AND p.id IN (SELECT id FROM auth.users)
  );

-- 9. Fix specific business by ID (replace 'BUSINESS-ID-HERE')
UPDATE public.businesses
SET owner_id = (
    SELECT p.id
    FROM public.profiles p
    WHERE p.business_id = 'BUSINESS-ID-HERE'
      AND p.role = 'Business Owner'
    LIMIT 1
)
WHERE id = 'BUSINESS-ID-HERE';

-- 10. Delete orphaned businesses (no owner and can't be matched)
-- ⚠️ WARNING: This permanently deletes data! Use with extreme caution!
-- Uncomment the DELETE line only if you're sure
/*
DELETE FROM public.businesses
WHERE owner_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.business_id = businesses.id
      AND p.role = 'Business Owner'
  );
*/

-- 11. Delete businesses with invalid owner_id that can't be recovered
-- ⚠️ WARNING: This permanently deletes data! Use with extreme caution!
-- Uncomment the DELETE line only if you're sure
/*
DELETE FROM public.businesses
WHERE owner_id IS NOT NULL
  AND owner_id NOT IN (SELECT id FROM auth.users)
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.business_id = businesses.id
      AND p.role = 'Business Owner'
      AND p.id IN (SELECT id FROM auth.users)
  );
*/

-- ───────────────────────────────────────────────────────────────────
-- 🛡️ CONSTRAINT & TRIGGER MANAGEMENT
-- ───────────────────────────────────────────────────────────────────

-- 12. Temporarily disable validation trigger (for bulk operations)
ALTER TABLE public.businesses DISABLE TRIGGER validate_business_owner_trigger;

-- 13. Re-enable validation trigger
ALTER TABLE public.businesses ENABLE TRIGGER validate_business_owner_trigger;

-- 14. Temporarily disable auto-set trigger
ALTER TABLE public.businesses DISABLE TRIGGER auto_set_business_owner_trigger;

-- 15. Re-enable auto-set trigger
ALTER TABLE public.businesses ENABLE TRIGGER auto_set_business_owner_trigger;

-- 16. View all triggers on businesses table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'businesses'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 17. View constraints on businesses table
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.businesses'::regclass
ORDER BY conname;

-- ───────────────────────────────────────────────────────────────────
-- 🧪 TESTING QUERIES
-- ───────────────────────────────────────────────────────────────────

-- 18. Test if you can see businesses (as logged-in user)
-- Run this after logging in via Supabase Auth
SELECT *
FROM public.businesses
WHERE owner_id = auth.uid();

-- 19. Test RLS policy (should only return your business)
SELECT 
    b.*,
    auth.uid() as current_user_id,
    CASE 
        WHEN b.owner_id = auth.uid() THEN 'Visible (owner match)'
        ELSE 'Hidden (RLS blocked)'
    END as rls_status
FROM public.businesses b;

-- 20. Create test business using safe function
-- Replace parameters with your test data
/*
SELECT public.create_business_safe(
    p_business_id := gen_random_uuid()::text,
    p_business_name := 'Test Business',
    p_owner_id := auth.uid(),
    p_country := 'Kenya',
    p_currency := 'KES',
    p_subscription_plan := 'Free Trial'
);
*/

-- ───────────────────────────────────────────────────────────────────
-- 📊 ANALYTICS & REPORTING
-- ───────────────────────────────────────────────────────────────────

-- 21. Businesses created per day (last 30 days)
SELECT 
    DATE(created_at) as creation_date,
    COUNT(*) as businesses_created,
    COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_valid_owner
FROM public.businesses
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY creation_date DESC;

-- 22. Businesses by country with owner status
SELECT 
    country,
    COUNT(*) as total,
    COUNT(CASE WHEN owner_id IS NOT NULL AND owner_id IN (SELECT id FROM auth.users) THEN 1 END) as valid_owner,
    COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as null_owner,
    COUNT(CASE WHEN owner_id IS NOT NULL AND owner_id NOT IN (SELECT id FROM auth.users) THEN 1 END) as invalid_owner
FROM public.businesses
GROUP BY country
ORDER BY total DESC;

-- 23. Find businesses with multiple owners (should be 0)
SELECT 
    b.id,
    b.name,
    COUNT(DISTINCT p.id) as owner_count,
    array_agg(DISTINCT p.email) as owner_emails
FROM public.businesses b
JOIN public.profiles p ON p.business_id = b.id
WHERE p.role = 'Business Owner'
GROUP BY b.id, b.name
HAVING COUNT(DISTINCT p.id) > 1;

-- ───────────────────────────────────────────────────────────────────
-- 💡 USAGE EXAMPLES
-- ───────────────────────────────────────────────────────────────────

/*
EXAMPLE WORKFLOW 1: Diagnose and Fix All Issues
-----------------------------------------------
1. Run query #4 to see overall health
2. Run query #1 to find NULL owner_ids
3. Run query #7 to fix them
4. Run query #4 again to verify

EXAMPLE WORKFLOW 2: Fix Specific Business
-----------------------------------------
1. Run query #5 to find your business
2. Copy the business ID
3. Run query #9 with that ID
4. Verify with query #18

EXAMPLE WORKFLOW 3: Bulk Cleanup
---------------------------------
1. Run query #4 for baseline
2. Run query #12 to disable triggers (if needed)
3. Run query #7 and #8 to fix issues
4. Run query #13 to re-enable triggers
5. Run query #4 to verify

EXAMPLE WORKFLOW 4: Test After Fix
-----------------------------------
1. Log in to your app
2. Open Supabase SQL Editor
3. Run query #18 (should see your business)
4. Run query #19 (should show "Visible" status)
5. Try creating a test business with query #20
*/

-- ═══════════════════════════════════════════════════════════════════
-- END OF QUICK FIXES
-- ═══════════════════════════════════════════════════════════════════
