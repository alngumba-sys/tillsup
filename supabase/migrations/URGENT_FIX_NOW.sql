-- ═══════════════════════════════════════════════════════════════════
-- URGENT: Fix Business Timeout Errors NOW
-- ═══════════════════════════════════════════════════════════════════
-- Run this entire script in Supabase SQL Editor
-- This will diagnose and fix the owner_id issues causing timeouts
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Quick Diagnosis
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
    null_count INTEGER;
    invalid_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.businesses;
    SELECT COUNT(*) INTO null_count FROM public.businesses WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO invalid_count 
    FROM public.businesses 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'DIAGNOSIS: Current State';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'Total businesses: %', total_count;
    RAISE NOTICE 'Businesses with NULL owner_id: %', null_count;
    RAISE NOTICE 'Businesses with invalid owner_id: %', invalid_count;
    RAISE NOTICE 'Issues to fix: %', (null_count + invalid_count);
    RAISE NOTICE '';
END $$;

-- STEP 2: Show Problematic Businesses
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Problematic businesses:';
    FOR r IN (
        SELECT id, name, owner_id, created_at
        FROM public.businesses
        WHERE owner_id IS NULL 
           OR owner_id NOT IN (SELECT id FROM auth.users)
        ORDER BY created_at DESC
        LIMIT 10
    ) LOOP
        RAISE NOTICE '  - ID: %, Name: %, owner_id: %', r.id, r.name, COALESCE(r.owner_id::TEXT, 'NULL');
    END LOOP;
    RAISE NOTICE '';
END $$;

-- STEP 3: Fix NULL owner_id by matching with profiles
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
    fixed_count INTEGER := 0;
    r RECORD;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'FIXING: Businesses with NULL owner_id';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    
    FOR r IN (
        SELECT 
            b.id as business_id,
            b.name as business_name,
            p.id as profile_id,
            p.email as profile_email
        FROM public.businesses b
        INNER JOIN public.profiles p ON p.business_id = b.id
        WHERE b.owner_id IS NULL
          AND p.role = 'Business Owner'
          AND p.id IN (SELECT id FROM auth.users)
    ) LOOP
        UPDATE public.businesses
        SET owner_id = r.profile_id
        WHERE id = r.business_id;
        
        fixed_count := fixed_count + 1;
        RAISE NOTICE 'Fixed: "%" -> owner: % (%)', r.business_name, r.profile_id, r.profile_email;
    END LOOP;
    
    RAISE NOTICE 'Total fixed: %', fixed_count;
    RAISE NOTICE '';
END $$;

-- STEP 4: Fix invalid owner_id by matching with profiles
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
    fixed_count INTEGER := 0;
    r RECORD;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'FIXING: Businesses with invalid owner_id';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    
    FOR r IN (
        SELECT 
            b.id as business_id,
            b.name as business_name,
            b.owner_id as old_owner_id,
            p.id as profile_id,
            p.email as profile_email
        FROM public.businesses b
        INNER JOIN public.profiles p ON p.business_id = b.id
        WHERE b.owner_id IS NOT NULL
          AND b.owner_id NOT IN (SELECT id FROM auth.users)
          AND p.role = 'Business Owner'
          AND p.id IN (SELECT id FROM auth.users)
    ) LOOP
        UPDATE public.businesses
        SET owner_id = r.profile_id
        WHERE id = r.business_id;
        
        fixed_count := fixed_count + 1;
        RAISE NOTICE 'Fixed: "%" -> owner: % (%)', r.business_name, r.profile_id, r.profile_email;
    END LOOP;
    
    RAISE NOTICE 'Total fixed: %', fixed_count;
    RAISE NOTICE '';
END $$;

-- STEP 5: Add Protections (Constraints & Triggers)
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'ADDING PROTECTIONS';
    RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- 5.1 Create auto-set trigger function
CREATE OR REPLACE FUNCTION public.auto_set_business_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NULL THEN
        NEW.owner_id := auth.uid();
        IF NEW.owner_id IS NULL THEN
            RAISE EXCEPTION 'Cannot create business: owner_id is NULL and no authenticated user found';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Create validation trigger function
CREATE OR REPLACE FUNCTION public.validate_business_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NULL THEN
        RAISE EXCEPTION 'owner_id cannot be NULL for business "%"', NEW.name;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.owner_id) THEN
        RAISE EXCEPTION 'owner_id "%" does not exist in auth.users', NEW.owner_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.3 Create triggers
DROP TRIGGER IF EXISTS auto_set_business_owner_trigger ON public.businesses;
CREATE TRIGGER auto_set_business_owner_trigger
    BEFORE INSERT ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_business_owner_id();

DROP TRIGGER IF EXISTS validate_business_owner_trigger ON public.businesses;
CREATE TRIGGER validate_business_owner_trigger
    BEFORE INSERT OR UPDATE OF owner_id ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_business_owner_id();

-- 5.4 Add foreign key constraint
DO $$
BEGIN
    ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_owner_id_fkey;
    ALTER TABLE public.businesses
    ADD CONSTRAINT businesses_owner_id_fkey 
    FOREIGN KEY (owner_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✓ Added foreign key constraint';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '✗ Could not add FK constraint: %', SQLERRM;
END $$;

-- 5.5 Add NOT NULL constraint (only if all fixed)
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM public.businesses WHERE owner_id IS NULL;
    
    IF null_count = 0 THEN
        ALTER TABLE public.businesses ALTER COLUMN owner_id SET NOT NULL;
        RAISE NOTICE '✓ Added NOT NULL constraint';
    ELSE
        RAISE WARNING '✗ Cannot add NOT NULL: % businesses still have NULL owner_id', null_count;
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✓ Created triggers for auto-validation';
    RAISE NOTICE '';
END $$;

-- STEP 6: Final Verification
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
    total INTEGER;
    valid INTEGER;
    invalid INTEGER;
BEGIN
    SELECT COUNT(*) INTO total FROM public.businesses;
    SELECT COUNT(*) INTO valid 
    FROM public.businesses 
    WHERE owner_id IS NOT NULL 
      AND owner_id IN (SELECT id FROM auth.users);
    invalid := total - valid;
    
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'Total businesses: %', total;
    RAISE NOTICE 'Valid businesses: %', valid;
    RAISE NOTICE 'Invalid businesses: %', invalid;
    
    IF invalid = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✓✓✓ SUCCESS! All businesses have valid owner_id ✓✓✓';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Log out of Tillsup';
        RAISE NOTICE '2. Log back in';
        RAISE NOTICE '3. Login should be instant (< 2 seconds)';
        RAISE NOTICE '4. Real business data should appear';
    ELSE
        RAISE WARNING '';
        RAISE WARNING '✗✗✗ WARNING! % businesses still invalid ✗✗✗', invalid;
        RAISE WARNING 'You may need to manually fix these.';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
