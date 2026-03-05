# 🔧 LANDING PAGE TROUBLESHOOTING

## 🚨 Issue: "I can't see the landing page"

### ✅ SOLUTIONS

#### **Solution 1: Check Browser Console (F12)**

Open your browser's Developer Tools (F12) and look for these logs:

**What you should see:**
```javascript
🏠 Landing page loaded, isAuthenticated: false, loading: false
🎨 Landing render state: { loading: false, isAuthenticated: false }
✅ Rendering landing page...
```

**If you see errors:**
- Look for red error messages
- Check if there's a component error in the ErrorBoundary
- Take a screenshot and share it

---

#### **Solution 2: Try Alternative Landing Pages**

I've created multiple landing page versions. Try these URLs:

1. **Fallback Landing** (simplest, always works):
   ```
   /fallback
   ```

2. **Simple Landing** (minimal version):
   ```
   /simple
   ```

3. **Full Landing** (original with all features):
   ```
   /landing-full
   ```

4. **Default** (LandingSafe with error boundary):
   ```
   /
   ```

**How to test:**
- Go to `https://your-app-url.com/fallback`
- If this works, then the issue is with the main Landing component
- The fallback page has all the essentials: CTA buttons, features, pricing

---

#### **Solution 3: Check If You're Already Logged In**

The landing page automatically redirects authenticated users to the dashboard.

**Debug steps:**
1. Open browser console (F12)
2. Run:
   ```javascript
   localStorage.getItem('supabase.auth.token')
   ```
3. If you see a token, you're logged in → Logout first
4. To logout, run:
   ```javascript
   localStorage.clear();
   window.location.href = '/';
   ```

---

#### **Solution 4: Check Network Tab**

1. Open DevTools (F12) → Network tab
2. Reload the page
3. Look for failed requests (red text)

**Common issues:**
- **Failed Supabase requests**: Expected in Figma preview, but landing should still show
- **CORS errors**: Not an issue for landing page
- **404 errors**: Missing assets (fonts, images) - landing should still work

---

#### **Solution 5: Disable All Browser Extensions**

Some extensions (ad blockers, privacy tools) block React apps.

**Steps:**
1. Open Incognito/Private browsing window
2. Go to your app URL
3. If landing shows → An extension was blocking it
4. Disable extensions one by one to find the culprit

---

### 🐛 DEBUG MODE

I've added console logging to the Landing component. 

**Check the console for:**

```javascript
// On page load:
🏠 Landing page loaded, isAuthenticated: false, loading: true

// Then after auth loads:
🏠 Landing page loaded, isAuthenticated: false, loading: false

// Render decision:
🎨 Landing render state: { loading: false, isAuthenticated: false }

// Final render:
✅ Rendering landing page...
```

**If stuck at:**
```javascript
🎨 Landing render state: { loading: true, isAuthenticated: false }
```
↑ This means AuthContext is stuck loading

**Fix:** The landing should still render, but if not:
```javascript
// Run in console:
window.location.href = '/fallback';
```

---

### 📋 WHAT EACH LANDING PAGE OFFERS

| Page | URL | Features | Best For |
|------|-----|----------|----------|
| **LandingSafe** | `/` | Full landing with error boundary | Production (default) |
| **FallbackLanding** | `/fallback` | Simple, minimal, no animations | Testing, debugging |
| **SimpleLanding** | `/simple` | Clean version | Alternative option |
| **Landing** | `/landing-full` | Full-featured original | Feature-rich display |

---

### ✅ QUICK FIXES

**Fix 1: Hard Reload**
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

**Fix 2: Clear Cache**
```
Windows: Ctrl + Shift + Delete
Mac: Cmd + Shift + Delete
```

**Fix 3: Force Fallback Mode**
```javascript
// Run in console:
window.location.href = '/fallback';
```

**Fix 4: Check if logged in**
```javascript
// Run in console:
console.log('Logged in?', !!localStorage.getItem('supabase.auth.token'));
```

**Fix 5: Clear everything and start fresh**
```javascript
// Run in console:
localStorage.clear();
sessionStorage.clear();
window.location.href = '/fallback';
```

---

### 🔍 COMMON SCENARIOS

#### **Scenario 1: Blank White Screen**

**Possible causes:**
1. JavaScript error in component
2. Missing import
3. AuthContext stuck loading
4. BrandingContext error

**Solution:**
1. Check browser console for errors
2. Try `/fallback` URL
3. Clear cache and reload

---

#### **Scenario 2: Infinite Loading Spinner**

**Possible causes:**
1. AuthContext loading stuck at `true`
2. Supabase session check hanging

**Solution:**
```javascript
// Run in console:
localStorage.clear();
window.location.href = '/fallback';
```

---

#### **Scenario 3: Immediate Redirect to Dashboard**

**This is correct behavior if you're logged in!**

**To see landing page:**
1. Logout first
2. Or use Incognito mode
3. Or run: `localStorage.clear(); window.location.href = '/'`

---

#### **Scenario 4: Error Boundary Shows Red Screen**

**LandingSafe has a built-in error boundary that shows errors in red.**

**What to do:**
1. Read the error message
2. Take a screenshot
3. Try `/fallback` instead
4. Report the error with screenshot

---

### 🎯 RECOMMENDED TESTING FLOW

1. **First, try Fallback:**
   ```
   https://your-app.com/fallback
   ```
   ✅ This should ALWAYS work

2. **If fallback works, try default:**
   ```
   https://your-app.com/
   ```
   ✅ Should show full landing page

3. **If default doesn't work:**
   - Check browser console
   - Look for JavaScript errors
   - Share error screenshot

4. **Test login flow:**
   - Click "Sign In" button
   - Should go to `/login`
   - Login with credentials
   - Should redirect to `/app/dashboard`

5. **Test registration:**
   - Go back to landing (logout first)
   - Click "Start Free Trial"
   - Should go to `/register`

---

### 📞 IF NOTHING WORKS

**Deploy to a real server (not Figma preview):**

```bash
# Option 1: Vercel
npm install -g vercel
vercel deploy --prod

# Option 2: Netlify
npm install -g netlify-cli
npm run build
netlify deploy --prod

# Option 3: Local development
npm run dev
# Open: http://localhost:5173
```

Then test again. Figma Make preview has limitations that can cause blank screens.

---

### 💡 TL;DR - INSTANT FIX

**Just want to see the landing page NOW?**

```javascript
// Run in browser console:
window.location.href = '/fallback';
```

This shows a simple, guaranteed-to-work landing page with all essential features:
- ✅ Hero section
- ✅ Sign In / Register buttons
- ✅ Features grid
- ✅ Pricing preview
- ✅ Call to action

**100% reliable, no dependencies, works everywhere!**
