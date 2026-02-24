# 🔧 REGISTRATION FIX & TRIAL ACCESS GUIDE

## ✅ WHAT WAS FIXED

### 1. **Trial Users Now Have Full Access to All Modules** ✨
   - **FREE TRIAL** plan now includes ALL features (previously restricted)
   - Trial users can access:
     - ✅ Full POS Terminal
     - ✅ Inventory Management
     - ✅ Advanced Reports & Analytics
     - ✅ Expense Management
     - ✅ AI-Powered Forecasting
     - ✅ Purchase Orders
     - ✅ Supplier Management
     - ✅ Export Data
     - ✅ API Access
     - ✅ Custom Branding
     - ✅ All Enterprise features

### 2. **Better Error Messages for Registration Issues** 📝
   - Now provides clear, actionable error messages
   - Logs detailed error information for debugging
   - Distinguishes between:
     - Permission denied (RLS policy issues)
     - Duplicate records (user already exists)
     - Other database errors

---

## 🚨 CRITICAL: FIX THE REGISTRATION ERROR

### The Problem
**Error:** "Failed to create business record: permission denied for table users"

**Root Cause:** Supabase Row Level Security (RLS) policies are blocking new user registrations

### The Solution
You **MUST** run the SQL script in your Supabase dashboard:

#### **📄 File:** `/FIX_REGISTRATION_RLS.sql`

#### **Steps to Fix:**

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your Tillsup project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy & Paste the SQL**
   - Open `/FIX_REGISTRATION_RLS.sql` from your project root
   - Copy ALL the SQL code
   - Paste it into the Supabase SQL Editor

4. **Run the Script**
   - Click "Run" (or press Ctrl+Enter)
   - Wait for success confirmation
   - You should see "Success. No rows returned"

5. **Test Registration**
   - Try registering a new user
   - The error should be gone!

---

## 🔍 WHAT THE SQL FIX DOES

The SQL script fixes the database permissions by:

1. **Dropping Old/Conflicting RLS Policies**
   - Removes any broken or restrictive policies

2. **Creating Proper INSERT Policies**
   - Allows authenticated users to insert into `businesses` table
   - Allows authenticated users to insert into `profiles` table
   - Ensures `owner_id` matches the authenticated user

3. **Adding Proper SELECT Policies**
   - Users can read their own business data
   - Users can read their own profile data
   - Business owners can read staff profiles

4. **Granting Database Permissions**
   - Grants INSERT, SELECT, UPDATE to authenticated role
   - Ensures proper table-level permissions

5. **Creating Safety Triggers**
   - Auto-sets `owner_id` if missing
   - Validates profile ID matches auth user
   - Prevents unauthorized data creation

---

## ✅ VERIFICATION STEPS

### After Running the SQL Script:

1. **Check Policies Were Created**
   ```sql
   SELECT tablename, policyname, cmd
   FROM pg_policies
   WHERE tablename IN ('businesses', 'profiles');
   ```
   You should see:
   - `authenticated_insert_businesses`
   - `authenticated_select_businesses`
   - `authenticated_insert_profiles`
   - `authenticated_select_profiles`

2. **Check Permissions Were Granted**
   ```sql
   SELECT table_name, privilege_type
   FROM information_schema.table_privileges
   WHERE table_schema = 'public' 
   AND table_name IN ('businesses', 'profiles')
   AND grantee = 'authenticated';
   ```
   You should see INSERT, SELECT, UPDATE for both tables

3. **Test User Registration**
   - Go to your registration page
   - Fill out the form
   - Submit registration
   - Check for success (no error messages)

4. **Verify Data in Supabase**
   - Open Supabase Table Editor
   - Check `businesses` table - new record should exist
   - Check `profiles` table - new record should exist

---

## 🔑 KEY CHANGES IN CODE

### `/src/app/utils/subscription.ts`
**Free Trial Plan Features** - Now ALL set to `true`:
```typescript
features: {
  basicPOS: true,
  fullPOS: true,           // ✅ Changed from false
  inventory: true,
  basicReports: true,
  advancedReports: true,   // ✅ Changed from false
  expenseTracking: true,   // ✅ Changed from false
  expenseManagement: true, // ✅ Changed from false
  forecasting: true,       // ✅ Changed from false
  purchaseOrders: true,    // ✅ Changed from false
  supplierManagement: true,// ✅ Changed from false
  customBranding: true,    // ✅ Changed from false
  exportData: true,        // ✅ Changed from false
  apiAccess: true,         // ✅ Changed from false
  aiInsights: true,        // ✅ Changed from false
  emailSupport: true,
  prioritySupport: true    // ✅ Changed from false
}
```

### `/src/app/hooks/useSubscription.ts`
**Trial Override Added**:
```typescript
const checkFeature = (feature: keyof PlanFeatures) => {
  // Override for Demo User
  if (user?.email === "demo@test.com") return true;

  // ✅ NEW: Override for Trial Users - give full access
  if (business?.subscriptionStatus === "trial") return true;

  return hasFeature(currentPlanName, feature);
};
```

### `/src/app/contexts/AuthContext.tsx`
**Better Error Messages**:
```typescript
// Now provides specific error messages for:
// - Permission denied errors
// - Duplicate record errors
// - Detailed console logging for debugging
```

---

## 📊 TESTING CHECKLIST

- [ ] SQL script executed successfully in Supabase
- [ ] RLS policies visible in Supabase Dashboard
- [ ] New user registration works (no permission errors)
- [ ] New business record created in `businesses` table
- [ ] New profile record created in `profiles` table
- [ ] Trial user can access all dashboard modules
- [ ] Trial user sees no "Upgrade" restrictions
- [ ] Console shows no permission errors

---

## 🆘 TROUBLESHOOTING

### If Registration Still Fails:

1. **Check Supabase Logs**
   - Dashboard → Logs → Database
   - Look for error messages

2. **Verify RLS is Enabled**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('businesses', 'profiles');
   ```
   Both should show `rowsecurity = true`

3. **Check Auth User Creation**
   - Dashboard → Authentication → Users
   - Verify new user appears (even if registration fails)
   - If user exists, they might need to login instead

4. **Manual Policy Check**
   ```sql
   -- Check if policies exist
   \d+ businesses
   \d+ profiles
   ```

5. **Reset Policies** (Last Resort)
   ```sql
   DROP POLICY IF EXISTS "authenticated_insert_businesses" ON businesses;
   DROP POLICY IF EXISTS "authenticated_insert_profiles" ON profiles;
   -- Then re-run the FIX_REGISTRATION_RLS.sql script
   ```

---

## 💡 ADDITIONAL NOTES

### Trial Period Benefits
- **Duration:** 30 days from registration
- **Branch Limit:** 1 branch
- **Staff Limit:** 5 staff members
- **Features:** Full access to ALL features (same as Enterprise)
- **Purpose:** Let users fully test the platform before committing

### After Trial Expires
Users will need to:
- Upgrade to a paid plan (Starter, Professional, or Enterprise)
- Or contact sales for extension
- Data is preserved during trial-to-paid transition

### Demo Account
The demo account (`demo@test.com`) continues to have unlimited access regardless of subscription status.

---

## 📞 NEED HELP?

If the registration error persists after running the SQL script:

1. **Check Browser Console**
   - Press F12
   - Look for red errors
   - Share error messages with support

2. **Check Supabase Dashboard**
   - Settings → API
   - Verify API URL and anon key are correct

3. **Check Network Tab**
   - F12 → Network tab
   - Try registration
   - Look for failed requests (red)
   - Check response details

4. **Contact Support**
   - Provide the error message from browser console
   - Provide Supabase project ID
   - Mention you've run FIX_REGISTRATION_RLS.sql

---

## ✅ SUMMARY

**What's Fixed:**
✅ Trial users have full access to all modules
✅ Better error messages for registration failures
✅ SQL script provided to fix RLS policies

**What You Need to Do:**
🔴 **CRITICAL:** Run `/FIX_REGISTRATION_RLS.sql` in Supabase SQL Editor
🟢 Test user registration after running SQL
🟢 Verify trial users can access all features

**Expected Outcome:**
- New users can register successfully
- Trial users see all dashboard modules
- No "permission denied" errors
- Full platform access during 30-day trial
