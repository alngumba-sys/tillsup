# Supabase Database Setup for Tillsup

## Issue
Products are not being created because the `inventory` table is not properly set up in Supabase.

## Solution

Go to your Supabase Dashboard > SQL Editor and run the following SQL script:

### Step 1: Create Inventory Table

```sql
-- Create inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON public.inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON public.inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);

-- Create unique constraint for SKU per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_sku_branch_unique 
ON public.inventory(business_id, branch_id, sku);
```

### Step 2: Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see inventory for their own business
CREATE POLICY "Users can view their business inventory"
ON public.inventory FOR SELECT
TO authenticated
USING (business_id = auth.uid() OR business_id IN (
    SELECT business_id FROM public.users WHERE id = auth.uid()
));

-- Policy: Users can insert inventory for their business
CREATE POLICY "Users can insert inventory for their business"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (business_id IN (
    SELECT business_id FROM public.users WHERE id = auth.uid()
));

-- Policy: Users can update their business inventory
CREATE POLICY "Users can update their business inventory"
ON public.inventory FOR UPDATE
TO authenticated
USING (business_id IN (
    SELECT business_id FROM public.users WHERE id = auth.uid()
))
WITH CHECK (business_id IN (
    SELECT business_id FROM public.users WHERE id = auth.uid()
));

-- Policy: Users can delete their business inventory
CREATE POLICY "Users can delete their business inventory"
ON public.inventory FOR DELETE
TO authenticated
USING (business_id IN (
    SELECT business_id FROM public.users WHERE id = auth.uid()
));
```

### Step 3: Create Updated_at Trigger

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Alternative: Simplified RLS Policies (If Above Doesn't Work)

If you're having authentication issues, try these simpler policies:

```sql
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their business inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can insert inventory for their business" ON public.inventory;
DROP POLICY IF EXISTS "Users can update their business inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can delete their business inventory" ON public.inventory;

-- Simple policies for authenticated users
CREATE POLICY "Allow authenticated users to view inventory"
ON public.inventory FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert inventory"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update inventory"
ON public.inventory FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete inventory"
ON public.inventory FOR DELETE
TO authenticated
USING (true);
```

## Verification

After running the SQL:

1. Go to **Supabase Dashboard** > **Table Editor**
2. Verify that the `inventory` table exists with all columns
3. Go to **Inventory** page in your app
4. Try creating a product
5. You should see "Product added successfully!" notification

## Troubleshooting

### Error: "Database Schema Error"
- Make sure you ran all the SQL above
- Check that all column names match (use snake_case: `business_id`, `branch_id`, etc.)
- Verify the table exists in Supabase Dashboard > Table Editor

### Error: "Permission Error" or "violates row-level security"
- Run the "Simplified RLS Policies" section above
- Make sure you're logged in as an authenticated user
- Check that your user session is valid (try logging out and back in)

### Error: "Duplicate Entry"
- A product with the same SKU already exists in that branch
- Change the SKU to a unique value

### Products don't appear after creation
- Check browser console for errors
- Verify the `business_id` matches your user's business
- Try refreshing the page

## Related Setup

Don't forget to also set up:
- **Storage Bucket**: See `/SUPABASE_STORAGE_SETUP.md` for image upload configuration
- **Branches Table**: Make sure your `branches` table is set up
- **Users Table**: Verify your users table has the `business_id` column

## Need Help?

1. Check the browser console for detailed error messages
2. Check Supabase Dashboard > Logs for database errors
3. Verify your Supabase project is active and not paused
4. Make sure your RLS policies allow the operations you're trying to perform
