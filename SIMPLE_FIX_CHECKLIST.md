# ✅ Simple Fix Checklist - Password Reset Error

## Your Error:
```
Password reset failed: Function error: function gen_salt(unknown, integer) does not exist
```

## Fix in 4 Steps:

### ☐ Step 1: Open Supabase SQL Editor
- [ ] Go to https://supabase.com/dashboard
- [ ] Click your Tillsup project
- [ ] Click "SQL Editor" in the left sidebar
- [ ] Click "+ New query" button

### ☐ Step 2: Copy SQL
- [ ] Open file: **`RUN_THIS_IN_SUPABASE.sql`** (in this folder)
- [ ] Select all (Ctrl+A or Cmd+A)
- [ ] Copy (Ctrl+C or Cmd+C)

### ☐ Step 3: Run SQL
- [ ] Paste into Supabase SQL Editor (Ctrl+V or Cmd+V)
- [ ] Click "RUN" button (or press Ctrl+Enter)
- [ ] Wait for success messages:
  - ✅ CREATE EXTENSION
  - ✅ CREATE FUNCTION
  - ✅ GRANT

### ☐ Step 4: Test Fix
- [ ] Go to Tillsup app
- [ ] Navigate to Staff Management
- [ ] Click "Reset Password" on any staff member
- [ ] Should show temporary password (NO ERROR!)
- [ ] Copy the password
- [ ] Staff can login with it

---

## ✅ Success!

If all steps above are checked, your password reset is working!

---

## 🆘 Troubleshooting

### If you get "permission denied to create extension":
1. In Supabase, go to **Database** → **Extensions**
2. Search for "pgcrypto"
3. Toggle it ON
4. Run the SQL again

### If you still see the error after running SQL:
1. Hard refresh browser: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. Try password reset again

### If you get "function already exists":
- This is OK! It means you ran it before
- The function will be updated
- Just continue to Step 4

---

## 📁 Files

| File | Purpose |
|------|---------|
| **`RUN_THIS_IN_SUPABASE.sql`** | The SQL to copy and run |
| **`FIX_PASSWORD_RESET_NOW.md`** | Detailed guide |
| **`SIMPLE_FIX_CHECKLIST.md`** | This checklist |

---

**Time:** 60 seconds  
**Difficulty:** Copy & Paste  
**Permanent:** Yes (run once)
