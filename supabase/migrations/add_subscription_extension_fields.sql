-- Migration: Add subscription extension fields and platform_settings table
-- Date: 2026-03-29
-- Purpose: Support subscription extension workflow and platform-wide settings

-- 1. Add subscription extension fields to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_extension_notice BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS extension_notified_at TIMESTAMPTZ;

-- 2. Create platform_settings table for global configuration
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Super Admin can read/write platform settings
CREATE POLICY "Super Admin can manage platform settings"
ON platform_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- 4. Insert default pricing data if not exists
INSERT INTO platform_settings (key, value)
VALUES (
  'subscription_pricing',
  '{
    "KE": {
      "basic_monthly": 999,
      "basic_quarterly": 2697,
      "basic_annual": 9588,
      "professional_monthly": 2499,
      "professional_quarterly": 6747,
      "professional_annual": 23988,
      "ultra_monthly": 4999,
      "ultra_quarterly": 13497,
      "ultra_annual": 47988,
      "quarterly_discount": 10,
      "annual_discount": 20
    },
    "GH": {
      "basic_monthly": 150,
      "basic_quarterly": 405,
      "basic_annual": 1440,
      "professional_monthly": 350,
      "professional_quarterly": 945,
      "professional_annual": 3360,
      "ultra_monthly": 700,
      "ultra_quarterly": 1890,
      "ultra_annual": 6720,
      "quarterly_discount": 10,
      "annual_discount": 20
    },
    "ET": {
      "basic_monthly": 500,
      "basic_quarterly": 1350,
      "basic_annual": 4800,
      "professional_monthly": 1200,
      "professional_quarterly": 3240,
      "professional_annual": 11520,
      "ultra_monthly": 2500,
      "ultra_quarterly": 6750,
      "ultra_annual": 24000,
      "quarterly_discount": 10,
      "annual_discount": 20
    }
  }'
)
ON CONFLICT (key) DO NOTHING;

-- 5. Add platform_stats table for landing page metrics
CREATE TABLE IF NOT EXISTS platform_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_key TEXT UNIQUE NOT NULL,
  stat_value TEXT,
  is_auto BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on platform_stats
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- Public can read platform stats (for landing page)
CREATE POLICY "Public can view platform stats"
ON platform_stats
FOR SELECT
USING (true);

-- Super Admin can manage platform stats
CREATE POLICY "Super Admin can manage platform stats"
ON platform_stats
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default platform stats
INSERT INTO platform_stats (stat_key, stat_value, is_auto) VALUES
  ('total_businesses', '2000+', false),
  ('daily_transactions', '50000+', false),
  ('active_users', '10000+', false),
  ('reliability_percentage', '99.9%', false)
ON CONFLICT (stat_key) DO NOTHING;