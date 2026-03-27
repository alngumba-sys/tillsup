# 🎯 Visual Guide: Fix Password Reset in 3 Steps

---

## The Error You're Seeing

```
⚠️ Password reset requires a database function that isn't installed yet.
```

**Why?** The function exists, but lacks permissions for users to execute it.

---

## 🚀 3-Step Fix

### Step 1: Go to Supabase
Open: https://supabase.com/dashboard

```
┌─────────────────────────────────────────┐
│  🏠 Supabase Dashboard                  │
├─────────────────────────────────────────┤
│                                         │
│  📁 Your Project Name                   │
│     ├─ Table Editor                     │
│     ├─ 📝 SQL Editor   ← CLICK THIS     │
│     ├─ Database                         │
│     └─ Authentication                   │
│                                         │
└─────────────────────────────────────────┘
```

---

### Step 2: Open SQL Editor

Click: **SQL Editor** → **+ New query**

```
┌─────────────────────────────────────────┐
│  SQL Editor                             │
├─────────────────────────────────────────┤
│                                         │
│  [+ New query]  ← CLICK THIS            │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  │  -- Paste your SQL here           │ │
│  │                                   │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Run] ← CLICK AFTER PASTING            │
│                                         │
└─────────────────────────────────────────┘
```

---

### Step 3: Run This SQL

**Copy from:** `RUN_THIS_NOW.sql` (simplest) or `COMPLETE_PASSWORD_RESET_FIX.sql` (complete)

**Paste** into SQL Editor → Click **[Run]**

```sql
-- Quick fix (30 seconds)
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
```

---

## ✅ Success Indicators

After clicking **Run**, you should see:

```
┌─────────────────────────────────────────┐
│  Results                                │
├─────────────────────────────────────────┤
│  ✅ Success. No rows returned            │
│  ✅ GRANT                                │
│  ✅ GRANT                                │
│  ✅ GRANT                                │
│  ✅ GRANT                                │
│  ✅ GRANT                                │
└─────────────────────────────────────────┘
```

**"Success. No rows returned"** = Perfect! ✅

---

## 🎯 Test It

1. Close the error dialog in Tillsup
2. Go to **Staff Management**
3. Click the **🔑 Reset Password** button on any staff member
4. **✅ It will work instantly!**

---

## 📊 What Changed?

### Before:
```
User tries to reset password
    ↓
Function exists ✅
    ↓
User has NO permission ❌
    ↓
ERROR: "Function not installed"
```

### After:
```
User tries to reset password
    ↓
Function exists ✅
    ↓
User has EXECUTE permission ✅
    ↓
SUCCESS: Password reset works! ✅
```

---

## 🔍 Verify Permissions (Optional)

Run this query to confirm permissions are set:

```sql
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'simple_reset_staff_password'
ORDER BY grantee;
```

**Expected Result:**
```
┌──────────────────────────────┬──────────────┬─────────────────┐
│ routine_name                 │ grantee      │ privilege_type  │
├──────────────────────────────┼──────────────┼─────────────────┤
│ simple_reset_staff_password  │ anon         │ EXECUTE         │
│ simple_reset_staff_password  │ authenticated│ EXECUTE         │
│ simple_reset_staff_password  │ service_role │ EXECUTE         │
└──────────────────────────────┴──────────────┴─────────────────┘
```

---

## 📁 Which File Should I Use?

| File | When to Use | Time |
|------|-------------|------|
| `RUN_THIS_NOW.sql` | Quick fix - just add permissions | 30 sec |
| `COMPLETE_PASSWORD_RESET_FIX.sql` | Complete setup - recreates everything | 60 sec |
| `FIX_PASSWORD_PERMISSIONS.sql` | Includes verification queries | 45 sec |

**Recommendation:** Use `RUN_THIS_NOW.sql` since you already created the function!

---

## 💬 Common Questions

**Q: I already ran the SQL before. Why isn't it working?**  
A: The previous SQL was missing the permission grants. This update adds them.

**Q: Will this affect existing passwords?**  
A: No! This only adds permissions. No data is changed.

**Q: Is this a one-time fix?**  
A: Yes! Once you run it, it's permanent. You'll never need to do this again.

**Q: What if I get an error?**  
A: Check the console logs. The most common issue is running in the wrong Supabase project.

---

## 🎉 You're Done!

Password reset will now work perfectly. Staff members will get temporary passwords that they can use to log in, and they'll be prompted to change their password on first login.

**Next time:** No setup needed - it just works! ✨
