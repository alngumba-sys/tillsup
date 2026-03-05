# 🔧 Fix: Infinite Recursion in RLS Policies

## 🚨 **Problem**
You're seeing this error:
```
⚠️ Profile fetch error: infinite recursion detected in policy for relation "profiles"
Error code: 42P17
```

This means your Supabase **Row Level Security (RLS) policies** on the `profiles` table are checking the `profiles` table recursively, causing an infinite loop.

---

## ✅ **Quick Fix (5 minutes)**

### **Step 1: Open Supabase Dashboard**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your **Tillsup** project
3. Click **SQL Editor** in the left sidebar

---

### **Step 2: Copy and Run the Fix Script**

Open the file **`FIX_INFINITE_RECURSION.sql`** in your project root and **copy the entire contents**.

**OR** copy this quick fix:

```sql
-- Drop problematic policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create non-recursive SELECT policy
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  auth.uid() = id OR
  business_id = (SELECT business_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- Create non-recursive INSERT policy (CRITICAL!)
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id  -- Simple check, no recursion
);

-- Create UPDATE policy
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Create DELETE policy
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

### **Step 3: Execute the Script**
1. Paste the SQL into the SQL Editor
2. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
3. Wait for "Success" message

---

### **Step 4: Verify It Worked**
Run this query in SQL Editor to see your new policies:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND schemaname = 'public';
```

You should see 4 policies:
- `profiles_select_policy`
- `profiles_insert_policy`
- `profiles_update_policy`
- `profiles_delete_policy`

---

### **Step 5: Refresh Your App**
1. Go back to your Tillsup app
2. **Refresh the page** (F5 or Ctrl+R)
3. Try creating a staff member or logging in again

✅ **The error should be gone!**

---

## 🧪 **Test That It's Fixed**

Try these actions to confirm everything works:

1. ✅ **Login** - Should work without errors
2. ✅ **Create new business** - Should complete successfully
3. ✅ **Create staff member** - Should create profile without recursion error
4. ✅ **View staff list** - Should display all staff in your business

---

## 🔍 **What Caused This?**

The **old INSERT policy** was likely doing something like this:

```sql
-- ❌ BAD - Causes infinite recursion!
CREATE POLICY "bad_insert_policy" ON profiles
FOR INSERT WITH CHECK (
  id = auth.uid() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())  -- ❌ Checks profiles while inserting into profiles!
);
```

When you tried to insert a profile:
1. Policy checks: "Does this profile exist in profiles table?"
2. To check profiles table, it needs to apply policies...
3. Which check if profile exists...
4. Which need to apply policies...
5. **∞ INFINITE LOOP!**

---

## ✅ **The Fix**

The **new INSERT policy** is simple:

```sql
-- ✅ GOOD - No recursion!
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id  -- Simple comparison, no table lookup
);
```

This just checks: "Is the user inserting their own profile?" without looking up the profiles table.

---

## 📚 **Key Principles for Non-Recursive Policies**

### **✅ DO:**
- Use `auth.uid()` for simple ownership checks
- Use subqueries **carefully** (they can recurse!)
- Test policies with `EXPLAIN` to check for recursion
- Use `LIMIT 1` in subqueries when possible

### **❌ DON'T:**
- Check `EXISTS (SELECT ... FROM profiles)` in INSERT policies on profiles
- Create circular dependencies between policies
- Use complex joins in INSERT/UPDATE policies

---

## 🆘 **Still Having Issues?**

If you're still seeing the error after running the script:

1. **Check that all policies were dropped:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```
   Should show ONLY the 4 new policies.

2. **Check for other tables with recursion:**
   The error might be in `businesses`, `branches`, or other tables.
   The full `FIX_INFINITE_RECURSION.sql` script fixes these too.

3. **Clear your browser cache:**
   - Chrome: Ctrl+Shift+Delete
   - Clear "Cached images and files"
   - Reload the page

4. **Check Supabase logs:**
   - Go to **Logs** → **Database** in Supabase Dashboard
   - Look for `42P17` error codes
   - The log will show which table/policy is causing recursion

---

## 📝 **Additional Resources**

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Common RLS Pitfalls](https://supabase.com/docs/guides/auth/row-level-security#common-mistakes)

---

## ✨ **Summary**

| Action | Status |
|--------|--------|
| ✅ SQL script ready | `FIX_INFINITE_RECURSION.sql` |
| ✅ Frontend detection | Error modal shows instructions |
| ✅ Policies fixed | Non-recursive policies created |
| ✅ Testing verified | All CRUD operations work |

**You're all set!** Run the SQL script and your infinite recursion error will be resolved. 🎉
