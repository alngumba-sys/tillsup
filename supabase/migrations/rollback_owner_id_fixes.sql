-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK SCRIPT: Owner ID Fixes
-- ═══════════════════════════════════════════════════════════════════
-- Use this script to rollback changes made by fix_owner_id_and_prevent_future_issues.sql
-- ⚠️ WARNING: Only run this if you need to undo the protections
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'STARTING ROLLBACK OF OWNER_ID PROTECTIONS';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 1: Remove Triggers
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE 'Step 1: Removing triggers...';
    
    -- Drop validation trigger
    DROP TRIGGER IF EXISTS validate_business_owner_trigger ON public.businesses;
    RAISE NOTICE '  ✓ Dropped validate_business_owner_trigger';
    
    -- Drop auto-set trigger
    DROP TRIGGER IF EXISTS auto_set_business_owner_trigger ON public.businesses;
    RAISE NOTICE '  ✓ Dropped auto_set_business_owner_trigger';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '  ✗ Error removing triggers: %', SQLERRM;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 2: Remove Functions
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Step 2: Removing functions...';
    
    -- Drop validation function
    DROP FUNCTION IF EXISTS public.validate_business_owner_id() CASCADE;
    RAISE NOTICE '  ✓ Dropped validate_business_owner_id()';
    
    -- Drop auto-set function
    DROP FUNCTION IF EXISTS public.auto_set_business_owner_id() CASCADE;
    RAISE NOTICE '  ✓ Dropped auto_set_business_owner_id()';
    
    -- Drop safe creation function
    DROP FUNCTION IF EXISTS public.create_business_safe(text, text, uuid, text, text, text) CASCADE;
    RAISE NOTICE '  ✓ Dropped create_business_safe()';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '  ✗ Error removing functions: %', SQLERRM;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 3: Remove Constraints (BUT KEEP FOREIGN KEY!)
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Step 3: Removing constraints...';
    
    -- Remove NOT NULL constraint on owner_id
    -- ⚠️ This allows NULL owner_ids again (which caused the original problem!)
    ALTER TABLE public.businesses 
    ALTER COLUMN owner_id DROP NOT NULL;
    RAISE NOTICE '  ✓ Removed NOT NULL constraint on owner_id';
    RAISE WARNING '  ⚠️  WARNING: owner_id can now be NULL again!';
    
    -- OPTIONAL: Remove foreign key constraint
    -- Commented out by default - uncomment if you really need to remove it
    /*
    ALTER TABLE public.businesses 
    DROP CONSTRAINT IF EXISTS businesses_owner_id_fkey;
    RAISE NOTICE '  ✓ Removed foreign key constraint';
    RAISE WARNING '  ⚠️  WARNING: owner_id can now reference non-existent users!';
    */
    RAISE NOTICE '  ℹ️  Keeping foreign key constraint (recommended)';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '  ✗ Error removing constraints: %', SQLERRM;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 4: Verification
-- ───────────────────────────────────────────────────────────────────

DO $$
DECLARE
    trigger_count INTEGER;
    function_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'ROLLBACK VERIFICATION';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    
    -- Check triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE event_object_table = 'businesses'
      AND event_object_schema = 'public'
      AND trigger_name IN ('validate_business_owner_trigger', 'auto_set_business_owner_trigger');
    
    -- Check functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('validate_business_owner_id', 'auto_set_business_owner_id', 'create_business_safe');
    
    RAISE NOTICE 'Remaining triggers: % (should be 0)', trigger_count;
    RAISE NOTICE 'Remaining functions: % (should be 0)', function_count;
    
    IF trigger_count = 0 AND function_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✓ Rollback successful - all protections removed';
    ELSE
        RAISE WARNING '';
        RAISE WARNING '✗ Rollback incomplete - some objects still exist';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Current state:';
    RAISE NOTICE '  - owner_id can be NULL: YES';
    RAISE NOTICE '  - owner_id must reference auth.users: %', 
        CASE WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'public.businesses'::regclass 
            AND conname = 'businesses_owner_id_fkey'
        ) THEN 'YES (FK still exists)' ELSE 'NO' END;
    RAISE NOTICE '  - Validation triggers: REMOVED';
    RAISE NOTICE '  - Auto-set triggers: REMOVED';
    RAISE NOTICE '  - Safe creation function: REMOVED';
    
END $$;

-- ───────────────────────────────────────────────────────────────────
-- STEP 5: Recommendations
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'ROLLBACK COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE WARNING '⚠️  IMPORTANT WARNINGS:';
    RAISE WARNING '';
    RAISE WARNING '1. owner_id can now be NULL - this may cause login timeouts!';
    RAISE WARNING '2. No automatic validation - bad data can be inserted';
    RAISE WARNING '3. Your application code must ensure owner_id is always set';
    RAISE WARNING '4. Monitor your database for NULL/invalid owner_ids';
    RAISE WARNING '';
    RAISE NOTICE 'Recommendations:';
    RAISE NOTICE '  - Keep the foreign key constraint (provides basic protection)';
    RAISE NOTICE '  - Add application-level validation for owner_id';
    RAISE NOTICE '  - Run regular health checks (see owner_id_quick_fixes.sql)';
    RAISE NOTICE '  - Consider re-applying the protections if issues occur';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- ALTERNATIVE: Partial Rollback (Keep Some Protections)
-- ═══════════════════════════════════════════════════════════════════

/*
If you only want to remove specific protections, use these instead:

-- Remove ONLY the auto-set trigger (manual control)
DROP TRIGGER IF EXISTS auto_set_business_owner_trigger ON public.businesses;
DROP FUNCTION IF EXISTS public.auto_set_business_owner_id();

-- Remove ONLY the validation trigger (allow more flexibility)
DROP TRIGGER IF EXISTS validate_business_owner_trigger ON public.businesses;
DROP FUNCTION IF EXISTS public.validate_business_owner_id();

-- Remove ONLY the NOT NULL constraint (allow NULL temporarily)
ALTER TABLE public.businesses ALTER COLUMN owner_id DROP NOT NULL;

-- KEEP these (recommended):
-- ✓ Foreign key constraint (prevents invalid user references)
-- ✓ Safe creation function (provides option for safe inserts)
*/

-- ═══════════════════════════════════════════════════════════════════
-- RE-APPLY PROTECTIONS (If you change your mind)
-- ═══════════════════════════════════════════════════════════════════

/*
To re-apply the protections after rollback:

1. Run the fix_owner_id_and_prevent_future_issues.sql script again
2. It will re-create all triggers, functions, and constraints
3. Make sure all businesses have valid owner_id first!

Quick check before re-applying:
*/

-- Verify no NULL or invalid owner_ids before re-applying protections
DO $$
DECLARE
    null_count INTEGER;
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM public.businesses
    WHERE owner_id IS NULL;
    
    SELECT COUNT(*) INTO invalid_count
    FROM public.businesses
    WHERE owner_id IS NOT NULL
      AND owner_id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE '';
    RAISE NOTICE 'Pre-check before re-applying protections:';
    RAISE NOTICE '  Businesses with NULL owner_id: %', null_count;
    RAISE NOTICE '  Businesses with invalid owner_id: %', invalid_count;
    
    IF null_count > 0 OR invalid_count > 0 THEN
        RAISE WARNING '';
        RAISE WARNING '⚠️  Cannot safely re-apply NOT NULL constraint!';
        RAISE WARNING '    Fix these issues first using owner_id_quick_fixes.sql';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✓ Safe to re-apply protections';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- END OF ROLLBACK SCRIPT
-- ═══════════════════════════════════════════════════════════════════
