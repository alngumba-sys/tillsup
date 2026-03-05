# Fix Branches RLS Error (42501) - Quick Guide

## 🔴 Error Message
```
Error creating branch: {
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "new row violates row-level security policy for table \"branches\""
}
```

## 🔍 What's Happening
The Row-Level Security (RLS) policy on your `branches` table is **blocking INSERT operations**. This happens when:
- The INSERT policy is missing or incorrect
- Your user's role/business_id doesn't match the policy requirements
- The policy condition is checking the wrong fields

## ✅ Solution - Apply the SQL Fix

### Step 1: Run the SQL Script
1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of `/FIX_BRANCHES_RLS.sql`
4. Click **Run**

### Step 2: Verify the Fix
After running the script, run this query to verify policies were created:
```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'branches';
```

You should see 4 policies:
- ✅ `branches_select_policy` (SELECT)
- ✅ `branches_insert_policy` (INSERT) ← This is the critical one!
- ✅ `branches_update_policy` (UPDATE)
- ✅ `branches_delete_policy` (DELETE)

### Step 3: Test Branch Creation
Go back to your Tillsup app and try creating a branch again.

## 🔧 What the Fix Does

The new INSERT policy checks:
```sql
-- User must be a Business Owner
-- User's business_id must match the branch's business_id
EXISTS (
  SELECT 1 
  FROM profiles 
  WHERE id = auth.uid() 
    AND business_id = branches.business_id
    AND role = 'Business Owner'
)
```

## 🚨 If It Still Doesn't Work

### Check Your User Profile
Run this query in Supabase SQL Editor:
```sql
SELECT 
  id,
  email,
  role,
  business_id
FROM profiles 
WHERE id = auth.uid();
```

**Verify:**
- ✅ `role` = `'Business Owner'`
- ✅ `business_id` is not NULL
- ✅ `business_id` matches your business ID

### Check Your Business
```sql
SELECT 
  id,
  name,
  owner_id
FROM businesses 
WHERE owner_id = auth.uid();
```

**Verify:**
- ✅ You have a business record
- ✅ `owner_id` matches your user ID

### Debug the Policy
Try this test query to see if the policy would allow an insert:
```sql
SELECT 
  'Can create branch: ' || CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND role = 'Business Owner'
    ) THEN 'YES ✅'
    ELSE 'NO ❌'
  END as result;
```

## 📋 Common Issues

### Issue 1: User Role is Wrong
**Problem:** Your user's role is 'Manager', 'Cashier', or something else  
**Fix:** Update your profile:
```sql
UPDATE profiles 
SET role = 'Business Owner' 
WHERE id = auth.uid();
```

### Issue 2: Missing business_id
**Problem:** Your user's `business_id` is NULL  
**Fix:** Link your user to a business:
```sql
UPDATE profiles 
SET business_id = (SELECT id FROM businesses WHERE owner_id = auth.uid())
WHERE id = auth.uid();
```

### Issue 3: No Business Record
**Problem:** You don't have a business in the `businesses` table  
**Fix:** Create a business record first, or complete the business registration flow in the app

## 📞 Still Having Issues?

If you've tried everything above and it still doesn't work:

1. **Check Supabase Auth**: Make sure you're actually authenticated
   ```sql
   SELECT auth.uid(); -- Should return your user ID, not NULL
   ```

2. **Check Table Exists**: Verify the branches table has the correct columns
   ```sql
   \d branches
   ```

3. **Disable RLS Temporarily** (for testing only, DO NOT use in production):
   ```sql
   ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
   -- Test branch creation
   -- Then re-enable:
   ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
   ```

4. **Review Error Logs**: Check your Supabase logs for more detailed error messages

## 🎯 Summary

**Most Common Fix:**
1. Copy `/FIX_BRANCHES_RLS.sql`
2. Paste in Supabase SQL Editor
3. Run it
4. Test branch creation in your app
5. ✅ Done!

The key fix is the INSERT policy which properly checks:
- User is authenticated
- User role is 'Business Owner'
- User's business_id matches the branch's business_id
