# Password Reset Setup Guide - Complete Instructions

## 🎯 Quick Start (30 seconds)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"** button

### Step 2: Run the Setup SQL
1. Open the file: `/supabase_password_reset_FIXED.sql` (in your project root)
2. **Copy the ENTIRE file** (all content)
3. **Paste** into the Supabase SQL Editor
4. Click **"Run"** button (or press `Ctrl+Enter`)

### Step 3: Verify Success
You should see output like:
```
✅ pgcrypto extension is enabled
✅ Function simple_reset_staff_password exists
```

### Step 4: Test Password Reset
1. Go to Tillsup → Staff Management
2. Click "Reset Password" for any staff member
3. Should show a temporary password dialog
4. **No more errors!** ✅

---

## ❌ Error Messages Explained

### Error 1: "function gen_salt(unknown, integer) does not exist"
**Cause:** The `pgcrypto` extension is not enabled  
**Solution:** Run `/supabase_password_reset_FIXED.sql` (it enables pgcrypto automatically)

### Error 2: "Could not find the function public.simple_reset_staff_password"
**Cause:** The database function hasn't been created yet  
**Code:** PGRST202  
**Solution:** Run `/supabase_password_reset_FIXED.sql` (it creates the function)

### Error 3: "Perhaps you meant to call the function public.admin_reset_staff_password"
**Cause:** Supabase found a similar function but not the exact one  
**Solution:** Run `/supabase_password_reset_FIXED.sql` to create the correct function

---

## 📋 What the Setup File Does

The `/supabase_password_reset_FIXED.sql` file does 5 things:

1. **Enables pgcrypto extension** - Required for password hashing
2. **Drops old functions** - Cleans up any previous versions
3. **Creates the password reset function** - Main function that resets passwords
4. **Grants permissions** - Allows authenticated users to call the function
5. **Verifies setup** - Checks that everything installed correctly

---

## 🔍 How Password Reset Works

### When You Click "Reset Password":

1. **Generate temporary password** (8 characters, random)
2. **Check permissions** (Only Business Owner/Manager can reset)
3. **Call database function** (`simple_reset_staff_password`)
4. **Update auth.users table** (Hash password with bcrypt)
5. **Mark user as must_change_password** (Force password change on login)
6. **Show temporary password** (Admin shares with staff)
7. **Staff logs in with temp password** → Redirected to change password page

---

## 🛡️ Security Features

- ✅ **Bcrypt hashing** - Industry standard password encryption
- ✅ **Permission checks** - Only authorized users can reset passwords
- ✅ **Business isolation** - Can't reset passwords for other businesses
- ✅ **Force password change** - User must create new password on first login
- ✅ **Audit trail** - All changes logged in database
- ✅ **SECURITY DEFINER** - Function runs with elevated privileges safely

---

## 🔧 Troubleshooting

### Problem: "Permission denied for function"
**Solution:**
```sql
-- Run this in Supabase SQL Editor:
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
```

### Problem: "Function already exists" error
**Solution:**
```sql
-- Run this to drop the old version:
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);

-- Then run the full setup file again
```

### Problem: "Password reset works but staff can't log in"
**Check:**
1. Make sure you copied the temporary password exactly (case-sensitive!)
2. Check Supabase Dashboard → Authentication → Users
3. Verify the user's `encrypted_password` was updated (check `updated_at` timestamp)

### Problem: Still getting gen_salt error after running setup
**Possible causes:**
1. SQL didn't run completely - Make sure you ran the ENTIRE file
2. pgcrypto didn't enable - Try running just this:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```
3. Cache issue - Hard refresh your browser (`Ctrl+Shift+R`)

---

## 📁 Related Files

- `/supabase_password_reset_FIXED.sql` - **USE THIS ONE** (Complete setup)
- `/supabase_simple_password_reset.sql` - Old version (deprecated)
- `/supabase_password_reset_function.sql` - Reference only (deprecated)
- `/PASSWORD_RESET_SETUP.md` - Additional documentation
- `/src/app/contexts/AuthContext.tsx` - Frontend password reset logic
- `/src/app/components/staff/StaffManagementTab.tsx` - UI for password reset

---

## ✅ Success Checklist

After running the setup, verify:

- [ ] No errors in Supabase SQL Editor when running the setup file
- [ ] Saw ✅ success messages for pgcrypto and function
- [ ] Can click "Reset Password" in Staff Management
- [ ] Temporary password dialog appears
- [ ] No "gen_salt" error
- [ ] No "function not found" error
- [ ] Staff can log in with temporary password
- [ ] Staff is redirected to change password page

---

## 🆘 Still Not Working?

1. **Check Supabase Logs:**
   - Dashboard → Logs → Postgres Logs
   - Look for error messages

2. **Verify Function Exists:**
   ```sql
   SELECT routine_name, routine_type
   FROM information_schema.routines
   WHERE routine_name = 'simple_reset_staff_password';
   ```
   Should return 1 row.

3. **Verify Extension:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
   ```
   Should return 1 row.

4. **Check Browser Console:**
   - Press F12 → Console tab
   - Look for error messages when clicking "Reset Password"

5. **Try in Incognito Mode:**
   - Rules out browser cache issues

---

## 🚀 Advanced: Manual Testing

Test the function directly in SQL Editor:

```sql
-- Replace these UUIDs with real user IDs from your database
SELECT public.simple_reset_staff_password(
  'staff-user-id-here'::UUID,           -- p_user_id
  'TempPassword123!'::TEXT,              -- p_new_password
  'admin-user-id-here'::UUID,            -- p_admin_id
  'your-business-id'::TEXT               -- p_business_id
);
```

**Expected result:**
```json
{
  "success": true,
  "message": "Password reset successfully. User must change password on next login."
}
```

---

## 📝 Summary

**One command solves all password reset errors:**

1. Copy `/supabase_password_reset_FIXED.sql`
2. Paste in Supabase SQL Editor
3. Click Run
4. Done! ✅

This is a **one-time setup** - you never have to do it again for this Supabase project.

---

**Need more help?** Check `/TROUBLESHOOTING.md` or `/ERROR_FIX_SUMMARY.md`
