# 🔥 QUICK FIX: Branches RLS Error (42501)

## ❌ Error
```
Error creating branch: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"branches\""
}
```

## ✅ Solution (3 Steps)

### 1️⃣ Open Supabase SQL Editor
Go to: **Supabase Dashboard** → **SQL Editor**

### 2️⃣ Run This Script
Copy `/FIX_BRANCHES_RLS.sql` and paste into SQL Editor, then click **Run**

### 3️⃣ Test
Try creating a branch in your Tillsup app

---

## 🔍 What the Fix Does

Creates proper RLS policies that allow Business Owners to:
- ✅ Create branches
- ✅ Update branches  
- ✅ Delete branches
- ✅ View branches in their business

---

## 🚨 Still Not Working?

Check your user is a Business Owner:
```sql
SELECT role, business_id FROM profiles WHERE id = auth.uid();
```

**Expected:**
- `role` = `'Business Owner'`
- `business_id` = (not NULL)

**Fix if wrong:**
```sql
UPDATE profiles 
SET role = 'Business Owner' 
WHERE id = auth.uid();
```

---

## 📋 Files
- **SQL Fix:** `/FIX_BRANCHES_RLS.sql`
- **Full Guide:** `/FIX_BRANCHES_ERROR_GUIDE.md`
- **Summary:** `/BRANCHES_RLS_FIX_SUMMARY.md`

---

**That's it! 🎉**
