-- ═══════════════════════════════════════════════════════════════════
-- COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- THEN CLICK "RUN" - FIXES LOGIN TIMEOUT IN 30 SECONDS
-- ═══════════════════════════════════════════════════════════════════

-- Fix NULL owner_ids (main cause of timeout)
UPDATE businesses b SET owner_id = (SELECT p.id FROM profiles p WHERE p.business_id = b.id AND p.role = 'Business Owner' AND p.id IN (SELECT id FROM auth.users) LIMIT 1) WHERE b.owner_id IS NULL;

-- Fix invalid owner_ids
UPDATE businesses b SET owner_id = (SELECT p.id FROM profiles p WHERE p.business_id = b.id AND p.role = 'Business Owner' AND p.id IN (SELECT id FROM auth.users) LIMIT 1) WHERE b.owner_id NOT IN (SELECT id FROM auth.users);

-- Verify
SELECT CASE WHEN COUNT(*) = 0 THEN '✓✓✓ FIXED! Clear browser cache and try login again.' ELSE '❌ Still have ' || COUNT(*) || ' problems. Run full script.' END as result FROM businesses WHERE owner_id IS NULL OR owner_id NOT IN (SELECT id FROM auth.users);
