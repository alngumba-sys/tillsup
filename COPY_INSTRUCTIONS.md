# How to Copy the SQL Fix

Your browser may block automatic copying. Here are **3 easy ways** to copy the SQL:

---

## Method 1: From the Yellow Banner (Easiest)

1. **Click** the yellow warning banner at the top
2. **Click** "Click here to fix"
3. **Click** inside the dark SQL box
4. Press **Ctrl+A** (or **Cmd+A** on Mac) to select all
5. Press **Ctrl+C** (or **Cmd+C** on Mac) to copy
6. Go to Supabase and paste!

---

## Method 2: From COPY_THIS.sql File

1. **Open** the file `COPY_THIS.sql` in your project
2. Press **Ctrl+A** (or **Cmd+A** on Mac) to select all
3. Press **Ctrl+C** (or **Cmd+C** on Mac) to copy
4. Go to Supabase and paste!

---

## Method 3: Manual Selection

If the above don't work:

1. Open `COPY_THIS.sql`
2. Click at the start
3. Hold **Shift** and click at the end
4. Press **Ctrl+C** (or **Cmd+C**)
5. Go to Supabase and paste!

---

## The SQL You Need to Copy:

```sql
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
```

---

## After You Copy:

1. Go to **https://supabase.com/dashboard**
2. Click **"SQL Editor"**
3. Paste the SQL (**Ctrl+V** or **Cmd+V**)
4. Click **"Run"**
5. Wait for success message
6. **Refresh** your Tillsup app

✅ Done! Yellow banner disappears.

---

## Why Can't I Click "Copy"?

Some browsers block automatic copying for security reasons. That's why we provide the manual copy methods above - they always work!

---

**Bottom Line:** Use keyboard shortcuts (Ctrl+A then Ctrl+C) to copy the SQL - it's reliable and works everywhere.
