# ✅ REGISTRATION ERRORS - FINAL FIX

## 🎯 Quick Start

You encountered an error with the first SQL file. **Use this corrected file instead:**

### **⭐ RUN THIS FILE: `/APPLY_THIS_FIXED.sql`**

1. Open Supabase Dashboard → SQL Editor
2. Copy **ALL** content from `/APPLY_THIS_FIXED.sql`
3. Paste and click "Run"
4. Done! ✅

---

## ❌ Errors You're Seeing

```
Error 1: "infinite recursion detected in policy for relation profiles"
Error 2: "permission denied for table users"
Error 3: "function pg_get_expr(text, regclass) does not exist" (from first SQL attempt)
```

---

## 📁 Files Available (Use in This Order)

| Priority | File | Use When |
|----------|------|----------|
| **1st** | `/APPLY_THIS_FIXED.sql` | ⭐ **Use this first** - corrected version |
| **2nd** | `/SIMPLE_FIX_NO_VERIFICATION.sql` | Backup if the first one has any issues |
| ❌ | `/APPLY_THIS_SQL_NOW.sql` | Don't use - has the pg_get_expr error |

---

## 🔧 What Gets Fixed

### The SQL Script Will:

✅ **Remove infinite recursion** in profiles RLS policy  
✅ **Grant permissions** to auth.users table  
✅ **Drop problematic triggers** that access auth.users  
✅ **Create clean, simple RLS policies**  
✅ **Enable table permissions** for authenticated users  
✅ **Create safe auto-set trigger** for owner_id  

### After Running:

✅ New users can register  
✅ No "infinite recursion" errors  
✅ No "permission denied" errors  
✅ Business records created properly  
✅ Profile records created properly  
✅ Trial users have full access to all modules  

---

## 📊 What You'll See After Running the SQL

### Result Set 1: Policies Created ✅
```
businesses_insert
businesses_select
businesses_update
businesses_delete
profiles_insert
profiles_select
profiles_update
profiles_delete
```
**Expected:** 8 policies total

### Result Set 2: Permissions Granted ✅
```
Table: businesses - INSERT, SELECT, UPDATE, DELETE (authenticated)
Table: profiles - INSERT, SELECT, UPDATE, DELETE (authenticated)
Table: users - SELECT (authenticated)
```

### Result Set 3: Triggers Created ✅
```
auto_set_owner_id (businesses table)
```
**Purpose:** Automatically sets owner_id if null during insert

---

## 🧪 Testing After Running SQL

### Step 1: Open Browser Console
- Press **F12**
- Go to **Console** tab
- Keep it open during registration

### Step 2: Attempt Registration
1. Navigate to registration page
2. Fill out the form:
   - Business name
   - Owner email
   - Password
   - First/Last name
   - Phone
   - Currency
   - Country
3. Click "Register"

### Step 3: Verify Success ✅
**Browser Console Should Show:**
- ✅ No "infinite recursion" errors
- ✅ No "permission denied" errors
- ✅ Registration successful message

**Supabase Table Editor Should Show:**
- ✅ New record in `businesses` table
- ✅ New record in `profiles` table

### Step 4: Test Login
1. Login with the new credentials
2. Verify dashboard loads
3. Check that all modules are accessible

---

## 🔍 Root Cause Analysis

### Error 1: Infinite Recursion
**Problem:**
```sql
-- OLD POLICY (CAUSES RECURSION)
CREATE POLICY "profiles_select" ON profiles
USING (
  id = auth.uid() 
  OR business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  )
);
```
The policy queries `profiles` while evaluating access to `profiles` → infinite loop

**Solution:**
```sql
-- NEW POLICY (NO RECURSION)
CREATE POLICY "profiles_select" ON profiles
USING (
  id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = profiles.business_id 
    AND b.owner_id = auth.uid()
  )
);
```
Queries `businesses` instead of `profiles` → no recursion

### Error 2: Permission Denied for Table Users
**Problem:**
- Triggers trying to access `auth.users` without permission
- `authenticated` role didn't have SELECT on `auth.users`

**Solution:**
```sql
-- Grant permission
GRANT SELECT ON auth.users TO authenticated;

-- Drop problematic triggers
DROP TRIGGER IF EXISTS validate_business_owner_trigger ON businesses;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

### Error 3: pg_get_expr Error (From First SQL Attempt)
**Problem:**
```sql
-- INCORRECT - qual is already text in pg_policies view
pg_get_expr(qual, (schemaname||'.'||tablename)::regclass)
```

**Solution:**
```sql
-- FIXED - Removed the problematic verification query
-- Simplified to just show policy names
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('businesses', 'profiles');
```

---

## 🎁 Bonus: Trial Users Have Full Access

**Already Fixed in Your Code:**

Changes made to `/src/app/utils/subscription.ts` and `/src/app/hooks/useSubscription.ts`:

### Free Trial Plan Features (ALL Enabled)
```typescript
features: {
  basicPOS: true,
  fullPOS: true,           // ✅ Now enabled
  inventory: true,
  basicReports: true,
  advancedReports: true,   // ✅ Now enabled
  expenseTracking: true,   // ✅ Now enabled
  expenseManagement: true, // ✅ Now enabled
  forecasting: true,       // ✅ Now enabled
  purchaseOrders: true,    // ✅ Now enabled
  supplierManagement: true,// ✅ Now enabled
  customBranding: true,    // ✅ Now enabled
  exportData: true,        // ✅ Now enabled
  apiAccess: true,         // ✅ Now enabled
  aiInsights: true,
  emailSupport: true,
  prioritySupport: true    // ✅ Now enabled
}
```

### Trial Status Override
```typescript
// Trial users get ALL features regardless of plan details
if (business?.subscriptionStatus === "trial") return true;
```

---

## 🚨 Troubleshooting

### If Registration Still Fails:

#### 1. Verify SQL Ran Successfully
- Check Supabase SQL Editor output
- Should say "Success" at top
- Should show 3 result sets at bottom

#### 2. Manually Check Policies
Run this query in Supabase SQL Editor:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('businesses', 'profiles')
ORDER BY tablename, policyname;
```
**Expected:** 8 policies (4 for businesses, 4 for profiles)

#### 3. Check Permissions
```sql
SELECT table_name, privilege_type, grantee
FROM information_schema.table_privileges
WHERE table_name IN ('businesses', 'profiles', 'users')
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;
```
**Expected:** INSERT, SELECT, UPDATE, DELETE on businesses and profiles

#### 4. Check Browser Console
- Press F12
- Try registration
- Note exact error message
- Look for red errors

#### 5. Check Supabase Logs
- Dashboard → Logs → Database
- Filter by timestamp of registration attempt
- Look for detailed error messages

#### 6. Try Alternative SQL
If `/APPLY_THIS_FIXED.sql` has issues, use:
- `/SIMPLE_FIX_NO_VERIFICATION.sql`

This has no verification queries, just the core fixes.

---

## 📞 Still Having Issues?

### Information to Gather:

1. **Exact error message** from browser console (F12)
2. **Supabase logs** from Dashboard → Logs → Database
3. **SQL execution output** - did it say "Success"?
4. **Policy count** - run the verification query above
5. **Which SQL file** you ran

### Common Issues:

| Issue | Solution |
|-------|----------|
| "Policies not found" | Re-run the SQL script |
| "Still recursion error" | Make sure you ran the ENTIRE script |
| "Permission still denied" | Check that GRANT SELECT on auth.users succeeded |
| "SQL syntax error" | Use `/SIMPLE_FIX_NO_VERIFICATION.sql` instead |

---

## ✅ Summary Checklist

- [ ] Opened Supabase Dashboard → SQL Editor
- [ ] Ran `/APPLY_THIS_FIXED.sql` (or `/SIMPLE_FIX_NO_VERIFICATION.sql`)
- [ ] SQL executed successfully (saw "Success" message)
- [ ] Verified 8 policies created (ran verification query)
- [ ] Tested user registration
- [ ] No "infinite recursion" error in browser console
- [ ] No "permission denied" error in browser console
- [ ] New records appear in businesses & profiles tables
- [ ] Can login with new account
- [ ] Dashboard loads successfully
- [ ] Trial user can access all modules

---

## 🎯 Expected Final State

After completing all steps:

### Database State ✅
- 8 RLS policies active (4 for businesses, 4 for profiles)
- Permissions granted on auth.users, businesses, profiles
- 1 trigger: auto_set_owner_id on businesses
- RLS enabled on both tables

### Application State ✅
- New users can register without errors
- Business records created with correct owner_id
- Profile records created with correct user id
- Trial users see all dashboard modules
- No feature restrictions during trial period

### User Experience ✅
- Smooth registration flow
- No error messages
- Immediate access to all features
- 30-day trial with full functionality

---

**🚀 Action Required: Run `/APPLY_THIS_FIXED.sql` in Supabase SQL Editor NOW!**
