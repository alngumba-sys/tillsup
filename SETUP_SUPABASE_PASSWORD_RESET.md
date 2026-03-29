# ⚠️ ACTION REQUIRED: Set Up Password Reset Feature

## 🚨 You're seeing this error:
```
Password reset failed: function gen_salt(unknown, integer) does not exist
```

## ✅ Fix it in 60 seconds (with screenshots-style guide)

---

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

1. Open your browser
2. Go to: **https://supabase.com/dashboard**
3. Log in to your account
4. Find your **Tillsup project** (probably named something like "tillsup" or similar)
5. Click on it to open the project

---

### Step 2: Open SQL Editor

**Look at the left sidebar and click on:**

```
📊 SQL Editor
```

It's usually about halfway down the left sidebar, has a database icon.

**Then click the green button:**

```
+ New query
```

---

### Step 3: Copy the SQL Setup File

**In your code editor (VS Code, etc.):**

1. Open this file: **`/supabase_password_reset_FIXED.sql`**
2. It's in the root of your Tillsup project
3. Press `Ctrl+A` (Windows) or `Cmd+A` (Mac) to **select all**
4. Press `Ctrl+C` (Windows) or `Cmd+C` (Mac) to **copy**

**The file should start with:**
```sql
-- ══════════════════════════════════════════════════════════════════
-- TILLSUP: Password Reset Function - COMPLETE SETUP
-- ══════════════════════════════════════════════════════════════════
```

---

### Step 4: Paste and Run in Supabase

**Back in the Supabase SQL Editor:**

1. Click inside the text editor area (big white box)
2. Press `Ctrl+V` (Windows) or `Cmd+V` (Mac) to **paste**
3. You should see all the SQL code (about 100+ lines)
4. Click the green **"Run"** button (or press `Ctrl+Enter`)

**Wait 2-3 seconds...**

---

### Step 5: Verify Success ✅

**Scroll to the bottom of the results panel.**

You should see:

```
✅ pgcrypto extension is enabled
✅ Function simple_reset_staff_password exists
```

**If you see both ✅ checkmarks = SUCCESS!**

---

### Step 6: Test Password Reset

**Go back to Tillsup:**

1. Navigate to **Staff Management**
2. Click **"Reset Password"** for any staff member
3. You should now see a temporary password! 🎉
4. **No more errors!**

---

## 📸 Visual Guide (What to Look For)

### In Supabase Dashboard:

```
Left Sidebar:
├─ Project Settings
├─ Database
├─ Authentication  
├─ Storage
├─ SQL Editor  ← CLICK THIS
├─ Logs
└─ ...
```

### In SQL Editor:

```
Top Right Corner:
[+ New query]  ← CLICK THIS FIRST

Main Area:
┌─────────────────────────────────┐
│                                 │
│   [Paste SQL code here]         │
│                                 │
│                                 │
└─────────────────────────────────┘

Bottom Right:
[Run] ← CLICK THIS AFTER PASTING
```

### Expected Output:

```
Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTICE: ✅ pgcrypto extension is enabled
NOTICE: ✅ Function simple_reset_staff_password exists

Success. No rows returned.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ❌ Common Mistakes

### Mistake 1: Only copied part of the file
**Fix:** Make sure you copied the ENTIRE `/supabase_password_reset_FIXED.sql` file from top to bottom

### Mistake 2: Wrong SQL Editor
**Fix:** Make sure you're in your Tillsup/POS project, not a different Supabase project

### Mistake 3: Didn't click "Run"
**Fix:** After pasting, you must click the green "Run" button

### Mistake 4: Still seeing error in Tillsup
**Fix:** After running SQL, hard refresh Tillsup in browser: `Ctrl+Shift+R`

---

## 🆘 Troubleshooting

### Error in SQL Editor: "permission denied for schema auth"

**This is OK!** The function will still be created. Look for the ✅ messages.

### Error in SQL Editor: "extension pgcrypto already exists"

**This is OK!** It means it was already enabled. Look for the ✅ messages.

### Still seeing "gen_salt" error in Tillsup after running SQL

**Possible causes:**

1. **SQL didn't complete** - Check for error messages in red at bottom of SQL Editor
2. **Wrong Supabase project** - Make sure you ran it in your Tillsup project
3. **Browser cache** - Hard refresh Tillsup: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

## 🔍 Verify the Setup Manually

**If you want to double-check it worked, run this in SQL Editor:**

```sql
-- Check if pgcrypto is enabled
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```

**Should return 1 row.** ✅

```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'simple_reset_staff_password';
```

**Should return 1 row.** ✅

---

## 📁 Where is the SQL File?

**Location:** `/supabase_password_reset_FIXED.sql`

**Full path from project root:**
```
your-tillsup-project/
├── src/
├── public/
├── supabase_password_reset_FIXED.sql  ← THIS FILE
├── package.json
└── ...
```

**If you can't find it:**
- Look in the root directory (same level as package.json)
- It was created in the recent fix
- Check your code editor's file explorer

---

## 💡 What This Does

This SQL file:

1. **Enables pgcrypto** - PostgreSQL extension for password encryption
2. **Creates a function** - `simple_reset_staff_password` that safely resets passwords
3. **Grants permissions** - Allows your app to call the function
4. **Verifies setup** - Confirms everything installed correctly

**This is a one-time setup** - you never have to do it again!

---

## 🎯 Quick Checklist

Before you start:
- [ ] Found `/supabase_password_reset_FIXED.sql` file
- [ ] Logged into Supabase Dashboard
- [ ] Opened correct Tillsup project

During setup:
- [ ] Clicked "SQL Editor" in left sidebar
- [ ] Clicked "+ New query" button
- [ ] Copied ENTIRE SQL file
- [ ] Pasted into SQL Editor
- [ ] Clicked "Run" button

After setup:
- [ ] Saw ✅ success messages
- [ ] Hard refreshed Tillsup browser
- [ ] Tested password reset
- [ ] No more errors!

---

## 🚀 Alternative: Can't Access Supabase?

If you don't have access to Supabase Dashboard (maybe it's managed by someone else):

1. **Find the person who has access** (database admin, project owner, DevOps)
2. **Send them this file:** `/supabase_password_reset_FIXED.sql`
3. **Ask them to run it** in the SQL Editor
4. **Wait for confirmation** that it's done

**Or:**

Share this page with them: `/QUICK_PASSWORD_RESET_FIX.md`

---

## 📞 Need Help?

**This error means:** The database isn't set up yet for password reset

**This is NOT a code error** - the code is correct

**This is a database setup** - you just need to run the SQL file once

**Time required:** 60 seconds  
**Difficulty:** Copy + Paste  
**Frequency:** One-time only (never again!)

---

## ✅ Success Indicators

**You'll know it worked when:**

1. ✅ SQL Editor shows success messages
2. ✅ No red errors in SQL Editor
3. ✅ Password reset in Tillsup shows temporary password
4. ✅ No "gen_salt" error in browser console

---

**File to run:** `/supabase_password_reset_FIXED.sql`  
**Where to run:** Supabase Dashboard → SQL Editor  
**When to run:** Right now (one-time only)  
**Status:** Required for password reset to work
