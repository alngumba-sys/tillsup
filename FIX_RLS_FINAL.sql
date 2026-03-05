-- ═══════════════════════════════════════════════════════════════════
-- FIX_RLS_FINAL.sql - FIXED RECURSION VERSION
-- Complete RLS Policy Fix for Tillsup POS
-- ═══════════════════════════════════════════════════════════════════
-- This version properly bypasses RLS to avoid infinite recursion
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: Temporarily disable RLS on profiles to create helper functions
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: Create helper functions with proper RLS bypass
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_user_business_id() CASCADE;
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT business_id::text INTO result FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS get_user_role() CASCADE;
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT role INTO result FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS get_user_can_create_expense() CASCADE;
CREATE OR REPLACE FUNCTION get_user_can_create_expense()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT can_create_expense INTO result FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN COALESCE(result, false);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_can_create_expense() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: Drop all existing policies
-- ═══════════════════════════════════════════════════════════════════

-- Profiles
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Businesses
DROP POLICY IF EXISTS "businesses_select_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON businesses;

-- Sales
DROP POLICY IF EXISTS "sales_select_policy" ON sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON sales;
DROP POLICY IF EXISTS "sales_update_policy" ON sales;

-- Sales Items
DROP POLICY IF EXISTS "sales_items_select_policy" ON sales_items;
DROP POLICY IF EXISTS "sales_items_insert_policy" ON sales_items;

-- Inventory
DROP POLICY IF EXISTS "inventory_select_policy" ON inventory;
DROP POLICY IF EXISTS "inventory_insert_policy" ON inventory;
DROP POLICY IF EXISTS "inventory_update_policy" ON inventory;
DROP POLICY IF EXISTS "inventory_delete_policy" ON inventory;

-- Expenses
DROP POLICY IF EXISTS "expenses_select_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON expenses;

-- Branches
DROP POLICY IF EXISTS "branches_select_policy" ON branches;
DROP POLICY IF EXISTS "branches_insert_policy" ON branches;
DROP POLICY IF EXISTS "branches_update_policy" ON branches;
DROP POLICY IF EXISTS "branches_delete_policy" ON branches;

-- Categories
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- Suppliers
DROP POLICY IF EXISTS "suppliers_select_policy" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert_policy" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update_policy" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete_policy" ON suppliers;

-- Attendance
DROP POLICY IF EXISTS "attendance_select_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_insert_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_update_policy" ON attendance;

-- Purchase Orders
DROP POLICY IF EXISTS "purchase_orders_select_policy" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert_policy" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update_policy" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_delete_policy" ON purchase_orders;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: Enable RLS on all tables
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
    ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'purchase_orders') THEN
    ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 1. PROFILES TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

-- SELECT: Own profile OR same business
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR 
  business_id::text = get_user_business_id()
);

-- INSERT: Self-registration OR manager creating staff
-- IMPORTANT: For staff creation by admins, we need to allow inserting profiles 
-- where the business_id matches the admin's business
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
WITH CHECK (
  -- Case 1: User creating their own profile during signup
  auth.uid() = id
  OR
  -- Case 2: Business Owner or Manager creating staff for their business
  -- They are inserting a profile with THEIR business_id, so we check against that
  (
    business_id::text IN (
      SELECT business_id::text FROM profiles WHERE id = auth.uid()
    )
    AND 
    (
      SELECT role FROM profiles WHERE id = auth.uid()
    ) IN ('Business Owner', 'Manager')
  )
);

-- UPDATE: Own profile OR manager updating team
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
USING (
  auth.uid() = id
  OR
  (
    business_id::text = get_user_business_id()
    AND get_user_role() IN ('Business Owner', 'Manager')
  )
);

-- DELETE: Only Business Owner can delete
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() = 'Business Owner'
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. BUSINESSES TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "businesses_select_policy" ON businesses
FOR SELECT
USING (
  id::text = get_user_business_id()
);

CREATE POLICY "businesses_insert_policy" ON businesses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "businesses_update_policy" ON businesses
FOR UPDATE
USING (
  id::text = get_user_business_id()
  AND get_user_role() = 'Business Owner'
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. SALES TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "sales_select_policy" ON sales
FOR SELECT
USING (
  business_id::text = get_user_business_id()
);

CREATE POLICY "sales_insert_policy" ON sales
FOR INSERT
WITH CHECK (
  business_id::text = get_user_business_id()
);

CREATE POLICY "sales_update_policy" ON sales
FOR UPDATE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager', 'Accountant')
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. SALES_ITEMS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "sales_items_select_policy" ON sales_items
FOR SELECT
USING (
  business_id::text = get_user_business_id()
);

CREATE POLICY "sales_items_insert_policy" ON sales_items
FOR INSERT
WITH CHECK (
  business_id::text = get_user_business_id()
);

-- ═══════════════════════════════════════════════════════════════════
-- 5. INVENTORY TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "inventory_select_policy" ON inventory
FOR SELECT
USING (
  business_id::text = get_user_business_id()
);

CREATE POLICY "inventory_insert_policy" ON inventory
FOR INSERT
WITH CHECK (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager', 'Accountant')
);

CREATE POLICY "inventory_update_policy" ON inventory
FOR UPDATE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager', 'Accountant', 'Staff', 'Cashier')
);

CREATE POLICY "inventory_delete_policy" ON inventory
FOR DELETE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager')
);

-- ═══════════════════════════════════════════════════════════════════
-- 6. EXPENSES TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "expenses_select_policy" ON expenses
FOR SELECT
USING (
  business_id::text = get_user_business_id()
);

CREATE POLICY "expenses_insert_policy" ON expenses
FOR INSERT
WITH CHECK (
  business_id::text = get_user_business_id()
  AND (
    get_user_role() IN ('Business Owner', 'Accountant')
    OR get_user_can_create_expense() = true
  )
);

CREATE POLICY "expenses_update_policy" ON expenses
FOR UPDATE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Accountant')
);

CREATE POLICY "expenses_delete_policy" ON expenses
FOR DELETE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Accountant')
);

-- ═══════════════════════════════════════════════════════════════════
-- 7. BRANCHES TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "branches_select_policy" ON branches
FOR SELECT
USING (
  business_id::text = get_user_business_id()
);

CREATE POLICY "branches_insert_policy" ON branches
FOR INSERT
WITH CHECK (
  business_id::text = get_user_business_id()
  AND get_user_role() = 'Business Owner'
);

CREATE POLICY "branches_update_policy" ON branches
FOR UPDATE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager')
);

CREATE POLICY "branches_delete_policy" ON branches
FOR DELETE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() = 'Business Owner'
);

-- ═══════════════════════════════════════════════════════════════════
-- 8. CATEGORIES TABLE POLICIES
-- ══════════════════��════════════════════════════════════════════════

CREATE POLICY "categories_select_policy" ON categories
FOR SELECT
USING (
  business_id::text = get_user_business_id()
);

CREATE POLICY "categories_insert_policy" ON categories
FOR INSERT
WITH CHECK (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager', 'Accountant')
);

CREATE POLICY "categories_update_policy" ON categories
FOR UPDATE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager', 'Accountant')
);

CREATE POLICY "categories_delete_policy" ON categories
FOR DELETE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager')
);

-- ═══════════════════════════════════════════════════════════════════
-- 9. SUPPLIERS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY "suppliers_select_policy" ON suppliers
FOR SELECT
USING (
  business_id::text = get_user_business_id()
);

CREATE POLICY "suppliers_insert_policy" ON suppliers
FOR INSERT
WITH CHECK (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager', 'Accountant')
);

CREATE POLICY "suppliers_update_policy" ON suppliers
FOR UPDATE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager', 'Accountant')
);

CREATE POLICY "suppliers_delete_policy" ON suppliers
FOR DELETE
USING (
  business_id::text = get_user_business_id()
  AND get_user_role() IN ('Business Owner', 'Manager')
);

-- ═══════════════════════════════════════════════════════════════════
-- 10. ATTENDANCE TABLE POLICIES (if exists)
-- ═══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
    EXECUTE 'CREATE POLICY "attendance_select_policy" ON attendance FOR SELECT USING (
      business_id::text = get_user_business_id()
    )';
    
    EXECUTE 'CREATE POLICY "attendance_insert_policy" ON attendance FOR INSERT WITH CHECK (
      business_id::text = get_user_business_id()
    )';
    
    EXECUTE 'CREATE POLICY "attendance_update_policy" ON attendance FOR UPDATE USING (
      business_id::text = get_user_business_id()
      AND get_user_role() IN (''Business Owner'', ''Manager'')
    )';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 11. PURCHASE ORDERS TABLE POLICIES (if exists)
-- ═══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'purchase_orders') THEN
    EXECUTE 'CREATE POLICY "purchase_orders_select_policy" ON purchase_orders FOR SELECT USING (
      business_id::text = get_user_business_id()
    )';
    
    EXECUTE 'CREATE POLICY "purchase_orders_insert_policy" ON purchase_orders FOR INSERT WITH CHECK (
      business_id::text = get_user_business_id()
      AND get_user_role() IN (''Business Owner'', ''Manager'', ''Accountant'')
    )';
    
    EXECUTE 'CREATE POLICY "purchase_orders_update_policy" ON purchase_orders FOR UPDATE USING (
      business_id::text = get_user_business_id()
      AND get_user_role() IN (''Business Owner'', ''Manager'', ''Accountant'')
    )';
    
    EXECUTE 'CREATE POLICY "purchase_orders_delete_policy" ON purchase_orders FOR DELETE USING (
      business_id::text = get_user_business_id()
      AND get_user_role() IN (''Business Owner'', ''Manager'')
    )';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════

-- 1. Check helper functions
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as configuration
FROM pg_proc 
WHERE proname IN ('get_user_business_id', 'get_user_role', 'get_user_can_create_expense');

-- 2. Check all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════
-- SUCCESS!
-- ═══════════════════════════════════════════════════════════════════
-- ✅ All RLS policies configured with NO RECURSION
-- ✅ Helper functions properly bypass RLS with SECURITY DEFINER
-- ✅ Functions use SET search_path for security
-- ✅ Type casting included (::text)
-- ✅ Profiles table RLS temporarily disabled during function creation
-- 
-- You can now:
-- ✅ Create staff members
-- ✅ Manage inventory
-- ✅ Record sales
-- ✅ Manage expenses
-- ✅ All with proper role-based access control
-- ✅ NO INFINITE RECURSION ERRORS!
-- ═══════════════════════════════════════════════════════════════════