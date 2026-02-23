-- ═══════════════════════════════════════════════════════════════════
-- TILLSUP COMPLETE DATABASE SETUP
-- ═══════════════════════════════════════════════════════════════════
-- Run this in Supabase Dashboard > SQL Editor
-- This sets up all required tables for Tillsup POS system
-- ═══════════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE (Users/Staff)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL,
    role_id UUID,
    business_id UUID NOT NULL,
    branch_id UUID,
    can_create_expense BOOLEAN DEFAULT false,
    must_change_password BOOLEAN DEFAULT false,
    salary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    pin_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    retail_price NUMERIC(10, 2),
    cost_price NUMERIC(10, 2),
    wholesale_price NUMERIC(10, 2),
    stock INTEGER NOT NULL DEFAULT 0,
    sku TEXT NOT NULL,
    supplier TEXT,
    image TEXT,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STAFF INVITES TABLE
CREATE TABLE IF NOT EXISTS public.staff_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    branch_id UUID,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    status TEXT DEFAULT 'pending',
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON public.suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON public.inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON public.inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);

CREATE INDEX IF NOT EXISTS idx_staff_invites_business_id ON public.staff_invites(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON public.staff_invites(email);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_sku_branch_unique 
ON public.inventory(business_id, branch_id, sku);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) - SIMPLIFIED VERSION
-- ═══════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.suppliers;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.inventory;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.staff_invites;

-- ═══════════════════════════════════════════════════════════════════
-- PROFILES TABLE RLS POLICIES
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

-- ═══════════════════════════════════════════════════════════════════
-- OTHER TABLES - SIMPLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

-- Simple policies for authenticated users (allows all operations)
CREATE POLICY "Allow authenticated users full access"
ON public.suppliers FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access"
ON public.inventory FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access"
ON public.staff_invites FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- STORAGE BUCKET SETUP (for product images)
-- ═══════════════════════════════════════════════════════════════════

-- Create storage bucket for inventory images
INSERT INTO storage.buckets (id, name, public)
VALUES ('Inventoryimages', 'Inventoryimages', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Inventoryimages');

CREATE POLICY IF NOT EXISTS "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Inventoryimages');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Inventoryimages')
WITH CHECK (bucket_id = 'Inventoryimages');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Inventoryimages');