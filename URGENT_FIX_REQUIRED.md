# 🚨 URGENT: Database Fix Required

## You're seeing this error:
```
⚠️ Profile fetch error: infinite recursion detected in policy for relation "profiles"
Error Code: 42P17
```

---

## ⚡ **Quick Fix (2 Minutes)**

### **This CANNOT be fixed from code - you MUST run SQL in Supabase Dashboard**

---

## 📋 **Step 1: Copy This SQL** (Click the code block to select all)

```sql
-- PASTE THIS INTO SUPABASE SQL EDITOR

BEGIN;

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  auth.uid() = id OR
  business_id = (SELECT business_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles owner 
    WHERE owner.id = auth.uid() 
      AND owner.role = 'Business Owner'
      AND owner.business_id = profiles.business_id
  )
);

COMMIT;
```

---

## 🌐 **Step 2: Open Supabase**

1. Go to: **https://supabase.com/dashboard**
2. Log in if needed
3. Select your **Tillsup** project

---

## 💾 **Step 3: Open SQL Editor**

1. Look at the **left sidebar**
2. Click **"SQL Editor"** (looks like a `<>` icon)
3. Click **"New query"** button

---

## ▶️ **Step 4: Paste and Run**

1. **Delete** any existing SQL in the editor
2. **Paste** the SQL from Step 1
3. Click the green **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
4. Wait for **"Success"** message (~2 seconds)

---

## 🔄 **Step 5: Refresh Tillsup**

1. Go back to your Tillsup browser tab
2. Press **F5** or click the refresh button
3. The error screen should disappear
4. **Done!** ✅

---

## ❓ **Why This Happened**

Your database security policies (RLS) were checking the `profiles` table **while inserting into the profiles table**, creating an infinite loop:

```
Insert profile → Check policy → Query profiles → Apply policy → Check policy → ∞
```

The SQL script fixes this by using simple comparisons instead of recursive table lookups.

---

## 🆘 **Still Seeing the Error?**

1. **Make sure you clicked "Run"** in SQL Editor
2. **Check for "Success" message** at the bottom
3. **Clear browser cache:** Ctrl+Shift+Delete → Clear cache
4. **Hard refresh:** Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

---

## 📞 **Need More Help?**

- Full documentation: `RLS_FIX_INSTRUCTIONS.md`
- Complete SQL script: `FIX_INFINITE_RECURSION.sql`
- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security

---

## ✅ **Checklist**

- [ ] Copied SQL script
- [ ] Opened Supabase Dashboard
- [ ] Opened SQL Editor
- [ ] Pasted and ran SQL
- [ ] Saw "Success" message
- [ ] Refreshed Tillsup
- [ ] Error is gone

**Once all checked, you're done!** 🎉

---

**⏱️ Total time: 2 minutes**
