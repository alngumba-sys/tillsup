# 🚨 CAN'T LOG IN? - DO THIS NOW

## The Fix (2 Minutes)

### 1️⃣ Open Supabase
**Supabase Dashboard** → **SQL Editor**

### 2️⃣ Copy & Run This
Copy `/FIX_LOGIN_COMPLETE.sql` → Paste → Click **RUN**

### 3️⃣ Clear Cache & Retry
- Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
- Clear cache
- Close all tabs
- Try logging in again

---

## ✅ Done!

You should now be able to log in.

---

## 🔍 Still Failing?

### Quick Check: Is your profile missing?

Run this in SQL Editor:
```sql
SELECT id, email, role, business_id 
FROM profiles 
WHERE email = 'YOUR-EMAIL-HERE';
```

**If empty (no results):** Your profile is missing.

**Create it:**
```sql
-- First, get your user ID from auth
SELECT id FROM auth.users WHERE email = 'YOUR-EMAIL-HERE';

-- Then create profile (replace YOUR-USER-ID with id from above)
INSERT INTO profiles (id, email, role)
VALUES (
  'YOUR-USER-ID',
  'YOUR-EMAIL-HERE',
  'Business Owner'
);
```

Try logging in again.

---

## 📁 Files
- **Complete Fix**: `/FIX_LOGIN_COMPLETE.sql`
- **Full Guide**: `/LOGIN_FIX_GUIDE.md`

---

**That's it! 🎉**
