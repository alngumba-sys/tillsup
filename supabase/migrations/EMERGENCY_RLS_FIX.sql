-- ═══════════════════════════════════════════════════════════════════
-- EMERGENCY FIX: Super Admin RLS bypass for businesses table
-- Run this ENTIRE script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Add is_super_admin column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Step 2: Set admin@tillsup.internal as super admin
UPDATE public.profiles 
SET is_super_admin = true 
WHERE email = 'admin@tillsup.internal';

-- Step 3: Verify the admin was updated (should return 1 row)
SELECT id, email, role, is_super_admin 
FROM public.profiles 
WHERE email = 'admin@tillsup.internal';

-- Step 4: DISABLE RLS temporarily to clear all policies
ALTER TABLE public.businesses DISABLE ROW LEVEL SECURITY;

-- Step 5: Drop ALL existing policies
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'businesses' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.businesses', pol.policyname);
    END LOOP;
END $$;

-- Step 6: Re-enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Step 7: Create simple, working policies

-- Allow EVERYONE to read businesses (for now - we can restrict later)
CREATE POLICY "Allow all select" ON public.businesses
  FOR SELECT USING (true);

-- Allow owners to update their own business
CREATE POLICY "Owners update own" ON public.businesses
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (true);

-- Allow super admins to update ANY business (THIS IS THE KEY FIX)
CREATE POLICY "Super admins update all" ON public.businesses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  )
  WITH CHECK (true);

-- Allow owners to insert businesses
CREATE POLICY "Owners insert" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Step 8: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 9: Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'businesses';
