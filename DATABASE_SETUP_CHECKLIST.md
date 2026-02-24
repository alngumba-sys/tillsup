# ✅ Database Setup Checklist - Password Reset Function

## 🎯 Goal
Create the password reset database function so staff password resets work properly.

---

## 📋 Checklist

### Before You Start
- [ ] You have access to your Supabase project
- [ ] You know your Supabase project URL
- [ ] You have the file `/supabase_password_reset_function.sql` available

---

### Step-by-Step Setup

#### ☑️ Step 1: Open Supabase SQL Editor
- [ ] Go to https://app.supabase.com
- [ ] Login to your account
- [ ] Click on your **Tillsup** project
- [ ] Click **"SQL Editor"** in the left sidebar (looks like `</>` icon)
- [ ] You should see the SQL Editor interface

#### ☑️ Step 2: Prepare the SQL Script
- [ ] Open the file: `/supabase_password_reset_function.sql` in your code editor
- [ ] Verify it has 110 lines of code
- [ ] Select all (Ctrl+A / Cmd+A)
- [ ] Copy the entire content (Ctrl+C / Cmd+C)

#### ☑️ Step 3: Create New Query in Supabase
- [ ] In Supabase SQL Editor, click **"New query"** button
- [ ] A blank SQL editor appears
- [ ] Paste the copied SQL code (Ctrl+V / Cmd+V)
- [ ] Verify the code starts with: `-- TILLSUP: Admin Password Reset Function`
- [ ] Verify the code ends with verification comments

#### ☑️ Step 4: Execute the SQL
- [ ] Click the **"Run"** button (top right)
- [ ] OR press **Ctrl+Enter** (Windows/Linux) or **Cmd+Enter** (Mac)
- [ ] Wait for execution (1-3 seconds)

#### ☑️ Step 5: Verify Success
- [ ] You see: **"Success. No rows returned"** message
- [ ] No error messages appear
- [ ] The function was created successfully

#### ☑️ Step 6: Test Password Reset
- [ ] Go to your Tillsup application
- [ ] Navigate to **Staff Management** page
- [ ] Find any staff member
- [ ] Click the **🔑 key icon** (Reset Password)
- [ ] Confirm the reset
- [ ] ✅ Success dialog appears with temporary password (e.g., "K8M3")
- [ ] ✅ NO errors in console!

---

## 🎉 Success Criteria

You'll know it worked when:

✅ SQL execution shows "Success. No rows returned"  
✅ No error messages in Supabase  
✅ Password reset button works in Tillsup  
✅ Temporary password is generated (4 characters like "K8M3")  
✅ No console errors about missing function  

---

## ⚠️ Troubleshooting

### Problem: "Permission denied for schema auth"

**Solution:**
This function needs special permissions to access `auth.users`. If you get this error:

1. Make sure you're running it in the **SQL Editor** (not Table Editor)
2. Check you have admin/owner access to the project
3. Try running as service_role (ask Supabase support if needed)

---

### Problem: "Function already exists"

**Solution:**
Great! The function is already there. Try:

1. Refresh your browser (Ctrl+Shift+R)
2. Clear browser cache
3. Test password reset again

---

### Problem: Still getting "function not found" error

**Solution:**

1. **Verify function exists** - Run this query in SQL Editor:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'admin_reset_staff_password';
   ```
   Should return 1 row

2. **Check function details** - Run this:
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'admin_reset_staff_password';
   ```
   Should return function details

3. **Refresh schema cache**:
   - In Supabase, go to Settings > API
   - Copy your project URL
   - In your app, make sure you're connected to the right project

---

## 📝 What This Function Does

Once created, the `admin_reset_staff_password` function:

1. ✅ **Validates permissions** - Only Owners/Managers can reset passwords
2. ✅ **Checks business isolation** - Can only reset passwords in same business
3. ✅ **Protects Owner accounts** - Only Owners can reset Owner passwords
4. ✅ **Updates auth.users** - Actually sets the password in Supabase Auth
5. ✅ **Sets change flag** - Forces staff to change password on next login
6. ✅ **Returns status** - Success or error message

**Security Level:** SECURITY DEFINER (has special privileges)  
**Execution:** Server-side only (cannot be bypassed)  
**Audit:** All changes logged by Supabase  

---

## 🔐 Security Notes

This function is **SECURE** because:

- ✅ Role-based access control (Owner/Manager only)
- ✅ Business isolation enforced
- ✅ Cannot reset passwords across businesses
- ✅ Server-side validation (cannot be bypassed from client)
- ✅ Uses SECURITY DEFINER safely
- ✅ All database constraints respected
- ✅ Audit trail via Supabase logs

---

## 📚 Related Documentation

For more details, see:

- **Main Guide:** `/PASSWORD_RESET_COMPLETE_GUIDE.md`
- **Quick Start:** `/PASSWORD_RESET_QUICK_START.md`
- **Fix Guide:** `/FIX_PASSWORD_RESET_ERROR.md`
- **Setup Instructions:** `/SETUP_INSTRUCTIONS.txt`
- **SQL File:** `/supabase_password_reset_function.sql`

---

## ⏱️ Time Estimate

- **Reading this checklist:** 2 minutes
- **Running SQL in Supabase:** 1 minute
- **Testing the feature:** 1 minute
- **Total:** ~4 minutes

---

## 💡 Pro Tips

1. **Save the query** - In Supabase SQL Editor, you can save this query for future reference
2. **Test immediately** - Don't wait - test password reset right away to confirm it works
3. **One-time setup** - You only need to do this once per Supabase project
4. **Document it** - Keep a note that you've run this migration
5. **Backup** - Supabase automatically backs up your database, but good to know!

---

## ✅ Final Checklist

Before closing this guide:

- [ ] SQL function created in Supabase ✅
- [ ] "Success" message received ✅
- [ ] Tested password reset in app ✅
- [ ] Temporary password generated ✅
- [ ] No console errors ✅
- [ ] Staff can login with temp password ✅
- [ ] Staff can change password ✅
- [ ] Everything works perfectly! 🎉

---

## 🎊 You're Done!

Once all checkboxes are checked, your password reset feature is **fully functional**!

**Next steps:**
- Use the feature to reset staff passwords
- Share the simple 4-character passwords easily
- Enjoy the smooth workflow! 🚀

---

**Questions?** Check the documentation files or test the feature to see it in action!
