-- ═══════════════════════════════════════════════════════════════════
-- SIMPLE FIX - Just copy this entire file and paste in Supabase
-- ═══════════════════════════════════════════════════════════════════

-- Fix all businesses missing owner_id
UPDATE businesses 
SET owner_id = (
    SELECT id FROM profiles 
    WHERE business_id = businesses.id 
    AND role = 'Business Owner'
    LIMIT 1
)
WHERE owner_id IS NULL;

-- Fix YOUR business specifically
UPDATE businesses 
SET owner_id = auth.uid()
WHERE id IN (
    SELECT business_id 
    FROM profiles 
    WHERE id = auth.uid()
);

-- Show result
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ FIXED ' || COUNT(*) || ' business(es)! Refresh browser now.'
        ELSE '✅ All good! Refresh browser now.'
    END as result
FROM businesses 
WHERE owner_id = auth.uid();