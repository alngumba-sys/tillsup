# Branches RLS Error Fix - Complete Summary

## ✅ What Was Fixed

You were getting error code **42501** when trying to create branches:
```
"new row violates row-level security policy for table 'branches'"
```

This was caused by **incorrect or missing RLS INSERT policies** on the `branches` table in Supabase.

---

## 🔧 Changes Made

### 1. **Created SQL Fix Script** (`/FIX_BRANCHES_RLS.sql`)
   - Drops all existing branch policies to start fresh
   - Creates proper SELECT, INSERT, UPDATE, and DELETE policies
   - **Key fix**: INSERT policy now correctly checks:
     - User is authenticated
     - User role is 'Business Owner'
     - User's business_id matches the branch's business_id

### 2. **Updated BranchContext** (`/src/app/contexts/BranchContext.tsx`)
   - Added specific error handling for RLS errors (code 42501)
   - Returns `errorCode` in result to help identify RLS issues
   - Logs detailed error information for debugging
   - Shows helpful error message pointing to the SQL fix

### 3. **Updated BranchManagementTab** (`/src/app/components/staff/BranchManagementTab.tsx`)
   - Added special toast notification for RLS errors
   - Shows clear message directing users to run the SQL fix script
   - Increased toast duration to 8 seconds for important errors

### 4. **Created Documentation** (`/FIX_BRANCHES_ERROR_GUIDE.md`)
   - Step-by-step guide to fix the issue
   - Troubleshooting steps for common problems
   - Verification queries to check if fix worked

---

## 📋 How to Apply the Fix

### Quick Steps:
1. **Open Supabase Dashboard** → SQL Editor
2. **Copy** the contents of `/FIX_BRANCHES_RLS.sql`
3. **Paste** into SQL Editor
4. **Click "Run"**
5. **Test** branch creation in your app

### Verification:
After running the script, verify policies were created:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'branches';
```

You should see:
- ✅ `branches_select_policy` (SELECT)
- ✅ `branches_insert_policy` (INSERT)
- ✅ `branches_update_policy` (UPDATE)
- ✅ `branches_delete_policy` (DELETE)

---

## 🎯 The Core Fix

The critical part is the INSERT policy:

```sql
CREATE POLICY "branches_insert_policy" ON branches
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
      AND business_id = branches.business_id
      AND role = 'Business Owner'
  )
);
```

This ensures:
1. ✅ User is authenticated (has auth.uid())
2. ✅ User is a Business Owner
3. ✅ User belongs to the same business as the branch being created

---

## 🔍 Troubleshooting

### If it still doesn't work:

**Check your user profile:**
```sql
SELECT id, email, role, business_id 
FROM profiles 
WHERE id = auth.uid();
```

**Verify:**
- Role should be `'Business Owner'`
- business_id should not be NULL
- business_id should match your actual business

**Check your business:**
```sql
SELECT id, name, owner_id 
FROM businesses 
WHERE owner_id = auth.uid();
```

**Verify:**
- You have a business record
- owner_id matches your user ID

---

## 🚨 Common Issues & Solutions

| Issue | Problem | Solution |
|-------|---------|----------|
| **Wrong Role** | User role is not 'Business Owner' | Update: `UPDATE profiles SET role = 'Business Owner' WHERE id = auth.uid();` |
| **Missing business_id** | User's business_id is NULL | Update: `UPDATE profiles SET business_id = (SELECT id FROM businesses WHERE owner_id = auth.uid()) WHERE id = auth.uid();` |
| **No Business** | No business record exists | Complete business registration in app first |
| **Not Authenticated** | auth.uid() returns NULL | Log out and log back in |

---

## 📁 Files Changed

1. ✅ `/FIX_BRANCHES_RLS.sql` - SQL fix script (NEW)
2. ✅ `/FIX_BRANCHES_ERROR_GUIDE.md` - Detailed guide (NEW)
3. ✅ `/src/app/contexts/BranchContext.tsx` - Better error handling (UPDATED)
4. ✅ `/src/app/components/staff/BranchManagementTab.tsx` - Better error messages (UPDATED)

---

## 🎉 Expected Result

After applying the fix:
- ✅ Business Owners can create branches without errors
- ✅ Clear error messages if permissions are wrong
- ✅ Proper logging for debugging
- ✅ All CRUD operations (Create, Read, Update, Delete) work correctly

---

## 🔒 Security Notes

The RLS policies ensure:
- ✅ Only Business Owners can create/update/delete branches
- ✅ Users can only see branches in their own business
- ✅ Staff members can view but not modify branches
- ✅ No cross-business data access

---

## 📞 Next Steps

1. **Deploy the code changes** (BranchContext and BranchManagementTab updates)
2. **Run the SQL script** in Supabase SQL Editor
3. **Test branch creation** in your app
4. **Verify** that the error is resolved

If you still have issues after running the SQL script, check the troubleshooting section in `/FIX_BRANCHES_ERROR_GUIDE.md`.

---

**Last Updated:** March 5, 2026  
**Status:** ✅ Ready to Deploy
