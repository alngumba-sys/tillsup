-- Enable Row Level Security (RLS) on tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════
-- BUSINESSES POLICIES
-- ════════════════════════════════════════════════════════════════

-- Allow authenticated users to create a new business
-- They must be the owner of the business they are creating
DROP POLICY IF EXISTS "Authenticated users can create business" ON public.businesses;
CREATE POLICY "Authenticated users can create business" ON public.businesses
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = owner_id);

-- Allow business owners to view their own business
DROP POLICY IF EXISTS "Owners can view their business" ON public.businesses;
CREATE POLICY "Owners can view their business" ON public.businesses
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = owner_id);

-- Allow business owners to update their own business
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
CREATE POLICY "Owners can update their business" ON public.businesses
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = owner_id);

-- ════════════════════════════════════════════════════════════════
-- PROFILES POLICIES
-- ════════════════════════════════════════════════════════════════

-- Allow users to insert their own profile (during registration)
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- Allow Business Owners to view profiles of staff in their business
DROP POLICY IF EXISTS "Business owners can view staff profiles" ON public.profiles;
CREATE POLICY "Business owners can view staff profiles" ON public.profiles
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = profiles.business_id 
      AND businesses.owner_id = auth.uid()
    )
  );

-- Allow Business Owners to update profiles of staff in their business (e.g. changing roles)
DROP POLICY IF EXISTS "Business owners can update staff profiles" ON public.profiles;
CREATE POLICY "Business owners can update staff profiles" ON public.profiles
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = profiles.business_id 
      AND businesses.owner_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- BRANCHES POLICIES
-- ════════════════════════════════════════════════════════════════

-- Allow business owners to manage branches
DROP POLICY IF EXISTS "Business owners can manage branches" ON public.branches;
CREATE POLICY "Business owners can manage branches" ON public.branches
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = branches.business_id 
      AND businesses.owner_id = auth.uid()
    )
  );

-- Allow staff to view branches they are assigned to (optional, if staff need to see branch info)
DROP POLICY IF EXISTS "Staff can view their branch" ON public.branches;
CREATE POLICY "Staff can view their branch" ON public.branches
  FOR SELECT 
  TO authenticated 
  USING (
    id IN (
      SELECT branch_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- GENERIC TEMPLATE FOR OTHER TABLES (e.g. products, sales)
-- ════════════════════════════════════════════════════════════════
-- Replace 'table_name' with your actual table name
-- Ensure your table has a 'business_id' column to link data to a business

-- CREATE POLICY "Users can view data from their business" ON public.table_name
--   FOR SELECT 
--   TO authenticated 
--   USING (
--     business_id IN (
--       SELECT business_id FROM public.profiles WHERE id = auth.uid()
--     )
--   );

-- CREATE POLICY "Users can insert data into their business" ON public.table_name
--   FOR INSERT 
--   TO authenticated 
--   WITH CHECK (
--     business_id IN (
--       SELECT business_id FROM public.profiles WHERE id = auth.uid()
--     )
--   );
