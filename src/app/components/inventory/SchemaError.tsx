import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { AlertTriangle, Database, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

export function SchemaError({ error }: { error: any }) {
  const { business } = useAuth();
  
  if (!error) return null;
  
  // Helper to generate SQL script
  let sqlScript = "";
  let errorTitle = "";
  let errorDescription = "";
  
  // Missing Table (PGRST205 or 42P01) or Missing Column (PGRST204 or 42703) or Null ID (23502) or Invalid UUID (22P02) or Foreign Key Type Mismatch (42804)
  if (error.code === "PGRST205" || error.code === "PGRST204" || error.code === "42703" || error.code === "23502" || error.code === "22P02" || error.code === "42P01" || error.code === "42804") {
    const errorMessage = error.message?.toLowerCase() || "";
    const isBranchesLocationError = errorMessage.includes("location") && (errorMessage.includes("branches") || errorMessage.includes("column"));
    
    // Check for missing tables
    const isReadableIdError = errorMessage.includes("readable_id"); // Checked FIRST to avoid 'sales' keyword conflict
    const isCategoriesTableError = errorMessage.includes("categories") || ((error.code === "PGRST205" || error.code === "42P01") && errorMessage.includes("categories"));
    const isBranchesTableError = (errorMessage.includes("branches") && (error.code === "PGRST205" || error.code === "42P01"));
    const isInventoryTableError = errorMessage.includes("inventory") || ((error.code === "PGRST205" || error.code === "42P01") && errorMessage.includes("inventory"));
    const isSuppliersTableError = errorMessage.includes("suppliers") || ((error.code === "PGRST205" || error.code === "42P01") && errorMessage.includes("suppliers"));
    const isExpensesTableError = errorMessage.includes("expenses") || ((error.code === "PGRST205" || error.code === "42P01") && errorMessage.includes("expenses"));
    const isSalesTableError = errorMessage.includes("sales") || ((error.code === "PGRST205" || error.code === "42P01") && errorMessage.includes("sales"));
    const isExpensesCreatedByError = errorMessage.includes("created_by") && errorMessage.includes("expenses"); // Specific check for expenses.created_by
    const isForecastingTableError = errorMessage.includes("forecasting") || errorMessage.includes("lead_time") || ((error.code === "PGRST205" || error.code === "42P01") && (errorMessage.includes("forecasting") || errorMessage.includes("lead_time")));
    const isCustomersTableError = errorMessage.includes("customers") || ((error.code === "PGRST205" || error.code === "42P01") && errorMessage.includes("customers"));
    const isProfilesTableError = errorMessage.includes("profiles") || ((error.code === "PGRST205" || error.code === "42P01") && errorMessage.includes("profiles"));
    const isStaffInvitesTableError = errorMessage.includes("staff_invites") || ((error.code === "PGRST205" || error.code === "42P01") && errorMessage.includes("staff_invites"));

    const isBranchesIdError = error.code === "23502" && errorMessage.includes("branches") && errorMessage.includes("id");
    const isInventoryIdError = error.code === "23502" && errorMessage.includes("inventory") && errorMessage.includes("id");
    const isInventoryImageError = errorMessage.includes("image") && errorMessage.includes("inventory");
    const isExpensesIdError = error.code === "23502" && errorMessage.includes("expenses") && errorMessage.includes("id");
    const isSalesIdError = error.code === "23502" && errorMessage.includes("sales") && errorMessage.includes("id");
    const isUuidError = error.code === "22P02";
    const isForeignKeyTypeError = error.code === "42804";

    // Default values
    let tableName = "unknown";
    
    // Construct SQL Script
    if (isForeignKeyTypeError) {
        errorTitle = "Database Schema Mismatch: Foreign Key Type";
        errorDescription = "A foreign key constraint failed because the referenced column has an incompatible type (e.g., UUID vs Text).";
        sqlScript = `
-- Fix sales.id type if it is TEXT but needs to be UUID
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'id' AND data_type = 'text'
    ) THEN
        -- 1. Drop dependent policies that reference 'id'
        DROP POLICY IF EXISTS "Enable access for authenticated users" ON public.sales;
        DROP POLICY IF EXISTS "Enable access for authenticated users" ON public.sales_items;
        
        -- 2. Alter column type
        ALTER TABLE public.sales ALTER COLUMN id TYPE UUID USING id::uuid;
        ALTER TABLE public.sales ALTER COLUMN id SET DEFAULT gen_random_uuid();
        
        -- 3. Re-enable RLS
        ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
        
        -- 4. Re-create policies
        CREATE POLICY "Enable access for authenticated users" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
        CREATE POLICY "Enable access for authenticated users" ON public.sales_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
`;
    } else if (isUuidError) {
        // Invalid UUID input syntax - likely business_id is string "BIZ-..." but column is UUID
        errorTitle = "Database Schema Mismatch: ID Type";
        errorDescription = "The system uses text-based IDs (e.g., 'BIZ-123') but the database expects UUIDs. The columns must be updated to support text.";
        sqlScript = `
-- Update business_id columns to TEXT to support "BIZ-..." format
ALTER TABLE IF EXISTS public.branches ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.categories ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.inventory ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.sales ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.sales_items ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.expenses ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.suppliers ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.customers ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.forecasting_configs ALTER COLUMN business_id TYPE TEXT;
ALTER TABLE IF EXISTS public.lead_time_configs ALTER COLUMN business_id TYPE TEXT;
`;
    } else if (isBranchesLocationError) {
         // Missing column 'location' in branches
         errorTitle = "Database Schema Outdated: Missing Column";
         errorDescription = `The 'branches' table is missing the 'location' column.`;
         sqlScript = `
-- Add location column to branches table
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Headquarters';

-- Update existing records to have a default value
UPDATE public.branches 
SET location = 'Headquarters' 
WHERE location IS NULL;
`;
    } else if (isBranchesIdError) {
        errorTitle = "Database Schema Issue: Missing ID Generation";
        errorDescription = `The 'branches' table's 'id' column is missing a default value generator.`;
        sqlScript = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE public.branches ALTER COLUMN id SET DEFAULT gen_random_uuid();
`;
    } else if (isInventoryIdError) {
        errorTitle = "Database Schema Issue: Missing ID Generation";
        errorDescription = `The 'inventory' table's 'id' column is missing a default value generator.`;
        sqlScript = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE public.inventory ALTER COLUMN id SET DEFAULT gen_random_uuid();
`;
    } else if (isInventoryImageError) {
        errorTitle = "Database Schema Outdated: Missing Column";
        errorDescription = "The 'inventory' table is missing the 'image' column, which is required for product images.";
        sqlScript = `
-- Add image column to inventory table
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS image TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
`;
    } else if (isExpensesIdError) {
        errorTitle = "Database Schema Issue: Missing ID Generation";
        errorDescription = `The 'expenses' table's 'id' column is missing a default value generator.`;
        sqlScript = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE public.expenses ALTER COLUMN id SET DEFAULT gen_random_uuid();
`;
    } else if (isSalesIdError) {
        errorTitle = "Database Schema Issue: Missing ID Generation";
        errorDescription = `The 'sales' table's 'id' column is missing a default value generator.`;
        sqlScript = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE public.sales ALTER COLUMN id SET DEFAULT gen_random_uuid();
`;
    } else if (isReadableIdError) {
        errorTitle = "Database Schema Issue: Missing Sequential ID";
        errorDescription = "The 'sales' table is missing the 'readable_id' column, which is required for sequential order numbering.";
        sqlScript = `
-- Add readable_id column as a SERIAL (auto-incrementing integer)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS readable_id SERIAL;

-- Reload schema cache to ensure PostgREST picks up the new column
NOTIFY pgrst, 'reload schema';
`;
    } else if (isExpensesCreatedByError) {
        errorTitle = "Database Schema Issue: Missing Expense Creator";
        errorDescription = "The 'expenses' table is missing the 'created_by' columns, which are required for tracking who created an expense.";
        sqlScript = `
-- Add created_by columns to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by_role TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
`;
    } else if (isCategoriesTableError) {
        tableName = "categories";
        errorTitle = `Database Schema Missing: ${tableName}`;
        errorDescription = `The ${tableName} table was not found in your Supabase database.`;
        sqlScript = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable access for authenticated users" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_categories_business_id ON public.categories(business_id);
`;
    } else if (isInventoryTableError) {
        tableName = "inventory";
        errorTitle = `Database Schema Missing: ${tableName}`;
        errorDescription = `The ${tableName} table was not found in your Supabase database.`;
        sqlScript = `
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    price NUMERIC DEFAULT 0,
    retail_price NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    wholesale_price NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    sku TEXT,
    supplier TEXT,
    image TEXT,
    low_stock_threshold NUMERIC DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access for authenticated users" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON public.inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON public.inventory(branch_id);
`;
    } else if (isSuppliersTableError) {
        tableName = "suppliers";
        errorTitle = `Database Schema Missing: ${tableName}`;
        errorDescription = `The ${tableName} table was not found in your Supabase database.`;
        sqlScript = `
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
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

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access for authenticated users" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON public.suppliers(business_id);
`;
    } else if (isExpensesTableError) {
        tableName = "expenses";
        errorTitle = `Database Schema Missing: ${tableName}`;
        errorDescription = `The ${tableName} table was not found in your Supabase database.`;
        sqlScript = `
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC DEFAULT 0,
    created_by TEXT,
    created_by_name TEXT,
    created_by_role TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'DRAFT',
    approved_by TEXT,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    rejected_by TEXT,
    rejected_by_name TEXT,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    payment_method TEXT,
    paid_at TIMESTAMPTZ,
    paid_by TEXT,
    paid_by_name TEXT,
    staff_id TEXT,
    salary_month TEXT,
    salary_period TEXT,
    source_type TEXT DEFAULT 'MANUAL',
    source_reference_id TEXT,
    source_reference_number TEXT,
    is_system_generated BOOLEAN DEFAULT FALSE
);

-- Ensure created_by columns exist (fix for PGRST204)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by_role TEXT;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access for authenticated users" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON public.expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON public.expenses(branch_id);
`;
    } else if (isReadableIdError) {
        errorTitle = "Database Schema Issue: Missing Sequential ID";
        errorDescription = "The 'sales' table is missing the 'readable_id' column, which is required for sequential order numbering.";
        sqlScript = `
-- Add readable_id column as a SERIAL (auto-incrementing integer)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS readable_id SERIAL;

-- Reload schema cache to ensure PostgREST picks up the new column
NOTIFY pgrst, 'reload schema';
`;
    } else if (isSalesTableError) {
        tableName = "sales";
        errorTitle = `Database Schema Missing: Sales Tables`;
        errorDescription = `The sales or sales_items tables were not found or are missing columns.`;
        sqlScript = `
-- 1. Rename legacy typo table if exists (sale_items -> sales_items)
ALTER TABLE IF EXISTS public.sale_items RENAME TO sales_items;

-- 2. Drop Foreign Key Constraints (Covering both legacy and standard names)
-- We need to remove the constraint linking sales_items to sales BEFORE we can change the ID type.
ALTER TABLE IF EXISTS public.sales_items DROP CONSTRAINT IF EXISTS sales_items_sale_id_fkey;
ALTER TABLE IF EXISTS public.sales_items DROP CONSTRAINT IF EXISTS sale_items_sale_id_fkey;

-- 3. DROP ALL POLICIES DYNAMICALLY
-- This block removes ALL policies on sales and sales_items to ensure column types can be changed.
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on sales
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.sales';
    END LOOP;

    -- Drop all policies on sales_items
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales_items') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.sales_items';
    END LOOP;
END $$;

-- 4. Create sales table if missing
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
    branch_id TEXT,
    staff_id TEXT,
    staff_role TEXT,
    staff_name TEXT,
    customer_name TEXT,
    customer_count INTEGER DEFAULT 1,
    subtotal NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4b. Ensure business_id exists on sales (for legacy tables)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS business_id TEXT;

-- 4c. Ensure payment_method exists on sales (fix for PGRST204 error)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';

-- 4d. Ensure readable_id exists on sales (fix for 42703 error)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS readable_id SERIAL;

-- 5. Fix sales.id type (Text -> UUID)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'id' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.sales ALTER COLUMN id TYPE UUID USING id::uuid;
        ALTER TABLE public.sales ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- 6. Create sales_items table if missing
CREATE TABLE IF NOT EXISTS public.sales_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID,
    business_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    price_type TEXT,
    cost_price NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6b. Ensure business_id exists on sales_items (fix for 42703 error)
ALTER TABLE public.sales_items ADD COLUMN IF NOT EXISTS business_id TEXT;

-- 7. Fix sales_items.sale_id type (Text -> UUID)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sales_items' AND column_name = 'sale_id' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.sales_items ALTER COLUMN sale_id TYPE UUID USING sale_id::uuid;
    END IF;
END $$;

-- 8. Backfill business_id in sales_items from sales if possible
-- We do this AFTER Step 7 to ensure both IDs are UUIDs for the join.
DO $$
BEGIN
    UPDATE public.sales_items si
    SET business_id = s.business_id
    FROM public.sales s
    WHERE si.sale_id = s.id
    AND (si.business_id IS NULL OR si.business_id = '');
END $$;

-- 9. Restore Foreign Key
DO $$
BEGIN
    -- Only add if it doesn't exist (using the standard name)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_items_sale_id_fkey'
    ) THEN
        ALTER TABLE public.sales_items 
        ADD CONSTRAINT sales_items_sale_id_fkey 
        FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 10. Restore Policies (Broad Access)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable access for authenticated users" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for authenticated users" ON public.sales_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. Ensure Indexes
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON public.sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON public.sales_items(sale_id);

-- 12. Reload Schema Cache Hint
NOTIFY pgrst, 'reload schema';
`;
    } else if (isForecastingTableError) {
        tableName = "forecasting";
        errorTitle = `Database Schema Missing: Forecasting Tables`;
        errorDescription = `The forecasting_configs or lead_time_configs tables were not found.`;
        sqlScript = `
CREATE TABLE IF NOT EXISTS public.forecasting_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
    default_sales_period_days INTEGER DEFAULT 30,
    default_reorder_cycle_days INTEGER DEFAULT 14,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lead_time_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
    type TEXT,
    product_id TEXT,
    supplier_id TEXT,
    lead_time_days INTEGER DEFAULT 7,
    created_by_staff_id TEXT,
    created_by_staff_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.forecasting_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_time_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable access for authenticated users" ON public.forecasting_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access for authenticated users" ON public.lead_time_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
`;
    } else if (isProfilesTableError) {
        tableName = "profiles";
        errorTitle = `Database Schema Missing: ${tableName}`;
        errorDescription = `The ${tableName} table was not found in your Supabase database. This table is critical for user authentication.`;
        sqlScript = `
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'Staff',
    business_id TEXT,
    branch_id TEXT,
    must_change_password BOOLEAN DEFAULT FALSE,
    can_create_expense BOOLEAN DEFAULT FALSE,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable access for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles(business_id);
`;
    } else if (isCustomersTableError) {
        tableName = "customers";
        errorTitle = `Database Schema Missing: ${tableName}`;
        errorDescription = `The ${tableName} table was not found in your Supabase database.`;
        sqlScript = `
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    last_visit TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access for authenticated users" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
`;
    } else if (isStaffInvitesTableError) {
        tableName = "staff_invites";
        errorTitle = `Database Schema Missing: ${tableName}`;
        errorDescription = `The ${tableName} table and related triggers are missing. These are required for the staff invitation flow.`;
        sqlScript = `
-- 1. Create staff_invites table
CREATE TABLE IF NOT EXISTS public.staff_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    token UUID DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'pending',
    invited_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- 2. Enable RLS
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy (Allow authenticated users to read/insert invites for their business)
CREATE POLICY "Enable access for authenticated users" ON public.staff_invites FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Create Trigger Function to Auto-Create Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user_invite()
RETURNS TRIGGER AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Check if there is a pending invite for this email
  SELECT * INTO invite_record
  FROM public.staff_invites
  WHERE email = NEW.email
  AND status = 'pending'
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
    -- Create the profile using the invite data
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      business_id,
      branch_id,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      invite_record.first_name,
      invite_record.last_name,
      invite_record.role,
      invite_record.business_id,
      invite_record.branch_id,
      NOW()
    );

    -- Mark invite as accepted
    UPDATE public.staff_invites
    SET status = 'accepted'
    WHERE id = invite_record.id;
  ELSE
    -- Default fallback for non-invited users (e.g. Business Owners signing up normally)
    -- We assume the frontend handles the profile creation for Business Owners during registration.
    -- This trigger is mainly for invited staff.
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Trigger on auth.users
-- Drop first to avoid duplicates if re-running
DROP TRIGGER IF EXISTS on_auth_user_created_invite ON auth.users;

CREATE TRIGGER on_auth_user_created_invite
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_invite();
`;
    } else if (isBranchesTableError) {
        tableName = "branches";
        errorTitle = `Database Schema Missing: ${tableName}`;
        errorDescription = `The ${tableName} table was not found in your Supabase database.`;
        sqlScript = `
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT DEFAULT 'Headquarters',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.branches FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_branches_business_id ON public.branches(business_id);
`;
    } else {
        // Fallback for other schema errors
        return (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Database Schema Error</AlertTitle>
              <AlertDescription>
                {error.message || "An unexpected schema error occurred."}
                {error.code && <span className="block text-xs mt-1 font-mono">Code: {error.code}</span>}
              </AlertDescription>
            </Alert>
        );
    }

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(sqlScript);
        toast.success("SQL script copied to clipboard");
      } catch (err) {
        console.error("Clipboard access denied:", err);
        toast.error("Clipboard access blocked", {
          description: "Please manually select and copy the SQL script below."
        });
      }
    };

    return (
      <Alert variant="destructive" className="mb-6 border-2">
        <Database className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold flex items-center gap-2">
          {errorTitle}
        </AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            {errorDescription} This is required for the system to work.
          </p>
          
          <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs overflow-x-auto mb-4 border border-slate-800">
            <pre>{sqlScript.trim()}</pre>
          </div>
          
          <div className="flex gap-3">
            <Button size="sm" variant="secondary" onClick={copyToClipboard} className="gap-2">
              <Copy className="w-4 h-4" />
              Copy SQL Script
            </Button>
            <Button size="sm" variant="outline" className="bg-white text-black hover:bg-slate-100" onClick={() => window.open("https://supabase.com/dashboard/project/_/sql", "_blank")}>
              Open Supabase SQL Editor
            </Button>
          </div>
          
          <p className="mt-3 text-xs opacity-80">
            <strong>Instructions:</strong> Copy the script above, open your Supabase SQL Editor, paste the script, and run it. Then refresh this page.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Generic error fallback
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error Loading Data</AlertTitle>
      <AlertDescription>
        {error.message || "An unexpected error occurred while fetching data."}
        {error.code && <span className="block text-xs mt-1 font-mono">Code: {error.code}</span>}
      </AlertDescription>
    </Alert>
  );
}
