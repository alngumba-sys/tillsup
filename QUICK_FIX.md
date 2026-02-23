# 🔧 QUICK FIX - RLS Blocking Business Access

## Problem
Leah's user account references a business that exists in the database, but RLS (Row Level Security) policies are preventing access because the `owner_id` doesn't match her user ID.

## ✅ Solution - Run This in Supabase SQL Editor

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run This SQL (Copy & Paste)

```sql
-- Fix the owner_id mismatch for Leah's business
UPDATE businesses
SET owner_id = (
    SELECT id FROM profiles 
    WHERE email = 'leah.wangui@tillsup.com' 
    LIMIT 1
)
WHERE id = '7250c216-c81f-44c7-b9d6-1bb16a10b14d';

-- Verify the fix worked
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.owner_id,
    p.email as owner_email,
    p.first_name || ' ' || p.last_name as owner_name,
    CASE 
        WHEN b.owner_id = p.id THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as status
FROM businesses b
LEFT JOIN profiles p ON p.id = b.owner_id
WHERE b.id = '7250c216-c81f-44c7-b9d6-1bb16a10b14d';
```

### Step 3: After Running the SQL
1. **Refresh your Tillsup app** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Log in with Leah's credentials**
3. You should see the dashboard load successfully! 🎉

---

## 🔍 What This Does

- **Updates the business record** to set `owner_id` to Leah's actual user ID
- **Bypasses RLS** because SQL Editor runs with admin privileges
- **Verifies the fix** by showing if owner_id now matches

---

## 📊 Optional: Check Current State First

If you want to see what's wrong before fixing, run this first:

```sql
-- See the mismatch
SELECT 
    'Business' as record_type,
    b.id,
    b.name,
    b.owner_id
FROM businesses b
WHERE b.id = '7250c216-c81f-44c7-b9d6-1bb16a10b14d'

UNION ALL

SELECT 
    'Profile' as record_type,
    p.id,
    p.email,
    p.business_id as owner_id
FROM profiles p
WHERE p.email = 'leah.wangui@tillsup.com';
```

This will show you that the business `owner_id` doesn't match Leah's profile `id`.

---

## 🚨 Alternative: Nuclear Option (If Above Fails)

If the UPDATE still fails for some reason, delete the business and let the app auto-create it:

```sql
-- Delete the problematic business
DELETE FROM businesses 
WHERE id = '7250c216-c81f-44c7-b9d6-1bb16a10b14d';

-- Update Leah's profile to create a new business
UPDATE profiles 
SET business_id = gen_random_uuid()
WHERE email = 'leah.wangui@tillsup.com';
```

Then refresh the app - it will auto-create the business with correct permissions.
