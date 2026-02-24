# 🔧 Fix Password Reset Error - Quick Guide

## ❌ The Error You're Seeing

```
Could not find the function public.admin_reset_staff_password
```

## ✅ The Solution

The database function hasn't been created yet. You need to run the SQL script in Supabase.

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your **Tillsup project**
3. Click on **"SQL Editor"** in the left sidebar (icon looks like `</>`)

### Step 2: Create New Query

1. Click **"New query"** button (top right)
2. You'll see an empty SQL editor

### Step 3: Copy the SQL Code

1. Open the file: `/supabase_password_reset_function.sql` (in your project root)
2. **Copy ALL the contents** (the entire file - 110 lines)

### Step 4: Paste and Run

1. **Paste** the SQL code into the Supabase SQL Editor
2. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
3. Wait for execution (should take 1-2 seconds)

### Step 5: Verify Success

You should see:
```
✅ Success. No rows returned
```

This means the function was created successfully!

---

## 🎯 What This Does

The SQL script creates a secure database function that:

1. ✅ Validates admin permissions (Business Owner/Manager only)
2. ✅ Checks business isolation (same business only)
3. ✅ Updates password in Supabase Auth (`auth.users`)
4. ✅ Sets `must_change_password = true` flag
5. ✅ Returns success/error status

---

## 🧪 Test It

After running the SQL:

1. Go to **Staff Management** page in Tillsup
2. Click the **🔑 key icon** next to any staff member
3. Confirm the password reset
4. You should see a success dialog with a temporary password (e.g., `K8M3`)
5. ✅ **No more errors!**

---

## ⚠️ Troubleshooting

### If you see "permission denied for schema auth"

This is expected - you need to grant yourself permission:

1. In Supabase Dashboard, go to **Settings** > **Database**
2. Find your **service_role key** (keep it secret!)
3. Or contact Supabase support to grant access to `auth` schema

### If you see "function already exists"

Great! The function is already there. The error might be:
- Schema cache issue - try refreshing your browser
- Check you're using the correct Supabase project

### If the error persists

1. **Refresh your browser** (clear cache: Ctrl+Shift+R)
2. **Check Supabase connection** - make sure you're connected
3. **Verify the function exists**:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'admin_reset_staff_password';
   ```
   Should return one row

---

## 📝 Quick Summary

**Problem:** Database function missing  
**Solution:** Run the SQL file in Supabase SQL Editor  
**File:** `/supabase_password_reset_function.sql`  
**Time:** 2 minutes  
**Difficulty:** Easy (just copy & paste)  

---

## ✅ After This Fix

Password resets will work perfectly:

1. Admin clicks reset → Gets temp password (e.g., `K8M3`)
2. Admin shares with staff
3. Staff logs in → Auto-redirect to change password
4. Staff creates personal password
5. Done! ✨

---

**Need help? The SQL file has all the code ready - just copy and paste!** 🚀
