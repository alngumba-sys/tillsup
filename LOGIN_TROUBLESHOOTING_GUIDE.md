# 🔧 Login Troubleshooting Guide

## 🚨 Quick Fix (Run This First!)

**Run this SQL script in Supabase SQL Editor:**
```
/FIX_ALL_LOGIN_ISSUES.sql
```

This will:
- ✅ Disable RLS (fixes infinite recursion error 42P17)
- ✅ Show all users in your database
- ✅ Diagnose login issues

---

## 📋 Step-by-Step Troubleshooting

### **Error: "Invalid email or password"**

This means Supabase rejected the login. Here's what to check:

#### **Step 1: Verify Your Email Exists**
Run this SQL:
```
/TEST_LOGIN_CREDENTIALS.sql
```

Look for your email in the list. Check:
- ✅ **Email Confirmed?** = Must be "Yes"
- ✅ **Has Profile?** = Must be "Yes"

#### **Step 2: Check Email Spelling**
- Copy-paste the email from the SQL results
- Don't type it manually (to avoid typos)
- Check for spaces before/after the email

#### **Step 3: Reset Your Password**

**Option A: Via Supabase Dashboard (Recommended)**
1. Open Supabase Dashboard
2. Go to **Authentication** > **Users**
3. Find your user
4. Click **"..."** menu > **"Send Password Reset Email"**
5. Check your email for reset link

**Option B: Set Password Directly (Dev Only)**
```sql
-- Replace with your email and desired password
UPDATE auth.users
SET encrypted_password = crypt('NewPassword123!', gen_salt('bf'))
WHERE email = 'your@email.com';
```

⚠️ **Warning:** Only use Option B in development!

---

### **Error: "Business ID is not a valid UUID: temp-fallback"**

This means RLS is blocking profile fetch.

**Fix:**
```
Run /FIX_ALL_LOGIN_ISSUES.sql
```

---

### **Error: "Password is required"**

The password field is empty when you clicked login.

**Fix:**
- Make sure you typed a password
- Check if browser autofill is working
- Try typing manually instead of copy-paste

---

## 🧪 Testing After Fix

1. **Clear Browser Cache**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

2. **Open Browser Console** (F12)
   - Look for detailed error logs
   - Should see: "🔵 Calling Supabase auth.signInWithPassword..."

3. **Try Login**
   - Use email from SQL results
   - Use the password you just set/reset
   - Watch console for errors

4. **Check Toast Notifications**
   - Should see red toast popup if there's an error
   - Should see green toast if login succeeds

---

## 📊 Common Issues & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `42P17 infinite recursion` | RLS policies reference profiles table | Run `/FIX_ALL_LOGIN_ISSUES.sql` |
| `Invalid login credentials` | Wrong password or email not confirmed | Reset password via Supabase Dashboard |
| `temp-fallback` | Profile fetch failed | Disable RLS |
| `Password is required` | Empty password field | Type password and submit |
| `Cannot connect to server` | Network issue or wrong Supabase URL | Check internet connection |

---

## 🔐 Security Notes

- **RLS is now DISABLED** after running the fix script
- This means **any authenticated user can read any profile**
- **This is OK for development/testing** with fake data
- **DO NOT use in production** with real customer data
- We'll restore secure RLS policies after confirming login works

---

## 📞 Still Having Issues?

If you're still getting errors after following this guide:

1. **Check the Browser Console** (F12 > Console tab)
   - Look for red error messages
   - Copy the full error message

2. **Run the diagnostic SQL:**
   ```
   /TEST_LOGIN_CREDENTIALS.sql
   ```
   - Copy the results

3. **Share the error details:**
   - Console error messages
   - SQL diagnostic results
   - Which step you're stuck on

---

## ✅ Success Checklist

After login works, you should see:
- ✅ Green toast: "Login successful!"
- ✅ Redirect to `/app/dashboard`
- ✅ Dashboard loads with real data (not "temp-fallback")
- ✅ No error messages in console

---

**Last Updated:** 2024-03-05
**Version:** 1.0
