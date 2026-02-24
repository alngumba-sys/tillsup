# 🔐 Complete Password Reset Flow Guide

## Overview

This guide explains how Tillsup handles password resets when an admin resets a staff member's password. The system ensures that:
- ✅ The temporary password **actually works** for login
- ✅ Staff are **forced to change** it on first login
- ✅ The new password they choose **replaces** the temporary one
- ✅ Everything is **secure** and **properly validated**

---

## 🚀 Quick Setup (Required Once)

### Step 1: Install the Database Function

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Click "New Query"**
3. **Open the file** `/supabase_password_reset_function.sql` in this project
4. **Copy the entire contents** and paste into Supabase SQL Editor
5. **Click "Run"** (or press Ctrl+Enter)
6. **Verify success**: You should see "Success. No rows returned"

**That's it!** The function is now installed and ready to use.

---

## 📋 Complete Password Reset Flow

### 1️⃣ Admin Resets Password

**Location:** Staff Management → Staff List → Actions → Reset Password (Key icon)

**What Happens:**
1. Admin clicks the key icon next to a staff member
2. Confirmation dialog appears
3. Admin confirms the reset
4. System generates a secure 12-character temporary password
   - Mixed uppercase, lowercase, numbers, and symbols
   - Example: `aB3!xY9@mK2$`
5. Database function is called with:
   - Target staff user ID
   - Generated temporary password
   - Admin's user ID

**Database Function Validates:**
- ✅ Admin has proper role (Business Owner or Manager)
- ✅ Both users are in the same business
- ✅ Target user exists
- ✅ Role restrictions (only Owner can reset another Owner)

**Database Function Executes:**
- Updates `auth.users.encrypted_password` (the actual Supabase Auth password)
- Sets `profiles.must_change_password = true`
- Returns success with confirmation

**Admin Sees:**
- Success dialog with the temporary password displayed
- Copy button to copy password to clipboard
- Instructions to share with staff member

---

### 2️⃣ Staff Logs In with Temporary Password

**Location:** Login Page (`/login`)

**What Happens:**
1. Staff navigates to Tillsup login page
2. Enters their email address
3. Enters the **temporary password** provided by admin
4. Clicks "Sign In"

**System Validates:**
- Supabase Auth checks the password against `auth.users.encrypted_password`
- ✅ Password matches (because database function updated it)
- Authentication succeeds

**After Successful Login:**
- `AuthContext` loads user profile
- Detects `must_change_password = true`
- Login function returns `{ success: true, mustChangePassword: true }`
- Login page redirects to `/change-password`

---

### 3️⃣ Staff Changes Password

**Location:** Change Password Page (`/change-password`)

**What Happens:**
1. Staff sees "Change Password" page
2. Welcome message: "Welcome, [Name]! This is your first login."
3. Two input fields:
   - New Password (minimum 6 characters)
   - Confirm New Password
4. Staff enters their chosen password twice
5. Clicks "Change Password & Continue"

**System Validates:**
- Password is at least 6 characters
- Both passwords match

**Password Update:**
- Calls `changePassword(newPassword)` in AuthContext
- Updates password in Supabase Auth: `supabase.auth.updateUser({ password: newPassword })`
- This **replaces** the temporary password with the staff's chosen password
- Updates profile: `must_change_password = false`
- Updates local state: `setUser({ ...user, mustChangePassword: false })`

**After Successful Change:**
- Redirects to `/app/dashboard`
- Staff has full access with their new password
- Temporary password is **permanently replaced** and no longer works

---

### 4️⃣ Staff Uses New Password Going Forward

**What Happens:**
- Staff can now login with their chosen password
- `must_change_password = false` in database
- No forced redirects to Change Password page
- Full access to all features

---

## 🔒 Security Features

### Multi-Layer Validation

1. **Database Function (Server-Side)**
   - Cannot be bypassed from client
   - Validates admin permissions
   - Enforces business isolation
   - Checks role restrictions

2. **AuthGuard (Client-Side)**
   - Redirects users with `mustChangePassword = true` to `/change-password`
   - Prevents access to protected routes until password is changed
   - Located in `/src/app/components/AuthGuardComponent.tsx`

3. **Login Flow**
   - Checks `mustChangePassword` flag after authentication
   - Automatically routes to appropriate page

### Password Security

- **Temporary passwords** are 12 characters with mixed complexity
- **Supabase Auth** handles all encryption using bcrypt
- **No plaintext passwords** are stored anywhere
- **One-time use**: Temporary password must be changed immediately

### Business Isolation

- Admins can **only** reset passwords for staff in their business
- Cross-business password resets are blocked
- Validated at database level (cannot be bypassed)

### Role-Based Restrictions

- Only **Business Owner** and **Manager** can reset passwords
- Only **Business Owner** can reset another Owner's password
- Validated at database level

---

## 🧪 Testing the Flow

### Test Case 1: Complete Password Reset Flow

1. ✅ Login as Business Owner or Manager
2. ✅ Navigate to Staff Management
3. ✅ Find a staff member
4. ✅ Click the key icon (Reset Password)
5. ✅ Confirm the reset
6. ✅ Copy the temporary password shown
7. ✅ Logout
8. ✅ Login as the staff member using the temporary password
9. ✅ Verify redirect to Change Password page
10. ✅ Enter a new password (twice)
11. ✅ Click "Change Password & Continue"
12. ✅ Verify redirect to Dashboard
13. ✅ Logout
14. ✅ Login again with the **new password** (not temporary)
15. ✅ Verify direct access to Dashboard (no password change required)
16. ✅ Try logging in with the temporary password
17. ✅ Verify it **fails** (password has been replaced)

### Test Case 2: Permission Validation

1. ✅ Login as a Cashier or Staff (non-admin role)
2. ✅ Verify Reset Password button is not visible or disabled
3. ✅ (If you manually call the function) Verify error: "Insufficient permissions"

### Test Case 3: Cross-Business Protection

1. ✅ Create two businesses
2. ✅ Login as Owner of Business A
3. ✅ Try to reset password for staff in Business B
4. ✅ Verify error: "Cannot reset password for staff in different business"

### Test Case 4: Role Restrictions

1. ✅ Login as Manager
2. ✅ Try to reset Business Owner's password
3. ✅ Verify error: "Only Business Owner can reset another Business Owner password"

---

## 🐛 Troubleshooting

### Problem: "Function admin_reset_staff_password does not exist"

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the `/supabase_password_reset_function.sql` file
3. Verify "Success" message
4. Try password reset again

### Problem: Staff can't login with temporary password

**Symptoms:**
- Password reset shows success
- Admin sees temporary password
- Staff gets "Invalid credentials" error

**Solution:**
1. Check Supabase Dashboard → Logs → Postgres Logs
2. Look for errors in `admin_reset_staff_password` function
3. Common causes:
   - Function not installed (see solution above)
   - RPC call failed (check browser console)
   - User ID mismatch (verify user exists in profiles)

**Debugging:**
```sql
-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'admin_reset_staff_password';

-- Check user's must_change_password status
SELECT id, email, must_change_password 
FROM profiles 
WHERE email = 'staff@email.com';

-- Manually test the function (replace UUIDs)
SELECT admin_reset_staff_password(
  'staff-user-id'::uuid,
  'TestPassword123!',
  'admin-user-id'::uuid
);
```

### Problem: Staff not redirected to Change Password page

**Symptoms:**
- Staff can login
- Goes directly to dashboard
- Not prompted to change password

**Solution:**
1. Check `must_change_password` in profiles table:
   ```sql
   SELECT must_change_password FROM profiles WHERE email = 'staff@email.com';
   ```
2. If `false`, the flag wasn't set. Re-run password reset.
3. Check browser console for errors in `AuthGuardComponent`
4. Verify `Login.tsx` is checking the `mustChangePassword` flag

### Problem: Password change fails

**Symptoms:**
- Staff enters new password
- Gets error message
- Still stuck on Change Password page

**Solution:**
1. Check browser console for errors
2. Verify password meets requirements (6+ characters)
3. Check Supabase Auth logs
4. Try a different password (avoid special characters if issues)

**Common errors:**
- "Password should be at least 6 characters" → Password too short
- "Passwords do not match" → Confirmation doesn't match
- "Failed to change password" → Check Supabase Auth logs

---

## 📊 Database Schema Reference

### profiles table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  business_id UUID REFERENCES businesses(id),
  branch_id UUID REFERENCES branches(id),
  must_change_password BOOLEAN DEFAULT false,  -- 👈 This flag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### auth.users table (Supabase managed)

```sql
-- Simplified schema (actual is more complex)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  encrypted_password TEXT,  -- 👈 Updated by password reset function
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

---

## 🎯 Key Takeaways

1. **The temporary password ACTUALLY works** because the database function updates `auth.users.encrypted_password`
2. **Staff MUST change it** because `must_change_password = true` forces redirect
3. **The new password REPLACES the temporary one** via `supabase.auth.updateUser()`
4. **Everything is secure** with server-side validation and encryption
5. **Setup is simple** - just run one SQL file in Supabase

---

## 📚 Related Files

- **SQL Function**: `/supabase_password_reset_function.sql`
- **Setup Guide**: `/SUPABASE_PASSWORD_RESET_SETUP.md`
- **Auth Context**: `/src/app/contexts/AuthContext.tsx` (lines 1352-1386)
- **Change Password Page**: `/src/app/pages/ChangePassword.tsx`
- **Login Page**: `/src/app/pages/Login.tsx`
- **Auth Guard**: `/src/app/components/AuthGuardComponent.tsx`
- **Staff Management**: `/src/app/components/staff/StaffManagementTab.tsx`

---

## 🆘 Still Having Issues?

1. Check browser console for errors
2. Check Supabase Dashboard → Logs
3. Verify database function is installed
4. Test with a simple password first (e.g., "password123")
5. Review this guide step-by-step

**The flow is now fully functional!** 🎉
