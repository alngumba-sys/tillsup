# Admin Dashboard RLS Setup

## Problem
The Admin Dashboard cannot see any businesses because Row Level Security (RLS) policies on the `businesses` table only allow users to see their own business.

## Solution
Create RLS policies that allow the special admin user (`admin@tillsup.internal`) to access ALL businesses and profiles.

## SQL to Run in Supabase SQL Editor

Run this SQL in your Supabase Dashboard → SQL Editor:

```sql
-- ============================================================================
-- ADMIN ACCESS RLS POLICIES
-- ============================================================================
-- These policies allow the Platform Admin user to access all data
-- for the Admin Dashboard to function properly.
-- ============================================================================

-- 1. Allow admin to read all businesses
CREATE POLICY "Platform Admin can read all businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  auth.email() = 'admin@tillsup.internal'
  OR
  auth.uid() = owner_id
);

-- 2. Allow admin to read all profiles  
CREATE POLICY "Platform Admin can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.email() = 'admin@tillsup.internal'
  OR
  auth.uid() = id
);

-- 3. Allow admin to read all sales
CREATE POLICY "Platform Admin can read all sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  auth.email() = 'admin@tillsup.internal'
  OR
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = sales.business_id 
    AND businesses.owner_id = auth.uid()
  )
);

-- 4. Allow admin to manage platform assets
CREATE POLICY "Platform Admin can manage platform assets"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'platform-assets' 
  AND auth.email() = 'admin@tillsup.internal'
)
WITH CHECK (
  bucket_id = 'platform-assets' 
  AND auth.email() = 'admin@tillsup.internal'
);
```

## Alternative: Drop and Recreate Policies

If you already have conflicting policies, drop them first:

```sql
-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Platform Admin can read all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Platform Admin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform Admin can read all sales" ON public.sales;
DROP POLICY IF EXISTS "Platform Admin can manage platform assets" ON storage.objects;

-- Then run the CREATE POLICY statements above
```

## How to Access Admin Dashboard

1. Go to the landing page (`/`)
2. Click the Tillsup logo 5 times quickly
3. You'll be redirected to `/admin-login`
4. Enter credentials:
   - **Username**: `Admin`
   - **Password**: `Tillsup@2026`
5. The system will automatically:
   - Create a Supabase account at `admin@tillsup.internal`
   - Authenticate you
   - Redirect you to `/admin-hidden`

## Verify It's Working

After running the SQL and logging in:

1. The Admin Dashboard should show all businesses in the "Platform Overview" section
2. You should see:
   - Total Businesses count
   - Business names, owners, phone numbers
   - Customer counts
   - Sales volumes
3. The "Platform Assets" tab should allow uploading logos

## Troubleshooting

### Still showing "0 businesses"?

Check in Supabase SQL Editor:
```sql
-- Check if admin user exists
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'admin@tillsup.internal';

-- Check current policies on businesses table
SELECT * FROM pg_policies WHERE tablename = 'businesses';

-- Manually test the policy as admin
SET request.jwt.claim.email = 'admin@tillsup.internal';
SELECT * FROM businesses;
```

### Email confirmation required?

If Supabase requires email confirmation:
1. Go to Supabase Dashboard → Authentication → Providers → Email
2. Disable "Confirm email" (for development only)
3. Or manually confirm the admin user in the Auth → Users table

## Security Notes

⚠️ **Important**: This admin account has access to ALL business data. In production:
- Use a strong, unique password (change `Tillsup@2026`)
- Enable 2FA for the admin account
- Log admin access
- Restrict admin panel access by IP if possible
- Never share admin credentials
