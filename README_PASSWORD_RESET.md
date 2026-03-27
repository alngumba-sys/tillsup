# Password Reset Setup - README

## 🚨 Are you seeing this error?
```
Password reset failed: function gen_salt(unknown, integer) does not exist
```

**Yes?** → You need to complete a one-time database setup (60 seconds)

---

## 🎯 Pick Your Guide

Choose based on how you like to learn:

### ⚡ Just Fix It (Fastest)
**File:** `/FIX_NOW.md`  
**Time:** 60 seconds  
**Style:** Bullet points, no explanations  
**Best for:** "Just tell me what to do!"

---

### 🚀 Quick Start
**File:** `/START_HERE_PASSWORD_RESET.md`  
**Time:** 60 seconds  
**Style:** Simple steps with brief explanations  
**Best for:** Most people

---

### 📸 Visual Guide
**File:** `/PASSWORD_RESET_FIX_VISUAL_GUIDE.txt`  
**Time:** 60 seconds  
**Style:** ASCII art diagrams showing what to click  
**Best for:** Visual learners

---

### 📖 Complete Guide
**File:** `/SETUP_SUPABASE_PASSWORD_RESET.md`  
**Time:** 2-3 minutes  
**Style:** Detailed steps with troubleshooting  
**Best for:** Want to understand everything

---

### 🔧 Technical Details
**File:** `/PASSWORD_RESET_ERROR_FIX.md`  
**Time:** 5-10 minutes  
**Style:** Technical documentation  
**Best for:** Developers who want full details

---

### 📋 Summary
**File:** `/PASSWORD_RESET_FINAL_SUMMARY.md`  
**Time:** 3-5 minutes  
**Style:** Complete overview  
**Best for:** Want to see the big picture

---

### 📚 All Solutions
**File:** `/ERROR_SOLUTIONS_INDEX.md`  
**Time:** Varies  
**Style:** Index of all error solutions  
**Best for:** Have a different error

---

## 🎯 What You'll Do

No matter which guide you choose, the steps are the same:

1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy file: `supabase_password_reset_FIXED.sql`
4. Paste and click "Run"
5. Done! ✅

**Time:** 60 seconds  
**Difficulty:** Copy + Paste  
**Frequency:** One-time only

---

## 📁 The File You Need

**File name:** `supabase_password_reset_FIXED.sql`

**Location:** Project root (same folder as `package.json`)

```
your-tillsup-project/
├── src/
├── public/
├── supabase_password_reset_FIXED.sql  ← THIS FILE
├── package.json
└── ...
```

---

## ✅ How You'll Know It Worked

### In Supabase:
```
✅ pgcrypto extension is enabled
✅ Function simple_reset_staff_password exists
```

### In Tillsup:
- Password reset button works
- Shows temporary password
- No more errors! 🎉

---

## 🆘 Can't Decide Which Guide?

**Start here:** `/START_HERE_PASSWORD_RESET.md`

It's the best balance of speed and clarity.

---

## ❓ FAQ

### Q: Is this a code bug?
**A:** No! The code is correct. The database just needs a one-time setup.

### Q: How long does it take?
**A:** 60 seconds to copy, paste, and run.

### Q: Do I need to do this every time?
**A:** No! One-time only. After this, password reset works forever.

### Q: Will this break anything?
**A:** No! It only enables the password reset feature.

### Q: I don't have Supabase access. What do I do?
**A:** Ask your database admin to run the SQL file. Send them `/FIX_NOW.md`.

### Q: Can I skip this?
**A:** Password reset won't work until you do this setup.

---

## 🎉 After Setup

Once complete:
- ✅ Password reset works perfectly
- ✅ Can reset any staff member's password
- ✅ Staff forced to change password on login
- ✅ No more database errors
- ✅ Never have to set this up again!

---

## 📞 Still Have Questions?

See: `/TROUBLESHOOTING.md` for all common issues

---

**Ready? Pick a guide above and fix it in 60 seconds!** 🚀

**Recommended:** `/START_HERE_PASSWORD_RESET.md` or `/FIX_NOW.md`
