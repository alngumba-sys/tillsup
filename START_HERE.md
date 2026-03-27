# ⚡ START HERE - Password Reset Fix

## Your Error:
```
❌ Password reset failed: Function error: function gen_salt(unknown, integer) does not exist
```

---

## ⚡ FASTEST FIX (Copy & Paste)

### Step 1: Go to Supabase
Open: https://supabase.com/dashboard

### Step 2: Open SQL Editor
Click: Your Project → **SQL Editor** → **+ New query**

### Step 3: Use One of These Files

Pick **ONE** file and run it:

| File | When to Use |
|------|-------------|
| **`RUN_THIS_NOW.sql`** ⭐ | Quickest fix (recommended) |
| `FIX_GEN_SALT_ERROR.sql` | Includes verification queries |
| `COMPLETE_PASSWORD_RESET_FIX.sql` | Complete rebuild |

**How:**
1. Open the file
2. Copy ALL the SQL
3. Paste in Supabase SQL Editor
4. Click "Run"
5. ✅ Done!

---

## What the Fix Does

**Problem:** Function can't find `gen_salt()` from pgcrypto extension

**Solution:** 
1. ✅ Enable pgcrypto extension
2. ✅ Fix function's search path to include `extensions` schema
3. ✅ Grant all necessary permissions

---

## Success Looks Like:

After clicking "Run", you should see:
```
✅ CREATE EXTENSION
✅ CREATE EXTENSION  
✅ DROP FUNCTION
✅ CREATE FUNCTION
✅ GRANT (multiple times)
```

---

## Test It:

1. Go to Tillsup → Staff Management
2. Click 🔑 Reset Password on any staff
3. **✅ Should work!**

---

## Need More Info?

| Document | Purpose |
|----------|---------|
| `FIX_GEN_SALT_README.md` | Detailed explanation |
| `PASSWORD_RESET_FINAL_FIX.md` | Complete troubleshooting |
| `QUICK_START.md` | Quick reference |
| `VISUAL_GUIDE.md` | Step-by-step visuals |

---

## Still Having Issues?

Check browser console (F12) for detailed error messages and see the troubleshooting docs above.

---

**That's it! 30 seconds to fix. One time only.** 🎉
