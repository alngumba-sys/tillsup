-- ═══════════════════════════════════════════════════════════════════
-- URGENT: Run this in Supabase SQL Editor to fix subscription extension
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Add is_super_admin column to profiles (if not exists)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Step 2: Set admin@tillsup.com as super admin
UPDATE public.profiles 
SET is_super_admin = true 
WHERE email = 'admin@tillsup.com';

-- Step 3: Drop ALL existing update policies on businesses to avoid conflicts
DROP POLICY IF EXISTS "Users can update their own business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
DROP POLICY IF EXISTS "Super Admin can update all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Super Admins can manage all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Super Admins can manage all businesses v2" ON public.businesses;

-- Step 4: Recreate the owner policy
CREATE POLICY "Owners can update their business" ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (true);

-- Step 5: Add Super Admin bypass policy (allows update ANY business)
CREATE POLICY "Super Admin bypass update" ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  )
  WITH CHECK (true);

-- Step 6: Also add Super Admin SELECT bypass (to view all businesses)
DROP POLICY IF EXISTS "Users can view their own business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can view their business" ON public.businesses;
DROP POLICY IF EXISTS "Super Admin can view all businesses" ON public.businesses;

CREATE POLICY "Owners can view their business" ON public.businesses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Super Admin bypass select" ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Step 7: Verify the admin profile
SELECT id, email, role, is_super_admin FROM public.profiles WHERE email = 'admin@tillsup.com';

-- Step 8: Refresh schema cache
NOTIFY pgrst, 'reload schema';
