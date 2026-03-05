-- ═══════════════════════════════════════════════════════════════════
-- MIGRATE_SCHEMA.sql
-- Add missing columns and tables to existing Tillsup database
-- ═══════════════════════════════════════════════════════════════════
-- Run this if you already have tables but are missing some columns
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════
-- 1. BUSINESSES TABLE - Add missing columns
-- ═══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  -- Add currency column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='businesses' AND column_name='currency') THEN
    ALTER TABLE businesses ADD COLUMN currency TEXT DEFAULT 'KES';
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='businesses' AND column_name='updated_at') THEN
    ALTER TABLE businesses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. BRANCHES TABLE - Create if not exists
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. PROFILES TABLE - Add missing columns
-- ═══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  -- Add branch_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='branch_id') THEN
    ALTER TABLE profiles ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;

  -- Add can_create_expense column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='can_create_expense') THEN
    ALTER TABLE profiles ADD COLUMN can_create_expense BOOLEAN DEFAULT false;
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. CATEGORIES TABLE - Create if not exists
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_business_id_name_key'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_business_id_name_key UNIQUE(business_id, name);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. SUPPLIERS TABLE - Create if not exists
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- 6. INVENTORY TABLE - Add missing columns
-- ═══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  -- Add category_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory' AND column_name='category_id') THEN
    ALTER TABLE inventory ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  -- Add supplier_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory' AND column_name='supplier_id') THEN
    ALTER TABLE inventory ADD COLUMN supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;

  -- Add branch_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory' AND column_name='branch_id') THEN
    ALTER TABLE inventory ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;

  -- Add reorder_level column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory' AND column_name='reorder_level') THEN
    ALTER TABLE inventory ADD COLUMN reorder_level NUMERIC DEFAULT 0;
  END IF;

  -- Add unit column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory' AND column_name='unit') THEN
    ALTER TABLE inventory ADD COLUMN unit TEXT DEFAULT 'pcs';
  END IF;

  -- Add buying_price column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory' AND column_name='buying_price') THEN
    ALTER TABLE inventory ADD COLUMN buying_price NUMERIC DEFAULT 0;
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory' AND column_name='is_active') THEN
    ALTER TABLE inventory ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory' AND column_name='updated_at') THEN
    ALTER TABLE inventory ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 7. SALES TABLE - Add missing columns
-- ═══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sales' AND column_name='user_id') THEN
    ALTER TABLE sales ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add branch_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sales' AND column_name='branch_id') THEN
    ALTER TABLE sales ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;

  -- Add customer_phone column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sales' AND column_name='customer_phone') THEN
    ALTER TABLE sales ADD COLUMN customer_phone TEXT;
  END IF;

  -- Add amount_paid column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sales' AND column_name='amount_paid') THEN
    ALTER TABLE sales ADD COLUMN amount_paid NUMERIC DEFAULT 0;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sales' AND column_name='status') THEN
    ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'Completed';
  END IF;

  -- Add notes column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sales' AND column_name='notes') THEN
    ALTER TABLE sales ADD COLUMN notes TEXT;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sales' AND column_name='updated_at') THEN
    ALTER TABLE sales ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 8. SALES_ITEMS TABLE - Ensure it exists
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- 9. EXPENSES TABLE - Add missing columns
-- ═══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  -- Add branch_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='expenses' AND column_name='branch_id') THEN
    ALTER TABLE expenses ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;

  -- Add receipt_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='expenses' AND column_name='receipt_url') THEN
    ALTER TABLE expenses ADD COLUMN receipt_url TEXT;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='expenses' AND column_name='updated_at') THEN
    ALTER TABLE expenses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 10. ATTENDANCE TABLE - Create if not exists
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  clock_in_location TEXT,
  clock_out_location TEXT,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- 11. PURCHASE ORDERS TABLE - Create if not exists
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_number TEXT UNIQUE,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════
-- INDEXES - Create if not exists
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_business_id ON branches(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category_id ON inventory(category_id);
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_attendance_business_id ON attendance(business_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS for updated_at timestamps
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
    AND table_name IN ('businesses', 'branches', 'profiles', 'categories', 'suppliers', 'inventory', 'sales', 'expenses', 'attendance', 'purchase_orders')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
    EXECUTE format('
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    ', t, t);
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('businesses', 'branches', 'profiles', 'categories', 'suppliers', 'inventory', 'sales', 'sales_items', 'expenses', 'attendance', 'purchase_orders')
ORDER BY table_name, ordinal_position;

-- ═══════════════════════════════════════════════════════════════════
-- SUCCESS!
-- ══════════════════════════════════════════════════════��════════════
-- ✅ All missing columns have been added
-- ✅ All missing tables have been created
-- ✅ Indexes have been created
-- ✅ Triggers have been set up
-- 
-- Next step: Run FIX_RLS_FINAL.sql to set up Row Level Security
-- ═══════════════════════════════════════════════════════════════════