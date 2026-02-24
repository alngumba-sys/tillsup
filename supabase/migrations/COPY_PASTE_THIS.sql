-- ═══════════════════════════════════════════════════════════════════
-- COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- Then click RUN button
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Fix NULL owner_ids
UPDATE public.businesses b
SET owner_id = (
    SELECT p.id 
    FROM public.profiles p 
    WHERE p.business_id = b.id 
      AND p.role = 'Business Owner'
      AND p.id IN (SELECT id FROM auth.users)
    LIMIT 1
)
WHERE b.owner_id IS NULL;

-- Step 2: Fix invalid owner_ids
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
  AND b.owner_id NOT IN (SELECT id FROM auth.users);

-- Step 3: Create protection triggers
CREATE OR REPLACE FUNCTION public.auto_set_business_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NULL THEN
        NEW.owner_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_set_business_owner_trigger ON public.businesses;
CREATE TRIGGER auto_set_business_owner_trigger
    BEFORE INSERT ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_business_owner_id();

-- Step 4: Add constraints
ALTER TABLE public.businesses 
DROP CONSTRAINT IF EXISTS businesses_owner_id_fkey;

ALTER TABLE public.businesses
ADD CONSTRAINT businesses_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Step 5: Verify
DO $$
DECLARE
    problem_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO problem_count
    FROM public.businesses
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT id FROM auth.users);
    
    IF problem_count = 0 THEN
        RAISE NOTICE '✓✓✓ SUCCESS! All businesses fixed. Log out and log back in.';
    ELSE
        RAISE WARNING 'Still have % problems. Check manually.', problem_count;
    END IF;
END $$;
