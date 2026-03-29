-- ═══════════════════════════════════════════════════════════════════
-- FIX: Set admin@tillsup.internal as Super Admin and add RLS bypass
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Add is_super_admin column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Step 2: Set admin@tillsup.internal as super admin
UPDATE public.profiles 
SET is_super_admin = true 
WHERE email = 'admin@tillsup.internal';

-- Verify the update worked
SELECT id, email, role, is_super_admin 
FROM public.profiles 
WHERE email = 'admin@tillsup.internal';

-- Step 3: Drop conflicting update policies
DROP POLICY IF EXISTS "Users can update their own business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
DROP POLICY IF EXISTS "Super Admin can update all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Super Admins can manage all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Super Admins can manage all businesses v2" ON public.businesses;
DROP POLICY IF EXISTS "Super Admin bypass update" ON public.businesses;

-- Step 4: Recreate owner update policy
CREATE POLICY "Owners can update their business" ON public.businesses
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (true);

-- Step 5: Add Super Admin bypass for UPDATE
CREATE POLICY "Super Admin bypass update" ON public.businesses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  )
  WITH CHECK (true);

-- Step 6: Drop conflicting select policies
DROP POLICY IF EXISTS "Users can view their own business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can view their business" ON public.businesses;
DROP POLICY IF EXISTS "Super Admin can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Super Admin bypass select" ON public.businesses;

-- Step 7: Recreate owner select policy
CREATE POLICY "Owners can view their business" ON public.businesses
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

-- Step 8: Add Super Admin bypass for SELECT
CREATE POLICY "Super Admin bypass select" ON public.businesses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Step 9: Refresh schema cache
NOTIFY pgrst, 'reload schema';
