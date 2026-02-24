# ✅ Password Reset Setup Checklist

## 📋 Pre-Setup Checklist

- [ ] You have access to Supabase Dashboard
- [ ] You can access SQL Editor in Supabase
- [ ] You are logged into your Tillsup Supabase project
- [ ] You have read `/PASSWORD_RESET_README.md`

---

## 🔧 Setup Steps

### Step 1: Open Supabase SQL Editor
- [ ] Open Supabase Dashboard (https://supabase.com/dashboard)
- [ ] Select your Tillsup project
- [ ] Click "SQL Editor" in left sidebar
- [ ] Click "New query" button

### Step 2: Copy and Run SQL Script
- [ ] Open `/supabase_password_reset_function.sql` from this project
- [ ] Copy ALL content (Ctrl+A, then Ctrl+C)
- [ ] Paste into Supabase SQL Editor (Ctrl+V)
- [ ] Click "Run" button or press Ctrl+Enter
- [ ] Wait for execution
- [ ] Verify you see "Success. No rows returned" message

### Step 3: Verify Installation
- [ ] Run this verification query in SQL Editor:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'admin_reset_staff_password';
```
- [ ] Should return one row with `routine_name: admin_reset_staff_password`
- [ ] If empty, the function didn't install - try Step 2 again

---

## 🧪 Testing Checklist

### Test 1: Admin Can Reset Password
- [ ] Login to Tillsup as Business Owner or Manager
- [ ] Navigate to Staff Management tab
- [ ] Find a test staff member in the list
- [ ] Click the key icon (🔑) next to their name
- [ ] Confirmation dialog appears
- [ ] Click "Confirm Reset"
- [ ] Success dialog appears with temporary password
- [ ] Temporary password is displayed (12 characters)
- [ ] Click "Copy" button to copy password
- [ ] Password copied to clipboard
- [ ] No errors in browser console (press F12 to check)

### Test 2: Staff Can Login with Temporary Password
- [ ] Logout from admin account
- [ ] Go to login page
- [ ] Enter staff member's email
- [ ] Paste the temporary password
- [ ] Click "Sign In"
- [ ] Login succeeds (no "Invalid credentials" error)
- [ ] Automatically redirected to `/change-password` page
- [ ] Change Password page displays correctly
- [ ] Welcome message shows staff member's name

### Test 3: Staff Can Change Password
- [ ] On Change Password page
- [ ] Enter a new password (minimum 6 characters)
- [ ] Enter the same password in "Confirm" field
- [ ] Click "Change Password & Continue"
- [ ] No errors appear
- [ ] Redirected to `/app/dashboard`
- [ ] Dashboard loads successfully
- [ ] No forced redirect back to change password

### Test 4: New Password Works
- [ ] Logout from staff account
- [ ] Go to login page
- [ ] Enter staff member's email
- [ ] Enter the NEW password (not temporary)
- [ ] Click "Sign In"
- [ ] Login succeeds
- [ ] Goes directly to dashboard (not change password page)
- [ ] Full access to system

### Test 5: Temporary Password Stopped Working
- [ ] Logout again
- [ ] Go to login page
- [ ] Enter staff member's email
- [ ] Enter the TEMPORARY password (original one)
- [ ] Click "Sign In"
- [ ] Login FAILS with "Invalid credentials"
- [ ] This is correct - temporary password was replaced ✅

---

## 🔒 Security Testing Checklist

### Test 6: Permission Validation
- [ ] Login as Cashier or Staff (non-admin role)
- [ ] Go to Staff Management (if accessible)
- [ ] Key icon (Reset Password) is NOT visible OR disabled
- [ ] If you manually call the function, get "Insufficient permissions" error

### Test 7: Business Isolation
- [ ] Create a second test business (if you have multi-business setup)
- [ ] Login as Owner of Business A
- [ ] Try to reset password for staff in Business B
- [ ] Should fail with "Cannot reset password for staff in different business"
- [ ] OR the staff member shouldn't be visible in the list

### Test 8: Role Restrictions
- [ ] Login as Manager (not Business Owner)
- [ ] Go to Staff Management
- [ ] Try to reset Business Owner's password
- [ ] Should fail with "Only Business Owner can reset another Business Owner password"

---

## 🎯 Final Verification Checklist

### Code Verification
- [ ] `/src/app/contexts/AuthContext.tsx` contains `supabase.rpc('admin_reset_staff_password')`
- [ ] No errors in browser console during password reset
- [ ] No errors in Supabase logs (Dashboard → Logs → Postgres Logs)

### Database Verification
Run these queries in SQL Editor:

#### Check function exists:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'admin_reset_staff_password';
```
- [ ] Returns one row

#### Check profile flag after reset:
```sql
SELECT email, must_change_password 
FROM profiles 
WHERE email = 'test-staff@email.com';
```
- [ ] `must_change_password` should be `true` after reset
- [ ] `must_change_password` should be `false` after password change

#### Check auth.users password was updated:
```sql
SELECT email, updated_at 
FROM auth.users 
WHERE email = 'test-staff@email.com';
```
- [ ] `updated_at` timestamp should change after password reset

---

## ✅ Success Criteria

**All of these should be TRUE:**

- [ ] SQL function installed without errors
- [ ] Admin can reset staff password
- [ ] Temporary password is displayed to admin
- [ ] Staff can login with temporary password
- [ ] Staff is auto-redirected to Change Password page
- [ ] Staff can successfully change password
- [ ] New password works for login
- [ ] Temporary password no longer works
- [ ] No errors in browser console
- [ ] No errors in Supabase logs
- [ ] Security validations work (permissions, business isolation, role restrictions)

**If ALL boxes are checked = Password Reset is FULLY FUNCTIONAL! 🎉**

---

## 🐛 Failure Checklist

**If something failed, check:**

- [ ] Did you run the SQL script? (Most common issue)
- [ ] Did the SQL script execute successfully?
- [ ] Are there errors in browser console? (Press F12)
- [ ] Are there errors in Supabase Logs? (Dashboard → Logs)
- [ ] Is the user logged in with correct role? (Owner/Manager)
- [ ] Is the staff member in the same business?
- [ ] Did you copy the ENTIRE SQL script?
- [ ] Are you testing with a real staff member (not an invite)?

---

## 📚 Reference Documentation

If you need help:

1. **Quick Start:** `PASSWORD_RESET_QUICK_START.md`
2. **Complete Guide:** `PASSWORD_RESET_COMPLETE_GUIDE.md`
3. **Technical Details:** `PASSWORD_RESET_CHANGES_SUMMARY.md`
4. **Setup Help:** `SUPABASE_PASSWORD_RESET_SETUP.md`

---

## 🎊 Post-Setup

After everything is working:

- [ ] Document the temporary password sharing process for your team
- [ ] Train admins on how to reset passwords
- [ ] Test with real staff members
- [ ] Monitor Supabase logs for any issues
- [ ] Keep a backup of the SQL script

---

**Date Completed:** _______________

**Tested By:** _______________

**Status:** [ ] All tests passed ✅ | [ ] Some issues 🔧 | [ ] Not started ⏳

---

## 🆘 Still Having Issues?

1. Re-read `/PASSWORD_RESET_README.md`
2. Check browser console (F12) for errors
3. Check Supabase Dashboard → Logs
4. Verify SQL script was run
5. Try with a simple test password first
6. Review `/PASSWORD_RESET_COMPLETE_GUIDE.md` troubleshooting section

**The system is designed to work - if it's not working, it's likely the SQL script wasn't run or there's a permission issue!**
