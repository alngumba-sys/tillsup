# Visual Flow Guide - Landing Page

## 🎯 What Should Happen

### Scenario A: First-Time Visitor (Not Logged In)

```
┌─────────────────────────────────────────┐
│  1. User Opens Browser                  │
│     http://localhost:5173               │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  2. App Component Loads                 │
│     • BrandingProvider initializes      │
│     • AuthProvider starts auth check    │
│     Console: "🚀 App component loaded"  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  3. Landing Page Renders                │
│     • Shows immediately (no wait)       │
│     • isAuthenticated: false            │
│     • loading: true → false (0-8s)      │
│     Console: "🏠 Landing page loaded"   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  4. User Sees Landing Page              │
│     ✅ Hero section with Tillsup logo   │
│     ✅ "Start Free Trial" button        │
│     ✅ "Sign In" button                 │
│     ✅ Features grid                    │
│     ✅ Pricing plans                    │
│     ✅ Footer                           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  5. User Can Click Buttons              │
│     → "Start Free Trial" → /register    │
│     → "Sign In" → /login                │
│     → "View Pricing" → scrolls down     │
└─────────────────────────────────────────┘
```

---

### Scenario B: Returning User (Already Logged In)

```
┌─────────────────────────────────────────┐
│  1. User Opens Browser                  │
│     http://localhost:5173               │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  2. App Component Loads                 │
│     • AuthProvider detects session      │
│     Console: "🚀 App component loaded"  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  3. Landing Page Shows Loading Screen   │
│     • Tillsup logo with pulse animation │
│     • "Redirecting to dashboard..."     │
│     • isAuthenticated: true             │
│     • loading: true                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  4. Auth Completes                      │
│     • User profile loaded               │
│     • Business data loaded              │
│     • loading: false                    │
│     Console: "🔀 Redirecting..."        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  5. Redirect to Dashboard               │
│     → /app/dashboard                    │
│     ✅ User sees their POS dashboard    │
└─────────────────────────────────────────┘
```

---

### Scenario C: Error Occurred

```
┌─────────────────────────────────────────┐
│  1. User Opens Browser                  │
│     Something went wrong                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  2. Error Boundary Catches Error        │
│     • Shows friendly error message      │
│     • Displays error details            │
│     • Console: error stack trace        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  3. User Sees Error Screen              │
│     🔴 "Something went wrong"           │
│     📋 Error message                    │
│     🔄 "Try Again" button               │
│     🏠 "Return Home" button             │
│     🔍 "Run System Diagnostics" button  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  4. User Can:                           │
│     → Click "Try Again" (reload)        │
│     → Click "Return Home" (go to /)     │
│     → Click "Diagnostics" (debug)       │
└─────────────────────────────────────────┘
```

---

## 🔍 Diagnostic Page Flow

```
┌─────────────────────────────────────────┐
│  User Visits /diagnostic                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Diagnostic Page Loads                  │
│  Runs automatic checks:                 │
│  ├─ 1. Authentication status            │
│  ├─ 2. Business data                    │
│  ├─ 3. Supabase connection              │
│  ├─ 4. Database tables access           │
│  ├─ 5. Branding assets                  │
│  └─ 6. Browser info                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Results Displayed:                     │
│                                         │
│  ✅ Authentication: OK                  │
│     • Loading: false                    │
│     • Authenticated: true               │
│     • User: user@example.com            │
│                                         │
│  ✅ Business: OK                        │
│     • Name: My Business                 │
│     • Plan: Pro                         │
│                                         │
│  ✅ Supabase: OK                        │
│     • Connected                         │
│     • Tables: 6 accessible              │
│                                         │
│  OR                                     │
│                                         │
│  ❌ Supabase: Error                     │
│     • Connection failed                 │
│     • Error: [details]                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  User Can:                              │
│  • Refresh checks                       │
│  • Reload page                          │
│  • Clear storage & reload               │
│  • Return home                          │
└─────────────────────────────────────────┘
```

---

## 📊 State Timeline

### Normal Flow (No Auth)

```
Time  Auth Loading  Authenticated  Page State
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0s    true          false          Landing renders
1s    true          false          Landing displays
2s    true          false          Landing displays
3s    false         false          Landing displays
...   false         false          User interacts
```

### Normal Flow (With Auth)

```
Time  Auth Loading  Authenticated  Page State
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0s    true          false          Landing loading screen
1s    true          true           Landing loading screen
2s    false         true           Redirecting...
3s    false         true           Dashboard loads
```

### Problematic Flow (Timeout)

```
Time  Auth Loading  Authenticated  Page State
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0s    true          false          Landing loading screen
1s    true          false          Landing loading screen
...   true          false          Landing loading screen
8s    false         false          Timeout! Shows Landing
                                   (See: "Business fetch timed out")
```

---

## 🎨 Visual States

### 1. Landing Page (Not Authenticated)
```
┌───────────────────────────────────────────┐
│  [Tillsup Logo]          [Sign In] [Free Trial] │
├───────────────────────────────────────────┤
│                                           │
│         The Modern POS That               │
│            Grows With You                 │
│                                           │
│    Transform your business operations     │
│                                           │
│    [Start Free Trial] [View Pricing]      │
│                                           │
│  ✓ 14-day free trial                      │
│  ✓ No credit card required                │
│  ✓ Cancel anytime                         │
│                                           │
│  [Features Grid...]                       │
│  [Pricing Plans...]                       │
│  [Footer...]                              │
└───────────────────────────────────────────┘
```

### 2. Loading Screen (Redirecting)
```
┌───────────────────────────────────────────┐
│                                           │
│                                           │
│              [Tillsup Logo]               │
│           (pulsing animation)             │
│                                           │
│       Redirecting to dashboard...         │
│                                           │
│                                           │
└───────────────────────────────────────────┘
```

### 3. Error Screen
```
┌───────────────────────────────────────────┐
│                                           │
│              [⚠️ Icon]                    │
│                                           │
│          Something went wrong             │
│                                           │
│        [Error message details]            │
│                                           │
│         [Try Again] [Return Home]         │
│                                           │
│        [Run System Diagnostics]           │
│                                           │
└───────────────────────────────────────────┘
```

### 4. Diagnostic Page
```
┌───────────────────────────────────────────┐
│  System Diagnostics              [Home]   │
├───────────────────────────────────────────┤
│  Authentication                  ✅ OK    │
│  • Loading: false                         │
│  • Authenticated: true                    │
│  • User: user@example.com                 │
├───────────────────────────────────────────┤
│  Business                        ✅ OK    │
│  • Name: My Business                      │
│  • Plan: Pro                              │
├───────────────────────────────────────────┤
│  Supabase                        ✅ OK    │
│  • Connected                              │
│  • Tables: profiles, businesses, sales... │
├───────────────────────────────────────────┤
│  [Reload Page] [Clear Storage & Reload]   │
└───────────────────────────────────────────┘
```

---

## 🔧 Debug Mode Console

### What to Look For:

**✅ Good:**
```
🚀 App component loaded
🔐 Auth state change: INITIAL_SESSION Session: false
🚫 No session found on initial load
🏠 Landing page loaded, isAuthenticated: false, loading: false
```

**⚠️ Warning:**
```
🚀 App component loaded
🔐 Auth state change: INITIAL_SESSION Session: true
Business fetch timed out after 3s, using placeholder
```
→ **Action:** Run SQL fix from `/SIMPLE_FIX.sql`

**❌ Error:**
```
🚀 App component loaded
Error: Failed to fetch
```
→ **Action:** Check Supabase connection, check internet

---

## 🎯 Quick Reference

| Situation | What You Should See | Action |
|-----------|-------------------|--------|
| First visit | Landing page immediately | None - it's working! |
| Already logged in | Loading screen → Dashboard | None - it's working! |
| Blank screen | Nothing | Open console, visit /diagnostic |
| Error message | Error boundary screen | Click "Run System Diagnostics" |
| Timeout message | "Business fetch timed out" | Run SQL fix in Supabase |
| Broken layout | Partial page | Check CSS loading in Network tab |

---

## 📱 Mobile vs Desktop

### Desktop Flow
- Full landing page with all features
- Hero icons on left and right
- 4-column feature grid
- 4-column pricing grid

### Mobile Flow
- Responsive landing page
- Single column layout
- Stacked features
- Stacked pricing
- Hamburger menu (if nav is too wide)

Both should load immediately with no blank screen!

---

## ✨ Summary

**Expected Behavior:**
1. Page loads instantly (no blank screen)
2. Landing page visible within 1 second
3. If logged in, shows brief loading then redirects
4. Smooth, professional experience

**If Something's Wrong:**
1. Check console (F12)
2. Visit `/diagnostic`
3. Follow troubleshooting guide
4. Run SQL fix if needed

**Everything should "just work"!** 🎉
