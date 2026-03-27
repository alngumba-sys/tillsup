# 🚨 START HERE - Password Reset Error Fix

## You're seeing this error:
```
Password reset failed: function gen_salt(unknown, integer) does not exist
```

---

## ✅ Fix in 60 Seconds

### 1. Go to Supabase
Open: **https://supabase.com/dashboard**

### 2. Open SQL Editor
- Click your **Tillsup project**
- Click **"SQL Editor"** (left sidebar)
- Click **"+ New query"** button

### 3. Copy This File
In your code editor, open:
```
supabase_password_reset_FIXED.sql
```
Press `Ctrl+A` to select all, then `Ctrl+C` to copy.

### 4. Paste and Run
- Click in the Supabase SQL Editor
- Press `Ctrl+V` to paste
- Click **"Run"** button

### 5. Verify Success
You should see:
```
✅ pgcrypto extension is enabled
✅ Function simple_reset_staff_password exists
```

### 6. Test Password Reset
- Go back to Tillsup
- Try password reset again
- **It will work!** ✅

---

## 📖 Need More Help?

**Detailed guide with screenshots:**  
→ `/SETUP_SUPABASE_PASSWORD_RESET.md`

**Quick reference:**  
→ `/QUICK_PASSWORD_RESET_FIX.md`

**All troubleshooting:**  
→ `/TROUBLESHOOTING.md`

---

## ❓ What's Happening?

This error means your Supabase database needs a one-time setup for the password reset feature.

- ✅ The code is correct
- ❌ The database just needs a function installed
- ⏱️ Takes 60 seconds
- 🔄 One-time only (never again!)

---

## 🎯 Summary

1. **File to run:** `supabase_password_reset_FIXED.sql`
2. **Where:** Supabase Dashboard → SQL Editor
3. **Time:** 60 seconds
4. **Difficulty:** Copy + Paste

**After this, password reset will work forever!** ✅
