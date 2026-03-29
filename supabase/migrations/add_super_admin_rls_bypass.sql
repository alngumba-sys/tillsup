-- Migration: Add Super Admin bypass policies for businesses table
-- Date: 2026-03-29
-- Purpose: Allow Super Admin to manage all businesses (extend subscriptions, change status, etc.)

-- 1. Add Super Admin SELECT policy (view all businesses)
DROP POLICY IF EXISTS "Super Admin can view all businesses" ON public.businesses;
CREATE POLICY "Super Admin can view all businesses" ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Business Owner'
      AND profiles.email = 'admin@tillsup.com'
    )
  );

-- 2. Add Super Admin UPDATE policy (update any business)
DROP POLICY IF EXISTS "Super Admin can update all businesses" ON public.businesses;
CREATE POLICY "Super Admin can update all businesses" ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Business Owner'
      AND profiles.email = 'admin@tillsup.com'
    )
  )
  WITH CHECK (true);

-- 3. Alternative: If using a is_super_admin column on profiles table
-- Uncomment and use this instead if you have an is_super_admin boolean column:

-- DROP POLICY IF EXISTS "Super Admins can manage all businesses" ON public.businesses;
-- CREATE POLICY "Super Admins can manage all businesses" ON public.businesses
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE profiles.id = auth.uid()
--       AND profiles.is_super_admin = true
--     )
--   )
--   WITH CHECK (true);

-- 4. Add is_super_admin column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 5. Set the admin@tillsup.com user as super admin
UPDATE public.profiles 
SET is_super_admin = true 
WHERE email = 'admin@tillsup.com';

-- 6. Create a more flexible Super Admin policy using is_super_admin
DROP POLICY IF EXISTS "Super Admins can manage all businesses v2" ON public.businesses;
CREATE POLICY "Super Admins can manage all businesses v2" ON public.businesses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  )
  WITH CHECK (true);

-- 7. Refresh schema cache
NOTIFY pgrst, 'reload schema';
