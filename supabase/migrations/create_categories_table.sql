-- ═══════════════════════════════════════════════════════════════════
-- CATEGORIES TABLE MIGRATION
-- Purpose: Create the missing 'categories' table to support inventory categorization
-- ═══════════════════════════════════════════════════════════════════

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (CRUD permissions for business owners)

-- SELECT: Users can view categories of their business
DROP POLICY IF EXISTS "Users can view categories of their business" ON public.categories;
CREATE POLICY "Users can view categories of their business" ON public.categories
    FOR SELECT USING (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        OR
        business_id = get_user_business_id()
    );

-- INSERT: Users can insert categories to their business
DROP POLICY IF EXISTS "Users can insert categories to their business" ON public.categories;
CREATE POLICY "Users can insert categories to their business" ON public.categories
    FOR INSERT WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        OR
        business_id = get_user_business_id()
    );

-- UPDATE: Users can update categories of their business
DROP POLICY IF EXISTS "Users can update categories of their business" ON public.categories;
CREATE POLICY "Users can update categories of their business" ON public.categories
    FOR UPDATE USING (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        OR
        business_id = get_user_business_id()
    );

-- DELETE: Users can delete categories of their business
DROP POLICY IF EXISTS "Users can delete categories of their business" ON public.categories;
CREATE POLICY "Users can delete categories of their business" ON public.categories
    FOR DELETE USING (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        OR
        business_id = get_user_business_id()
    );

-- 4. Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_categories_business_id ON public.categories(business_id);

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload config';
