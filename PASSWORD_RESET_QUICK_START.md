# 🚀 Password Reset Quick Start

## ⚡ Setup (1 Minute)

### Step 1: Run the SQL Script

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **"New Query"**
4. Open `/supabase_password_reset_function.sql` from this project
5. Copy **all content** and paste into Supabase
6. Click **"Run"** (Ctrl+Enter)
7. See "Success" ✅

**Done!** Password reset now works.

---

## 📱 How to Use

### For Admins (Business Owner / Manager):

1. **Go to Staff Management**
2. **Find the staff member** you want to reset
3. **Click the key icon** 🔑 (Reset Password)
4. **Confirm** the reset
5. **Copy the temporary password** shown
6. **Share it** with the staff member (email, SMS, or in person)

### For Staff Members:

1. **Go to login page**
2. **Enter your email**
3. **Enter the temporary password** (shared by admin)
4. **Click Sign In**
5. **You'll be redirected** to Change Password page
6. **Enter your new password** (twice)
7. **Click "Change Password & Continue"**
8. **Done!** You now have your own password

---

## ✅ What Actually Happens

### When Admin Resets:
- ✅ System generates 12-character secure password
- ✅ **Password is ACTUALLY SET** in Supabase Auth (auth.users table)
- ✅ Staff profile marked with `must_change_password = true`
- ✅ Admin sees temporary password to share

### When Staff Logs In:
- ✅ **Temporary password WORKS** (because it was set in database)
- ✅ Login succeeds
- ✅ System detects `must_change_password = true`
- ✅ **Auto-redirects to Change Password page**

### When Staff Changes Password:
- ✅ New password **REPLACES** temporary password
- ✅ `must_change_password` flag cleared
- ✅ **Temporary password STOPS WORKING**
- ✅ Staff can now use their own password

---

## 🔥 The Key Difference

### ❌ Before (Broken):
- Generated password on frontend only
- Never updated auth.users
- Staff couldn't login (password didn't exist)
- "Invalid credentials" error

### ✅ After (Fixed):
- Database function called with service_role privileges
- **Actually updates auth.users.encrypted_password**
- Staff CAN login with temporary password
- Everything works smoothly

---

## 🧪 Quick Test

1. Reset password for a test staff member
2. Copy the temporary password
3. Logout
4. Login as that staff member with temporary password
5. Should redirect to Change Password page ✅
6. Change to a new password
7. Should redirect to Dashboard ✅
8. Logout and login with new password ✅
9. Try old temporary password - should fail ✅

**If all steps pass, it's working perfectly!** 🎉

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Function does not exist" | Run the SQL script in Supabase |
| Staff can't login with temp password | Check browser console for errors, verify function ran successfully |
| Not redirected to Change Password | Check `must_change_password` in profiles table |
| Permission denied | Only Business Owner/Manager can reset passwords |

---

## 📚 Need More Details?

See `/PASSWORD_RESET_COMPLETE_GUIDE.md` for:
- Complete technical documentation
- Security details
- Database schema
- Advanced troubleshooting
- Testing checklist

---

## 💡 Pro Tips

1. **Always copy the password** - it's shown only once
2. **Staff can't bypass** the password change - it's enforced
3. **Temporary passwords are strong** - 12 characters, mixed complexity
4. **Business isolation** - you can only reset passwords in your business
5. **Audit trail** - all password changes logged in Supabase Auth logs

---

**You're all set!** The password reset feature is now fully functional with proper authentication. 🔐✨
