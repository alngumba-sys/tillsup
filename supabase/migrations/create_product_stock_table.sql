-- ═══════════════════════════════════════════════════════════════════
-- PRODUCT STOCK TABLE - Multi-Location Inventory Tracking
-- ═══════════════════════════════════════════════════════════════════
-- This table tracks stock quantities for each product at each location
-- Replaces the single branch_id + stock approach with per-location tracking

CREATE TABLE IF NOT EXISTS public.product_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  location_id TEXT REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 0 NOT NULL,
  reorder_level INTEGER DEFAULT 10, -- Can override product default per location
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one stock record per product per location
  UNIQUE(product_id, location_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_stock_product ON public.product_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_location ON public.product_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_business ON public.product_stock(business_id);

-- RLS Policies
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

-- Users can view product stock for their business
DROP POLICY IF EXISTS "Users can view product stock of their business" ON public.product_stock;
CREATE POLICY "Users can view product stock of their business" ON public.product_stock
    FOR SELECT USING (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        OR
        business_id = get_user_business_id()
    );

-- Users can insert product stock to their business
DROP POLICY IF EXISTS "Users can insert product stock to their business" ON public.product_stock;
CREATE POLICY "Users can insert product stock to their business" ON public.product_stock
    FOR INSERT WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        OR
        business_id = get_user_business_id()
    );

-- Users can update product stock in their business
DROP POLICY IF EXISTS "Users can update product stock in their business" ON public.product_stock;
CREATE POLICY "Users can update product stock in their business" ON public.product_stock
    FOR UPDATE USING (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        OR
        business_id = get_user_business_id()
    );

-- Users can delete product stock from their business
DROP POLICY IF EXISTS "Users can delete product stock from their business" ON public.product_stock;
CREATE POLICY "Users can delete product stock from their business" ON public.product_stock
    FOR DELETE USING (
        business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
        OR
        business_id = get_user_business_id()
    );

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION NOTES
-- ═══════════════════════════════════════════════════════════════════
-- After creating this table, existing products can be migrated with:
--
-- INSERT INTO product_stock (business_id, product_id, location_id, quantity, reorder_level)
-- SELECT 
--   business_id, 
--   id as product_id, 
--   branch_id as location_id, 
--   stock as quantity,
--   low_stock_threshold as reorder_level
-- FROM inventory
-- WHERE branch_id IS NOT NULL;
--
-- The inventory table will keep branch_id for backwards compatibility
-- but new features will use product_stock table
-- ═══════════════════════════════════════════════════════════════════
