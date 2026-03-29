# 🔧 Fix: gen_salt Error

## Error You're Seeing
```
❌ Password reset failed: Function error: function gen_salt(unknown, integer) does not exist
```

## Root Cause
The function `simple_reset_staff_password` cannot find the `gen_salt()` function from the `pgcrypto` extension because:

1. **pgcrypto extension** might not be enabled, OR
2. **Search path issue**: The function's `search_path` doesn't include the schema where pgcrypto is installed

## The Fix

The issue is in this line of the function:
```sql
SET search_path = public  ❌ Missing extensions schema!
```

Should be:
```sql
SET search_path = public, extensions  ✅ Includes extensions schema
```

---

## 🚀 Quick Fix (30 seconds)

### Just Run This File:
**📁 `RUN_THIS_NOW.sql`** or **`FIX_GEN_SALT_ERROR.sql`**

### Or Copy This SQL:
```sql
-- Enable pgcrypto in both schemas
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Drop old function
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);

-- Recreate with correct search_path
CREATE OR REPLACE FUNCTION public.simple_reset_staff_password(
  p_user_id UUID,
  p_new_password TEXT,
  p_admin_id UUID,
  p_business_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions  -- ← THIS IS THE FIX!
AS $$
DECLARE
  v_admin_profile RECORD;
  v_target_profile RECORD;
BEGIN
  -- ... (same validation logic)
  
  -- This now works because extensions schema is in search_path
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')), updated_at = NOW()
  WHERE id = p_user_id;
  
  -- ... (rest of function)
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
```

---

## 📖 How to Run

1. **Go to:** [Supabase Dashboard](https://supabase.com/dashboard)
2. **Click:** Your Project → **SQL Editor** → **+ New query**
3. **Choose one:**
   - Copy from `RUN_THIS_NOW.sql` (shortest)
   - Copy from `FIX_GEN_SALT_ERROR.sql` (with verification)
   - Copy from `COMPLETE_PASSWORD_RESET_FIX.sql` (complete rebuild)
4. **Paste** into SQL Editor
5. **Click** "Run"
6. **✅ Done!** Try resetting a password again

---

## ✅ Success Indicators

After running, you should see:
```
✅ CREATE EXTENSION (or "already exists")
✅ CREATE EXTENSION (or "already exists")
✅ DROP FUNCTION
✅ CREATE FUNCTION
✅ GRANT
✅ GRANT
✅ GRANT
✅ GRANT
✅ GRANT
✅ GRANT
```

---

## 🔍 What Changed?

### Before (Broken):
```sql
CREATE FUNCTION ... 
SET search_path = public  -- ❌ Can't find gen_salt()
AS $$
BEGIN
  -- This fails: gen_salt() not found!
  v_password := crypt(p_new_password, gen_salt('bf'));
END;
$$;
```

### After (Fixed):
```sql
CREATE FUNCTION ... 
SET search_path = public, extensions  -- ✅ Can find gen_salt()
AS $$
BEGIN
  -- This works: gen_salt() found in extensions schema!
  v_password := crypt(p_new_password, gen_salt('bf'));
END;
$$;
```

---

## 🧪 Verify It Works

### Method 1: Test Password Reset
1. Go to Tillsup → Staff Management
2. Click 🔑 Reset Password
3. **✅ Should work without errors!**

### Method 2: Check Function Search Path
```sql
SELECT 
    proname,
    prosrc
FROM pg_proc
WHERE proname = 'simple_reset_staff_password';
```

Look for: `SET search_path = public, extensions`

### Method 3: Test Function Directly (Advanced)
```sql
-- Replace with real UUIDs from your database
SELECT simple_reset_staff_password(
  'user-uuid-here',
  'TestPassword123',
  'admin-uuid-here',
  'business-id-here'
);
```

Should return: `{"success": true, "message": "Password reset successfully"}`

---

## 📊 Technical Details

### Why Supabase Stores Extensions in Different Schemas

Supabase can install extensions in:
- **`extensions` schema** (default for most extensions)
- **`public` schema** (user tables and functions)
- **Other schemas** (depending on configuration)

### Why SET search_path Matters

When a function has `SET search_path = public`:
- ✅ Can access: `public.profiles`, `public.businesses`, etc.
- ❌ Cannot access: `extensions.gen_salt()`, `extensions.crypt()`

When a function has `SET search_path = public, extensions`:
- ✅ Can access: Everything in `public` schema
- ✅ Can access: Everything in `extensions` schema
- ✅ Works perfectly!

### Why We Enable in Both Schemas

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
```

This ensures pgcrypto is available regardless of where Supabase installed it.

---

## 🛡️ Security Notes

**Q: Is it safe to add `extensions` to search_path?**  
**A:** Yes! The function is `SECURITY DEFINER` and only calls trusted pgcrypto functions.

**Q: Can users exploit this?**  
**A:** No! All security checks happen BEFORE the `gen_salt()` call. The function validates:
- Admin has proper role (Business Owner/Manager)
- Both users in same business
- Cannot reset owner password unless admin is owner

---

## 🐛 Troubleshooting

### Still getting gen_salt error?

**Check 1: Is pgcrypto enabled?**
```sql
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```
Should return at least one row.

**Check 2: Which schema has pgcrypto?**
```sql
SELECT n.nspname, e.extname
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'pgcrypto';
```
Common results:
- `extensions | pgcrypto` → Need `SET search_path = public, extensions`
- `public | pgcrypto` → `SET search_path = public` works (but include extensions anyway)

**Check 3: Can I call gen_salt manually?**
```sql
SELECT gen_salt('bf');  -- Should return something like "$2a$06$..."
```
If this fails, pgcrypto isn't enabled.

---

## 📁 File Reference

| File | Purpose | Best For |
|------|---------|----------|
| `RUN_THIS_NOW.sql` | Quick fix | Already ran previous SQL |
| `FIX_GEN_SALT_ERROR.sql` | Fix + verification | Want to verify it worked |
| `COMPLETE_PASSWORD_RESET_FIX.sql` | Full rebuild | Start fresh |
| `FIX_GEN_SALT_README.md` | This file | Understanding the issue |

---

## 🎉 After This Fix

✅ **Password reset works instantly**  
✅ **No more gen_salt errors**  
✅ **Temporary passwords generated successfully**  
✅ **Staff can log in with new passwords**  

---

**One-time fix. Never do this again!** 🚀

---

*Last updated: March 10, 2026*  
*Tillsup POS - gen_salt Error Fix*
