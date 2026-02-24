-- ═══════════════════════════════════════════════════════════════════
-- ⚡ COPY THIS ENTIRE FILE → PASTE IN SUPABASE → CLICK RUN
-- ═══════════════════════════════════════════════════════════════════
-- This will PERMANENTLY fix the timeout in 30 seconds
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: See the current problem
SELECT 
    id,
    name,
    owner_id,
    CASE 
        WHEN owner_id IS NULL THEN '❌ NULL - CAUSING TIMEOUT'
        ELSE '✓ Has owner_id'
    END as status
FROM businesses
ORDER BY created_at DESC;

-- STEP 2: Fix all businesses with NULL owner_id
UPDATE businesses b
SET owner_id = (
    SELECT p.id 
    FROM profiles p 
    WHERE p.business_id = b.id 
    AND p.role = 'Business Owner'
    LIMIT 1
)
WHERE b.owner_id IS NULL;

-- STEP 3: Verify the fix
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅✅✅ ALL FIXED! Refresh browser and login now!'
        ELSE '❌ Still have ' || COUNT(*) || ' problems - see below'
    END as result
FROM businesses 
WHERE owner_id IS NULL;

-- STEP 4: If still problems, show them
SELECT 
    id,
    name,
    owner_id,
    '❌ NO OWNER' as issue
FROM businesses 
WHERE owner_id IS NULL;

-- STEP 5: Manual fix for YOUR business (run this if above didn't work)
-- This sets YOUR current business to YOUR user ID
UPDATE businesses 
SET owner_id = auth.uid()
WHERE id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
);

-- STEP 6: Final verification
SELECT 
    b.id,
    b.name,
    b.owner_id,
    p.email as owner_email,
    '✅ FIXED' as status
FROM businesses b
LEFT JOIN profiles p ON p.id = b.owner_id
WHERE b.owner_id IS NOT NULL
ORDER BY b.created_at DESC;
