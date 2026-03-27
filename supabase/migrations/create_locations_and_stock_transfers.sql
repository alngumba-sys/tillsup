-- ═══════════════════════════════════════════════════════════════════
-- LOCATIONS AND STOCK TRANSFERS TABLES
-- Multi-location inventory management with shops and warehouses
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. LOCATIONS TABLE (Shops and Warehouses)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('shop', 'warehouse')),
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Computed fields (can be updated via triggers or manually)
    total_products INTEGER DEFAULT 0,
    total_stock_value DECIMAL(10,2) DEFAULT 0,
    low_stock_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_business_id ON public.locations(business_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations(type);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON public.locations(is_active);

-- ═══════════════════════════════════════════════════════════════════
-- 2. STOCK TRANSFERS TABLE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    from_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    to_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
    notes TEXT,
    estimated_time TEXT,
    
    -- User tracking
    initiated_by UUID NOT NULL REFERENCES auth.users(id),
    initiated_by_name TEXT NOT NULL,
    completed_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_transfers_business_id ON public.stock_transfers(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_location ON public.stock_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_location ON public.stock_transfers(to_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON public.stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_created_at ON public.stock_transfers(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 3. LOCATION STOCK TABLE (Optional - for detailed stock tracking)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.location_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per location-product combination
    CONSTRAINT unique_location_product UNIQUE (location_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_stock_location_id ON public.location_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_location_stock_product_id ON public.location_stock(product_id);

-- ═══════════════════════════════════════════════════════════════════
-- 4. TRIGGERS FOR UPDATED_AT
-- ═══════════════════════════════════════════════════════════════════

-- Locations updated_at trigger
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_locations_updated_at ON public.locations;
CREATE TRIGGER trigger_update_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION update_locations_updated_at();

-- Stock transfers updated_at trigger
CREATE OR REPLACE FUNCTION update_stock_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_transfers_updated_at ON public.stock_transfers;
CREATE TRIGGER trigger_update_stock_transfers_updated_at
    BEFORE UPDATE ON public.stock_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_transfers_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_stock ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- LOCATIONS POLICIES
-- ═══════════════════════════════════════════════════════════════════

-- Allow users to view locations in their business
DROP POLICY IF EXISTS "Users can view locations in their business" ON public.locations;
CREATE POLICY "Users can view locations in their business" ON public.locations
    FOR SELECT
    USING (business_id = get_user_business_id());

-- Allow users to create locations in their business
DROP POLICY IF EXISTS "Users can create locations in their business" ON public.locations;
CREATE POLICY "Users can create locations in their business" ON public.locations
    FOR INSERT
    WITH CHECK (business_id = get_user_business_id());

-- Allow users to update locations in their business
DROP POLICY IF EXISTS "Users can update locations in their business" ON public.locations;
CREATE POLICY "Users can update locations in their business" ON public.locations
    FOR UPDATE
    USING (business_id = get_user_business_id())
    WITH CHECK (business_id = get_user_business_id());

-- Allow users to delete locations in their business (except default)
DROP POLICY IF EXISTS "Users can delete locations in their business" ON public.locations;
CREATE POLICY "Users can delete locations in their business" ON public.locations
    FOR DELETE
    USING (business_id = get_user_business_id() AND is_default = false);

-- ═══════════════════════════════════════════════════════════════════
-- STOCK TRANSFERS POLICIES
-- ═══════════════════════════════════════════════════════════════════

-- Allow users to view stock transfers in their business
DROP POLICY IF EXISTS "Users can view stock transfers in their business" ON public.stock_transfers;
CREATE POLICY "Users can view stock transfers in their business" ON public.stock_transfers
    FOR SELECT
    USING (business_id = get_user_business_id());

-- Allow users to create stock transfers in their business
DROP POLICY IF EXISTS "Users can create stock transfers in their business" ON public.stock_transfers;
CREATE POLICY "Users can create stock transfers in their business" ON public.stock_transfers
    FOR INSERT
    WITH CHECK (business_id = get_user_business_id());

-- Allow users to update stock transfers in their business
DROP POLICY IF EXISTS "Users can update stock transfers in their business" ON public.stock_transfers;
CREATE POLICY "Users can update stock transfers in their business" ON public.stock_transfers
    FOR UPDATE
    USING (business_id = get_user_business_id())
    WITH CHECK (business_id = get_user_business_id());

-- Allow users to delete stock transfers in their business
DROP POLICY IF EXISTS "Users can delete stock transfers in their business" ON public.stock_transfers;
CREATE POLICY "Users can delete stock transfers in their business" ON public.stock_transfers
    FOR DELETE
    USING (business_id = get_user_business_id());

-- ═══════════════════════════════════════════════════════════════════
-- LOCATION STOCK POLICIES
-- ═══════════════════════════════════════════════════════════════════

-- Allow users to view location stock in their business
DROP POLICY IF EXISTS "Users can view location stock in their business" ON public.location_stock;
CREATE POLICY "Users can view location stock in their business" ON public.location_stock
    FOR SELECT
    USING (
        location_id IN (
            SELECT id FROM public.locations WHERE business_id = get_user_business_id()
        )
    );

-- Allow users to create location stock records in their business
DROP POLICY IF EXISTS "Users can create location stock in their business" ON public.location_stock;
CREATE POLICY "Users can create location stock in their business" ON public.location_stock
    FOR INSERT
    WITH CHECK (
        location_id IN (
            SELECT id FROM public.locations WHERE business_id = get_user_business_id()
        )
    );

-- Allow users to update location stock in their business
DROP POLICY IF EXISTS "Users can update location stock in their business" ON public.location_stock;
CREATE POLICY "Users can update location stock in their business" ON public.location_stock
    FOR UPDATE
    USING (
        location_id IN (
            SELECT id FROM public.locations WHERE business_id = get_user_business_id()
        )
    )
    WITH CHECK (
        location_id IN (
            SELECT id FROM public.locations WHERE business_id = get_user_business_id()
        )
    );

-- Allow users to delete location stock in their business
DROP POLICY IF EXISTS "Users can delete location stock in their business" ON public.location_stock;
CREATE POLICY "Users can delete location stock in their business" ON public.location_stock
    FOR DELETE
    USING (
        location_id IN (
            SELECT id FROM public.locations WHERE business_id = get_user_business_id()
        )
    );

-- ═══════════════════════════════════════════════════════════════════
-- 6. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════

-- Function to ensure only one default location per business
CREATE OR REPLACE FUNCTION ensure_single_default_location()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this location as default
    IF NEW.is_default = true THEN
        -- Unset any other default locations in the same business
        UPDATE public.locations
        SET is_default = false
        WHERE business_id = NEW.business_id
        AND id != NEW.id
        AND is_default = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_default_location ON public.locations;
CREATE TRIGGER trigger_ensure_single_default_location
    BEFORE INSERT OR UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_location();

-- ═══════════════════════════════════════════════════════════════════
-- 7. INITIAL DATA (Optional - Create default location for existing businesses)
-- ═══════════════════════════════════════════════════════════════════

-- Note: This will create a default "Main Shop" for each existing business that doesn't have a location yet
-- You can run this manually if needed, or skip it if you want businesses to create their own locations

/*
INSERT INTO public.locations (business_id, name, type, is_default, is_active)
SELECT 
    id as business_id,
    'Main Shop' as name,
    'shop' as type,
    true as is_default,
    true as is_active
FROM public.businesses
WHERE id NOT IN (SELECT DISTINCT business_id FROM public.locations)
ON CONFLICT DO NOTHING;
*/

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════

-- Verification queries (comment these out for production)
-- SELECT 'Locations table created' as status;
-- SELECT COUNT(*) as location_count FROM public.locations;
-- SELECT COUNT(*) as transfer_count FROM public.stock_transfers;
