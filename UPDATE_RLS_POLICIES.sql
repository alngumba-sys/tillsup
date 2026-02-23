-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP RLS POLICY UPDATE
-- ═══════════════════════════════════════════════════════════════════
-- Run this ONLY if you're getting "row-level security policy" errors
-- when creating staff members with passwords.
-- 
-- This updates the profiles table RLS policies to allow Business Owners
-- and Managers to create staff profiles.
-- ═══════════════════════════════════════════════════════════════════

-- Drop old simple policy
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.profiles;

-- ═══════════════════════════════════════════════════════════════════
-- NEW ROLE-BASED POLICIES FOR PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════════

-- Allow users to read profiles in their business
CREATE POLICY "Users can view profiles in their business"
ON public.profiles FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow Business Owners and Managers to insert new profiles (for staff creation)
CREATE POLICY "Admins can create staff profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if the current user is a Business Owner or Manager in the same business
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND business_id = profiles.business_id
    AND role IN ('Business Owner', 'Manager')
  )
  -- OR allow users to create their own profile (for registration)
  OR id = auth.uid()
);

-- Allow Business Owners to delete staff profiles
CREATE POLICY "Business Owners can delete staff"
ON public.profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND business_id = profiles.business_id
    AND role = 'Business Owner'
  )
  AND id != auth.uid() -- Cannot delete yourself
);
