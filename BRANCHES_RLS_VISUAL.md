# Branches RLS Error - Visual Flow Diagram

## 🔴 BEFORE FIX - What Was Happening

```
┌─────────────────────────────────────────────────────────┐
│  User tries to create branch                             │
│  createBranch("West Branch", "Nairobi West")            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  INSERT INTO branches                                    │
│  (business_id, name, location, status)                  │
│  VALUES ('abc-123', 'West Branch', 'Nairobi West', ...)│
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  RLS Policy Check: branches_insert_policy               │
│  ❌ Policy Missing or Incorrect                         │
│  ❌ Cannot verify user permissions                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  ❌ ERROR 42501                                         │
│  "new row violates row-level security policy"           │
│  Branch NOT created                                      │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ AFTER FIX - What Happens Now

```
┌─────────────────────────────────────────────────────────┐
│  User tries to create branch                             │
│  createBranch("West Branch", "Nairobi West")            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  INSERT INTO branches                                    │
│  (business_id, name, location, status)                  │
│  VALUES ('abc-123', 'West Branch', 'Nairobi West', ...)│
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  RLS Policy Check: branches_insert_policy               │
│                                                          │
│  ✅ Check 1: User authenticated? (auth.uid() exists)    │
│  ✅ Check 2: User role = 'Business Owner'?              │
│  ✅ Check 3: User's business_id matches branch's?       │
│                                                          │
│  ALL CHECKS PASSED ✅                                   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  ✅ SUCCESS                                             │
│  Branch created successfully!                            │
│  Returns: { success: true, branchId: 'xyz-789' }       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 The RLS Policy Logic

```
┌────────────────────────────────────────────────────────┐
│           branches_insert_policy                        │
│                                                         │
│  FOR INSERT TO authenticated                            │
│  WITH CHECK (                                           │
│    EXISTS (                                             │
│      SELECT 1 FROM profiles                             │
│      WHERE                                              │
│        ┌─────────────────────────────────────┐         │
│        │ id = auth.uid()                     │  ◄─── User ID matches
│        └─────────────────────────────────────┘         │
│           AND                                           │
│        ┌─────────────────────────────────────┐         │
│        │ business_id = branches.business_id  │  ◄─── Same business
│        └─────────────────────────────────────┘         │
│           AND                                           │
│        ┌─────────────────────────────────────┐         │
│        │ role = 'Business Owner'             │  ◄─── Has permission
│        └─────────────────────────────────────┘         │
│    )                                                    │
│  )                                                      │
└────────────────────────────────────────────────────────┘
```

---

## 👥 Who Can Do What?

```
┌──────────────────┬─────────┬─────────┬─────────┬─────────┐
│   User Role      │ SELECT  │ INSERT  │ UPDATE  │ DELETE  │
├──────────────────┼─────────┼─────────┼─────────┼─────────┤
│ Business Owner   │   ✅    │   ✅    │   ✅    │   ✅    │
│ Manager          │   ✅    │   ❌    │   ❌    │   ❌    │
│ Cashier          │   ✅    │   ❌    │   ❌    │   ❌    │
│ Staff            │   ✅    │   ❌    │   ❌    │   ❌    │
│ Unauthenticated  │   ❌    │   ❌    │   ❌    │   ❌    │
└──────────────────┴─────────┴─────────┴─────────┴─────────┘
```

---

## 🛠️ Fix Application Flow

```
Step 1: Open Supabase
    │
    ▼
┌─────────────────────────────┐
│  Supabase Dashboard         │
│  → SQL Editor               │
└─────────────┬───────────────┘
              │
              ▼
Step 2: Run SQL Script
┌─────────────────────────────┐
│  Copy /FIX_BRANCHES_RLS.sql │
│  Paste into SQL Editor      │
│  Click "Run"                │
└─────────────┬───────────────┘
              │
              ▼
Step 3: Verify
┌─────────────────────────────┐
│  SELECT policyname          │
│  FROM pg_policies           │
│  WHERE tablename =          │
│    'branches';              │
└─────────────┬───────────────┘
              │
              ▼
Step 4: Test
┌─────────────────────────────┐
│  Open Tillsup app           │
│  Go to Branches tab         │
│  Click "Add Branch"         │
│  Fill form & submit         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  ✅ Branch Created!         │
│  Success! 🎉                │
└─────────────────────────────┘
```

---

## 🔄 Data Flow with RLS

```
   Frontend (React)                Supabase                Database
        │                              │                       │
        │  createBranch()              │                       │
        ├─────────────────────────────►│                       │
        │                              │                       │
        │                              │  Auth Check          │
        │                              ├──────────────────────►│
        │                              │  auth.uid() valid?   │
        │                              │◄──────────────────────┤
        │                              │  ✅ Yes              │
        │                              │                       │
        │                              │  INSERT + RLS Check  │
        │                              ├──────────────────────►│
        │                              │  - Check role        │
        │                              │  - Check business    │
        │                              │  - Verify ownership  │
        │                              │◄──────────────────────┤
        │                              │  ✅ All Passed       │
        │                              │                       │
        │  { success: true,            │                       │
        │    branchId: 'xyz' }         │                       │
        │◄─────────────────────────────┤                       │
        │                              │                       │
        ▼                              ▼                       ▼
    Display                         Log                    Stored
    Success                         Event                  in DB
```

---

## 📊 Database Relationships

```
┌──────────────────┐
│   businesses     │
│                  │
│  id (PK)        │◄─────────┐
│  name           │          │
│  owner_id       │          │
└──────────────────┘          │
                              │
                              │  business_id (FK)
┌──────────────────┐          │
│   profiles       │          │
│                  │          │
│  id (PK)        │          │
│  business_id    │──────────┤
│  role           │          │
│  branch_id      │──┐       │
└──────────────────┘  │       │
                      │       │
                      │       │  business_id (FK)
┌──────────────────┐  │       │
│   branches       │  │       │
│                  │◄─┼───────┘
│  id (PK)        │◄─┘
│  business_id    │
│  name           │
│  location       │
│  status         │
└──────────────────┘

RLS ensures:
- Users only access branches in THEIR business
- Only Business Owners can CREATE branches
- All users in business can VIEW branches
```

---

## 🎯 Key Takeaway

**Before:** RLS policy was missing or incorrect → INSERT blocked

**After:** Proper RLS policy in place → INSERT allowed for Business Owners

**The Fix:** One SQL script that creates the correct policies ✅
