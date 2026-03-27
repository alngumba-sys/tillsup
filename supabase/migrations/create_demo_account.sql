-- ═══════════════════════════════════════════════════════════════════
-- CREATE DEMO ACCOUNT FOR TILLSUP POS
-- ═══════════════════════════════════════════════════════════════════
-- This creates a demo account that users can use to test the system
-- 
-- Demo Credentials:
-- Email: demo@tillsup.com
-- Password: demo123
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Create the demo auth user in Supabase Auth
-- NOTE: You need to run this in Supabase SQL Editor
-- The password will be hashed automatically by Supabase

-- First, create the auth user (this uses Supabase's auth.users table)
-- Run this in your Supabase SQL Editor:

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  gen_random_uuid(),
  'demo@tillsup.com',
  crypt('demo123', gen_salt('bf')), -- Bcrypt hash of 'demo123'
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  'authenticated'
)
ON CONFLICT (email) DO NOTHING;

-- Step 2: Create demo business
INSERT INTO businesses (
  id,
  name,
  "ownerId",
  "subscriptionPlan",
  "subscriptionStatus",
  "trialEndsAt",
  "maxBranches",
  "maxStaff",
  currency,
  country,
  timezone,
  "businessType",
  "workingHours",
  "taxConfig",
  branding,
  "completedOnboarding",
  "createdAt"
)
VALUES (
  'demo-business-001',
  'Demo Store',
  (SELECT id FROM auth.users WHERE email = 'demo@tillsup.com'),
  'Pro',
  'active',
  now() + interval '90 days',
  10,
  50,
  'KES',
  'Kenya',
  'Africa/Nairobi',
  'Retail',
  '{"start": "08:00", "end": "20:00"}'::jsonb,
  '{"enabled": true, "name": "VAT", "percentage": 16, "inclusive": false}'::jsonb,
  '{"logoUrl": null, "primaryColor": "#0891b2", "accentColor": "#ef4444", "receiptHeader": "Demo Store", "receiptFooter": "Thank you for your purchase!", "hidePlatformBranding": false}'::jsonb,
  true,
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create demo branch
INSERT INTO branches (
  id,
  "businessId",
  name,
  location,
  "contactPhone",
  "contactEmail",
  "isActive",
  "createdAt"
)
VALUES (
  'demo-branch-001',
  'demo-business-001',
  'Main Branch',
  'Nairobi, Kenya',
  '+254712345678',
  'demo@tillsup.com',
  true,
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create demo user profile
INSERT INTO users (
  id,
  email,
  phone,
  "firstName",
  "lastName",
  role,
  "roleId",
  "businessId",
  "branchId",
  "mustChangePassword",
  "canCreateExpense",
  "createdAt"
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'demo@tillsup.com'),
  'demo@tillsup.com',
  '+254712345678',
  'Demo',
  'User',
  'Business Owner',
  null,
  'demo-business-001',
  'demo-branch-001',
  false,
  true,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  "firstName" = 'Demo',
  "lastName" = 'User',
  role = 'Business Owner',
  "businessId" = 'demo-business-001',
  "branchId" = 'demo-branch-001',
  "mustChangePassword" = false;

-- Step 5: Add some demo products
INSERT INTO products (
  id,
  "businessId",
  name,
  description,
  category,
  sku,
  barcode,
  price,
  cost,
  stock,
  "lowStockThreshold",
  "trackInventory",
  "isActive",
  "createdAt"
)
VALUES
  (gen_random_uuid(), 'demo-business-001', 'Coca-Cola 500ml', 'Refreshing soft drink', 'Beverages', 'COKE-500', '1234567890001', 80.00, 50.00, 150, 20, true, true, now()),
  (gen_random_uuid(), 'demo-business-001', 'Bread White', 'Fresh white bread loaf', 'Bakery', 'BREAD-W', '1234567890002', 55.00, 35.00, 80, 10, true, true, now()),
  (gen_random_uuid(), 'demo-business-001', 'Milk 1L', 'Fresh dairy milk', 'Dairy', 'MILK-1L', '1234567890003', 120.00, 85.00, 60, 15, true, true, now()),
  (gen_random_uuid(), 'demo-business-001', 'Sugar 2kg', 'Refined white sugar', 'Groceries', 'SUGAR-2', '1234567890004', 250.00, 180.00, 40, 10, true, true, now()),
  (gen_random_uuid(), 'demo-business-001', 'Cooking Oil 2L', 'Vegetable cooking oil', 'Groceries', 'OIL-2L', '1234567890005', 450.00, 320.00, 35, 8, true, true, now()),
  (gen_random_uuid(), 'demo-business-001', 'Rice 5kg', 'Premium white rice', 'Groceries', 'RICE-5', '1234567890006', 680.00, 520.00, 25, 5, true, true, now()),
  (gen_random_uuid(), 'demo-business-001', 'Eggs (Tray)', 'Fresh eggs 30 pieces', 'Dairy', 'EGGS-30', '1234567890007', 380.00, 280.00, 45, 10, true, true, now()),
  (gen_random_uuid(), 'demo-business-001', 'Flour 2kg', 'All-purpose wheat flour', 'Bakery', 'FLOUR-2', '1234567890008', 180.00, 130.00, 55, 12, true, true, now()),
  (gen_random_uuid(), 'demo-business-001', 'Tea Leaves 500g', 'Premium black tea', 'Beverages', 'TEA-500', '1234567890009', 320.00, 240.00, 30, 8, true, true, now()),
  (gen_random_uuid(), 'demo-business-001', 'Soap Bar', 'Antibacterial bath soap', 'Personal Care', 'SOAP-BAR', '1234567890010', 45.00, 28.00, 120, 20, true, true, now())
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Demo account created successfully!' as message,
       'Email: demo@tillsup.com' as email,
       'Password: demo123' as password;
