# 🔧 Quick Fix: Password Reset Errors

## The Problem
```
❌ function gen_salt(unknown, integer) does not exist
❌ Could not find the function public.simple_reset_staff_password
❌ PGRST202 error
```

## The Solution (30 seconds)

### 1️⃣ Open Supabase SQL Editor
```
Supabase Dashboard → SQL Editor → New query
```

### 2️⃣ Copy This File
```
/supabase_password_reset_FIXED.sql
```

### 3️⃣ Paste and Run
```
Paste all contents → Click "Run" button
```

### 4️⃣ Look for Success
```
✅ pgcrypto extension is enabled
✅ Function simple_reset_staff_password exists
```

## Done! ✅

Now try password reset again - it will work!

---

## What This Does

| Step | What It Does |
|------|--------------|
| 1 | Enables `pgcrypto` extension (for password hashing) |
| 2 | Drops old password reset functions (cleanup) |
| 3 | Creates `simple_reset_staff_password` function |
| 4 | Grants permissions to authenticated users |
| 5 | Verifies everything installed correctly |

---

## Why These Errors Happen

| Error | Cause | Fix |
|-------|-------|-----|
| `gen_salt does not exist` | pgcrypto extension not enabled | Run the SQL file |
| `function not found (PGRST202)` | Database function not created | Run the SQL file |
| `perhaps you meant admin_reset_staff_password` | Wrong function name in database | Run the SQL file |

---

## Verify It Worked

1. Go to Tillsup → Staff Management
2. Click "Reset Password" for any staff
3. Should see temporary password ✅
4. No errors ✅

---

## If Still Not Working

### Option 1: Check Supabase Logs
```
Dashboard → Logs → Postgres Logs
```

### Option 2: Verify Extension
```sql
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```
Should return 1 row.

### Option 3: Verify Function
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'simple_reset_staff_password';
```
Should return 1 row.

### Option 4: Run Setup Again
Sometimes running it twice works!

---

## One-Time Setup

This is a **one-time setup per Supabase project**.  
Once done, password reset works forever!

---

**File to run:** `/supabase_password_reset_FIXED.sql`  
**Time required:** 30 seconds  
**Technical difficulty:** Copy + Paste  

✅ **This fixes ALL password reset errors!**
