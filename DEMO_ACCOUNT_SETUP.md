# Demo Account Setup Instructions

## Option 1: Quick Setup via Supabase Dashboard (RECOMMENDED)

### Step 1: Create Auth User
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add user"** button
4. Fill in:
   - **Email**: `demo@tillsup.com`
   - **Password**: `demo123`
   - Check **"Auto Confirm User"** (important!)
5. Click **"Create user"**
6. **Copy the UUID** of the created user (you'll need this)

### Step 2: Run SQL in Supabase SQL Editor

Go to **SQL Editor** in your Supabase dashboard and run this:

```sql
-- Replace 'USER_UUID_HERE' with the actual UUID from Step 1

-- Create demo business
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
  'USER_UUID_HERE',  -- ⚠️ REPLACE THIS
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
ON CONFLICT (id) DO UPDATE SET
  "ownerId" = 'USER_UUID_HERE';  -- ⚠️ REPLACE THIS

-- Create demo branch
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

-- Create demo user profile
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
  'USER_UUID_HERE',  -- ⚠️ REPLACE THIS
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
```

### Step 3: Test Login
1. Go to your app's login page
2. Click **"Use Demo Account"** button
3. Click **"Sign In"**
4. You should be logged in! ✅

---

## Option 2: Simple Registration (Alternative)

If the above seems complicated, just use the **Register** flow:

1. Click **"Register Your Business"** on the login page
2. Fill out the registration form with any business details
3. Use that email/password to log in

---

## Credentials Reference

**Email**: `demo@tillsup.com`  
**Password**: `demo123`  
**Business**: Demo Store  
**Branch**: Main Branch  
**Role**: Business Owner

---

## Troubleshooting

### Error: "Invalid login credentials"
- Make sure you created the user in Supabase Auth
- Make sure you checked "Auto Confirm User"
- Verify the UUID was copied correctly in the SQL

### Error: "No business found"
- Run the SQL migration in Step 2
- Make sure you replaced `USER_UUID_HERE` with the actual UUID

### Still having issues?
- Check the browser console for detailed error messages
- Verify your Supabase connection is working
- Try registering a new account instead
