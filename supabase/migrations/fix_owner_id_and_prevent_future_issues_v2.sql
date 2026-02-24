-- ═══════════════════════════════════════════════════════════════════
-- COMPREHENSIVE FIX FOR OWNER_ID MISMATCH + PREVENTION
-- ═══════════════════════════════════════════════════════════════════
-- This script will:
-- 1. Diagnose current owner_id issues
-- 2. Fix mismatched/NULL owner_id values
-- 3. Add constraints to prevent future issues
-- 4. Create triggers for automatic validation
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- STEP 1: DIAGNOSTIC QUERIES (Run these first to see the problem)
-- ───────────────────────────────────────────────────────────────────

-- 1.1 Find businesses with NULL owner_id
DO $$
DECLARE
    null_count INTEGER;
    r RECORD;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM public.businesses
    WHERE owner_id IS NULL;
    
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'DIAGNOSTIC REPORT: Businesses with NULL owner_id';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'Count: %', null_count;
    
    IF null_count > 0 THEN
        RAISE NOTICE 'Details:';
        FOR r IN (
            SELECT id, name, created_at, country
            FROM public.businesses
            WHERE owner_id IS NULL
            ORDER BY created_at DESC
        ) LOOP
            RAISE NOTICE '  - ID: %, Name: %, Created: %', r.id, r.name, r.created_at;
        END LOOP;
    END IF;
END $$;

-- 1.2 Find businesses where owner_id doesn't match any auth user
DO $$
DECLARE
    orphan_count INTEGER;
    r RECORD;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM public.businesses b
    WHERE b.owner_id IS NOT NULL
      AND b.owner_id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'DIAGNOSTIC REPORT: Businesses with invalid owner_id';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'Count: %', orphan_count;
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Details:';
        FOR r IN (
            SELECT b.id, b.name, b.owner_id, b.created_at
            FROM public.businesses b
            WHERE b.owner_id IS NOT NULL
              AND b.owner_id NOT IN (SELECT id FROM auth.users)
            ORDER BY b.created_at DESC
        ) LOOP
            RAISE NOTICE '  - ID: %, Name: %, Invalid owner_id: %', r.id, r.name, r.owner_id;
        END LOOP;
    END IF;
END $$;

-- 1.3 Find businesses where owner has no profile
DO $$
DECLARE
    no_profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO no_profile_count
    FROM public.businesses b
    LEFT JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.owner_id IS NOT NULL
      AND p.id IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'DIAGNOSTIC REPORT: Businesses where owner has no profile';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'Count: %', no_profile_count;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 2: FIX EXISTING DATA
-- ───────────────────────────────────────────────────────────────────

-- 2.1 Fix businesses with NULL owner_id by matching with profiles
DO $$
DECLARE
    fixed_count INTEGER := 0;
    r RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'FIXING: Businesses with NULL owner_id';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    
    -- Try to match by business_id in profiles where role = 'Business Owner'
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
    ) LOOP
        UPDATE public.businesses
        SET owner_id = r.profile_id
        WHERE id = r.business_id;
        
        fixed_count := fixed_count + 1;
        RAISE NOTICE 'Fixed: Business "%" (%) -> owner_id set to % (%)', 
            r.business_name, r.business_id, r.profile_id, r.profile_email;
    END LOOP;
    
    RAISE NOTICE 'Total fixed (NULL -> matched owner): %', fixed_count;
END $$;

-- 2.2 Fix businesses with invalid owner_id (not in auth.users)
DO $$
DECLARE
    fixed_count INTEGER := 0;
    r RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'FIXING: Businesses with invalid owner_id';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    
    -- Try to match by business_id in profiles
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
        RAISE NOTICE 'Fixed: Business "%" (%) -> owner_id changed from % to % (%)', 
            r.business_name, r.business_id, r.old_owner_id, r.profile_id, r.profile_email;
    END LOOP;
    
    RAISE NOTICE 'Total fixed (invalid -> valid owner): %', fixed_count;
END $$;

-- 2.3 Handle edge case: Businesses that still have NULL owner_id after matching attempt
DO $$
DECLARE
    remaining_count INTEGER;
    r RECORD;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM public.businesses
    WHERE owner_id IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'REMAINING ISSUES: Businesses still with NULL owner_id';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'Count: %', remaining_count;
    
    IF remaining_count > 0 THEN
        RAISE WARNING 'WARNING: % businesses still have NULL owner_id and could not be auto-fixed.', remaining_count;
        RAISE WARNING 'These businesses may need manual intervention or should be deleted.';
        
        -- Log them for manual review
        FOR r IN (
            SELECT id, name, created_at
            FROM public.businesses
            WHERE owner_id IS NULL
        ) LOOP
            RAISE WARNING '  - Business ID: %, Name: %, Created: %', r.id, r.name, r.created_at;
        END LOOP;
    ELSE
        RAISE NOTICE 'All businesses have valid owner_id! ✓';
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 3: ADD CONSTRAINTS TO PREVENT FUTURE ISSUES
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'PREVENTION: Adding database constraints';
    RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- 3.1 Make owner_id NOT NULL (after fixing existing data)
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM public.businesses
    WHERE owner_id IS NULL;
    
    IF null_count = 0 THEN
        -- Safe to add NOT NULL constraint
        ALTER TABLE public.businesses 
        ALTER COLUMN owner_id SET NOT NULL;
        
        RAISE NOTICE '✓ Added NOT NULL constraint on businesses.owner_id';
    ELSE
        RAISE WARNING '✗ Cannot add NOT NULL constraint: % businesses still have NULL owner_id', null_count;
        RAISE WARNING '  Please fix or delete these businesses first.';
    END IF;
END $$;

-- 3.2 Add foreign key constraint with CASCADE (if not exists)
DO $$
BEGIN
    -- First, drop existing constraint if it exists
    ALTER TABLE public.businesses 
    DROP CONSTRAINT IF EXISTS businesses_owner_id_fkey;
    
    -- Add new constraint with ON DELETE CASCADE
    ALTER TABLE public.businesses
    ADD CONSTRAINT businesses_owner_id_fkey 
    FOREIGN KEY (owner_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✓ Added/Updated foreign key constraint with CASCADE on businesses.owner_id';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '✗ Could not add foreign key constraint: %', SQLERRM;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 4: CREATE TRIGGER TO VALIDATE OWNER_ID ON INSERT/UPDATE
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'PREVENTION: Creating validation trigger';
    RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- 4.1 Create function to validate owner_id
CREATE OR REPLACE FUNCTION public.validate_business_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure owner_id is not NULL
    IF NEW.owner_id IS NULL THEN
        RAISE EXCEPTION 'owner_id cannot be NULL for business "%"', NEW.name;
    END IF;
    
    -- Ensure owner_id exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.owner_id) THEN
        RAISE EXCEPTION 'owner_id "%" does not exist in auth.users', NEW.owner_id;
    END IF;
    
    -- Ensure owner has a profile (optional, but recommended)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.owner_id) THEN
        RAISE WARNING 'owner_id "%" exists in auth but has no profile yet', NEW.owner_id;
        -- Don't block, just warn - profile might be created later
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Create trigger on businesses table
DROP TRIGGER IF EXISTS validate_business_owner_trigger ON public.businesses;

CREATE TRIGGER validate_business_owner_trigger
    BEFORE INSERT OR UPDATE OF owner_id ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_business_owner_id();

DO $$
BEGIN
    RAISE NOTICE '✓ Created validation trigger on businesses table';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 5: CREATE TRIGGER TO AUTO-SET owner_id FROM CONTEXT
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'PREVENTION: Creating auto-set owner_id trigger';
    RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- 5.1 Create function to auto-set owner_id if NULL
CREATE OR REPLACE FUNCTION public.auto_set_business_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If owner_id is NULL, try to set it to the current auth user
    IF NEW.owner_id IS NULL THEN
        NEW.owner_id := auth.uid();
        
        IF NEW.owner_id IS NULL THEN
            RAISE EXCEPTION 'Cannot create business: owner_id is NULL and no authenticated user found';
        END IF;
        
        RAISE NOTICE 'Auto-set owner_id to current user: %', NEW.owner_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Create trigger (runs BEFORE validation trigger)
DROP TRIGGER IF EXISTS auto_set_business_owner_trigger ON public.businesses;

CREATE TRIGGER auto_set_business_owner_trigger
    BEFORE INSERT ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_business_owner_id();

DO $$
BEGIN
    RAISE NOTICE '✓ Created auto-set trigger on businesses table';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 6: CREATE HELPER FUNCTION FOR SAFE BUSINESS CREATION
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'HELPER: Creating safe business creation function';
    RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- 6.1 Create function for safe business creation
CREATE OR REPLACE FUNCTION public.create_business_safe(
    p_business_id TEXT,
    p_business_name TEXT,
    p_owner_id UUID DEFAULT NULL,
    p_country TEXT DEFAULT 'Kenya',
    p_currency TEXT DEFAULT 'KES',
    p_subscription_plan TEXT DEFAULT 'Free Trial'
)
RETURNS UUID AS $$
DECLARE
    v_owner_id UUID;
    v_business_id TEXT;
BEGIN
    -- Use provided owner_id or fall back to auth.uid()
    v_owner_id := COALESCE(p_owner_id, auth.uid());
    
    -- Validate owner exists
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create business: No owner_id provided and no authenticated user';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_owner_id) THEN
        RAISE EXCEPTION 'Cannot create business: owner_id "%" does not exist in auth.users', v_owner_id;
    END IF;
    
    -- Check if owner already has a business
    SELECT id INTO v_business_id
    FROM public.businesses
    WHERE owner_id = v_owner_id
    LIMIT 1;
    
    IF v_business_id IS NOT NULL THEN
        RAISE NOTICE 'Owner already has business: %', v_business_id;
        RETURN v_business_id::UUID;
    END IF;
    
    -- Create the business
    INSERT INTO public.businesses (
        id,
        name,
        owner_id,
        country,
        currency,
        subscription_plan,
        subscription_status,
        trial_ends_at,
        created_at
    ) VALUES (
        p_business_id,
        p_business_name,
        v_owner_id,
        p_country,
        p_currency,
        p_subscription_plan,
        'trial',
        NOW() + INTERVAL '30 days',
        NOW()
    );
    
    RAISE NOTICE 'Created business: % for owner: %', p_business_id, v_owner_id;
    
    RETURN p_business_id::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    RAISE NOTICE '✓ Created create_business_safe() helper function';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 7: FINAL VERIFICATION
-- ───────────────────────────────────────────────────────────────────

DO $$
DECLARE
    total_businesses INTEGER;
    valid_businesses INTEGER;
    invalid_businesses INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    
    SELECT COUNT(*) INTO total_businesses FROM public.businesses;
    SELECT COUNT(*) INTO valid_businesses 
    FROM public.businesses 
    WHERE owner_id IS NOT NULL 
      AND owner_id IN (SELECT id FROM auth.users);
    
    invalid_businesses := total_businesses - valid_businesses;
    
    RAISE NOTICE 'Total businesses: %', total_businesses;
    RAISE NOTICE 'Valid businesses: % (%.1f%%)', 
        valid_businesses, 
        CASE WHEN total_businesses > 0 THEN (valid_businesses::FLOAT / total_businesses * 100) ELSE 0 END;
    RAISE NOTICE 'Invalid businesses: %', invalid_businesses;
    
    IF invalid_businesses = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✓✓✓ SUCCESS! All businesses have valid owner_id ✓✓✓';
    ELSE
        RAISE WARNING '';
        RAISE WARNING '✗✗✗ WARNING! % businesses still have invalid owner_id ✗✗✗', invalid_businesses;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'MIGRATION COMPLETE!';
    RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
