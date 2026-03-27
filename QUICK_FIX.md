# Quick Fix Reference Card

## 🚨 Seeing Errors? Start Here!

---

## Error: "useAuth called before AuthProvider..."

### ✅ Status: FIXED IN CODE

### 🔧 What You Need to Do:

**Clear your browser cache:**

```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### ✅ Verify Fix:
Open console (`F12`) and look for:
```
📌 Tillsup Version: 2.0.1 - Auth Init Warning Fix Applied
```

---

## Error: "function gen_salt(unknown) does not exist"

### ✅ Status: FIXED (Needs Database Setup)

### 🔧 What You Need to Do:

**1. Enable pgcrypto in Supabase:**
- Go to Supabase Dashboard → SQL Editor
- Run: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

**2. Create the function:**
- Open file: `/supabase_simple_password_reset.sql`
- Copy all contents
- Paste in Supabase SQL Editor
- Click "Run"

### ✅ Verify Fix:
Try resetting a staff password - should show temporary password!

---

## Still Not Working?

### Try These in Order:

1. **Hard Refresh:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Full Cache Clear:** F12 → Right-click refresh → "Empty Cache and Hard Reload"
3. **Incognito Mode:** Open app in private/incognito window
4. **Restart Dev Server:** Stop server, run `rm -rf node_modules/.vite && npm run dev`

---

## Need More Help?

- **Browser Cache Issues:** See `/CACHE_CLEAR_INSTRUCTIONS.md`
- **Password Reset Setup:** See `/PASSWORD_RESET_SETUP.md`
- **All Errors:** See `/TROUBLESHOOTING.md`
- **Complete Details:** See `/ERROR_FIX_SUMMARY.md`

---

## Quick Check: Is New Code Running?

Press `F12`, go to Console tab, look for:

✅ **Version 2.0.1** = New code running  
❌ **No version message** = Still cached, hard refresh needed

---

**90% of issues = cached JavaScript → Just hard refresh!** 🔄
