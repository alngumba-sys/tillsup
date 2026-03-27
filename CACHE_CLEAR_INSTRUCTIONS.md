# Browser Cache Clear Instructions

## ⚠️ If you're seeing old errors after code updates

The warning "useAuth called before AuthProvider fully initialized" has been **fixed in the code**, but your browser may be running a cached (old) version of the JavaScript bundle.

---

## Quick Fix: Hard Refresh

### Chrome / Edge / Brave (Windows/Linux):
```
Ctrl + Shift + R
```
or
```
Ctrl + F5
```

### Chrome / Edge (Mac):
```
Cmd + Shift + R
```

### Firefox (Windows/Linux):
```
Ctrl + Shift + R
```
or
```
Ctrl + F5
```

### Firefox (Mac):
```
Cmd + Shift + R
```

### Safari (Mac):
```
Cmd + Option + R
```

---

## Full Cache Clear (if hard refresh doesn't work)

### Chrome / Edge / Brave:
1. Press `F12` to open DevTools
2. **Right-click** the refresh button (next to address bar)
3. Select **"Empty Cache and Hard Reload"**

### Firefox:
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select **"Cached Web Content"**
3. Time Range: **"Everything"**
4. Click **"Clear Now"**

### Safari:
1. Press `Cmd + Option + E` to empty caches
2. Then `Cmd + R` to reload

---

## For Development Servers (Vite)

If running locally with `npm run dev`:

1. **Stop the dev server** (`Ctrl + C`)
2. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   ```
3. **Restart dev server:**
   ```bash
   npm run dev
   ```

---

## Verify the Fix

After clearing cache, check the browser console:

✅ **Fixed:** No warning messages appear  
❌ **Still cached:** Warning still shows

If the warning persists after clearing cache:
1. Try opening in **Incognito/Private mode**
2. Check if you have multiple browser tabs open
3. Ensure you're on the latest code version

---

## Why This Happens

- Browsers cache JavaScript files for performance
- Code updates don't always trigger cache invalidation
- Hard refresh forces the browser to download fresh files
- Service Workers can also cache old versions

---

## Production Deployments (Netlify)

If deployed to Netlify:
1. Deployments get automatic cache-busting via file hashes
2. But you may still need to hard refresh on first visit
3. Consider adding `Cache-Control` headers for better control

---

**The code has been fixed - this is purely a browser caching issue!**
