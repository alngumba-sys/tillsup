# Frontend Branch Isolation System

## Overview

This document describes the comprehensive frontend branch isolation system implemented in the POS SaaS platform. This system ensures that Managers and Staff can ONLY view and interact with data from their assigned branch, while Business Owners maintain full multi-branch access.

**IMPORTANT:** This is a FRONTEND-ONLY implementation. Backend API enforcement must be implemented separately.

---

## Role-Based Access Matrix

| Role | Branch Access | Can Switch Branches | Data Visibility |
|------|--------------|---------------------|-----------------|
| **Business Owner** | All branches | ✅ Yes | All branches, global view |
| **Accountant** | All branches | ✅ Yes | All branches, global view |
| **Manager** | Assigned branch only | ❌ No (Branch Locked) | Assigned branch only |
| **Cashier** | Assigned branch only | ❌ No (Branch Locked) | Own sales + assigned branch |
| **Staff** | Assigned branch only | ❌ No (Branch Locked) | Own sales + assigned branch |

---

## Implementation Layers

### 1. **BranchContext** - Core State Management
**File:** `/src/app/contexts/BranchContext.tsx`

**Responsibilities:**
- Auto-locks `selectedBranchId` to user's `branchId` for restricted roles
- Provides `canSwitchBranch()` helper (returns false for Managers/Staff)
- Provides `getAccessibleBranches()` helper (returns only assigned branch)
- Persists branch selection to localStorage
- Automatically creates default "Main Branch" for new businesses

**Key Features:**
```typescript
// Auto-lock on user login (lines 113-125)
useEffect(() => {
  if (user) {
    if (user.role === "Business Owner") {
      // No branch lock
    } else if (user.branchId) {
      // Manager/Staff/Cashier: LOCKED to assigned branch
      if (selectedBranchId !== user.branchId) {
        setSelectedBranchId(user.branchId);
      }
    }
  }
}, [user, selectedBranchId]);
```

---

### 2. **BranchGuard** - Route Protection
**File:** `/src/app/components/BranchGuard.tsx`

**Responsibilities:**
- Wraps all protected routes in `/app`
- Checks if Manager/Staff has assigned branch
- Blocks URL parameter tampering (`?branch=other-id`)
- Blocks path-based navigation (`/branch/other-id`)
- Redirects to dashboard with toast notification

**Protection Mechanisms:**

#### URL Parameter Protection
```typescript
const urlParams = new URLSearchParams(location.search);
const branchParam = urlParams.get("branch");

if (branchParam && branchParam !== user.branchId) {
  toast.warning("Access Restricted");
  navigate("/app/dashboard", { replace: true });
}
```

#### Path Segment Protection
```typescript
const pathSegments = location.pathname.split('/');
pathSegments.forEach((segment, index) => {
  if (segment === 'branch') {
    const potentialBranchId = pathSegments[index + 1];
    if (potentialBranchId !== user.branchId) {
      toast.error("Access Denied");
      navigate("/app/dashboard", { replace: true });
    }
  }
});
```

---

### 3. **SalesContext** - Data Filtering
**File:** `/src/app/contexts/SalesContext.tsx`

**Responsibilities:**
- All analytics methods accept optional `branchId` parameter
- `filterSales()` helper filters by business, staff, and branch
- All KPI calculations respect branch filtering

**Updated Method Signatures:**
```typescript
getTotalRevenueToday(businessId?: string, staffId?: string, branchId?: string): number
getTotalCustomersToday(businessId?: string, staffId?: string, branchId?: string): number
getSalesToday(businessId?: string, staffId?: string, branchId?: string): Sale[]
```

---

### 4. **KPISynchronizer** - Top Navbar KPIs
**File:** `/src/app/components/KPISynchronizer.tsx`

**Responsibilities:**
- Updates real-time KPIs in TopNavbar
- Applies role-based branch filtering
- Managers see ONLY their branch's customers and sales

**Implementation:**
```typescript
// Manager sees only their branch
if (user.role === "Manager") {
  branchId = user.branchId || undefined;
}

const customers = getTotalCustomersToday(businessId, staffId, branchId);
const revenue = getTotalRevenueToday(businessId, staffId, branchId);
```

---

### 5. **Dashboard** - KPI & Analytics Display
**File:** `/src/app/pages/Dashboard.tsx`

**Responsibilities:**
- Displays role-based KPIs
- Filters all sales, expenses, and transactions by branch
- Shows branch-locked banner for Managers
- Calculates branch-specific profit/loss

**Branch Filtering:**
```typescript
const { businessId, staffId, branchId, displayName } = useMemo(() => {
  if (user.role === "Manager") {
    branchId = user.branchId || undefined;
    displayName = "Your Branch";
  }
  return { businessId, staffId, branchId, displayName };
}, [user, business]);
```

**Manager Info Banner:**
```tsx
{user?.role === "Manager" && user.branchId && (
  <Alert className="border-purple-200 bg-purple-50">
    <Building2 className="w-4 h-4 text-purple-600" />
    <AlertDescription className="text-purple-800">
      You're viewing <strong>{branchName} data</strong>. 
      All metrics reflect only this branch's sales, inventory, and expenses.
    </AlertDescription>
  </Alert>
)}
```

---

### 6. **POSTerminal** - Branch-Locked UI
**File:** `/src/app/pages/POSTerminal.tsx`

**Responsibilities:**
- Shows branch selector ONLY for Business Owner
- Shows "Locked" badge for Managers/Staff
- Auto-locks POS transactions to assigned branch

**UI Implementation:**
```tsx
{/* Business Owner: Branch Selector */}
{user?.role === "Business Owner" && (
  <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
    <SelectValue placeholder="Select Branch" />
  </Select>
)}

{/* Manager/Staff: Locked Branch Indicator */}
{(user?.role === "Manager" || user?.role === "Staff") && (
  <div className="flex items-center gap-2 bg-slate-100 rounded-md px-3 py-1.5">
    <Building2 className="w-4 h-4" />
    <span>{branchName}</span>
    <Badge variant="outline">Locked</Badge>
  </div>
)}
```

---

### 7. **Reports** - Branch-Filtered Analytics
**File:** `/src/app/pages/ReportsEnhanced.tsx`

**Responsibilities:**
- Hides branch filter dropdown for Managers
- Auto-filters all reports by assigned branch
- Provides `canViewAllBranches` flag

**Branch Filter Logic:**
```typescript
const { defaultBranchId, canViewAllBranches } = useMemo(() => {
  if (user.role === "Business Owner" || user.role === "Accountant") {
    canViewAllBranches = true;
  } else if (user.role === "Manager") {
    defaultBranchId = user.branchId;
  }
  return { defaultBranchId, canViewAllBranches };
}, [user]);
```

**UI Visibility:**
```tsx
{/* Branch Filter - Hidden for Managers */}
{canViewAllBranches && (
  <Select value={filterBranchId} onValueChange={setFilterBranchId}>
    <SelectItem value="ALL_BRANCHES">All Branches</SelectItem>
    {branches.map(branch => (
      <SelectItem value={branch.id}>{branch.name}</SelectItem>
    ))}
  </Select>
)}
```

---

### 8. **Inventory** - Branch-Locked Products
**File:** `/src/app/pages/Inventory.tsx`

**Responsibilities:**
- Disables branch selector for non-Business Owners
- Auto-filters inventory by assigned branch
- Shows branch-locked indicator

**Form Implementation:**
```tsx
<Select 
  value={formData.branchId} 
  onValueChange={...}
  disabled={user.role !== "Business Owner"}
>
  <SelectTrigger className={user.role !== "Business Owner" ? "bg-muted" : ""}>
    <SelectValue placeholder="Select branch" />
  </SelectTrigger>
</Select>

{user.role !== "Business Owner" && (
  <p className="text-xs text-muted-foreground">
    Products will be added to your assigned branch
  </p>
)}
```

---

### 9. **Expenses** - Branch-Filtered Costs
**File:** `/src/app/pages/Expenses.tsx`

**Responsibilities:**
- Filters expenses by branch for Managers
- Disables branch selection in expense forms
- Shows only branch-specific expense analytics

**Filter Initialization:**
```typescript
const [filterBranchId, setFilterBranchId] = useState<string>(
  user?.role === "Business Owner" ? "ALL_BRANCHES" : user?.branchId || ""
);
```

---

### 10. **Layout** - Branch Badge Display
**File:** `/src/app/components/Layout.tsx`

**Responsibilities:**
- Shows assigned branch badge in sidebar
- Displays "Your Role" and "Assigned Branch"
- Consistent across desktop and mobile views

**Sidebar Display:**
```tsx
{currentBranch && (
  <div className="mt-2">
    <p className="text-xs text-muted-foreground mb-1">Assigned Branch</p>
    <div className="flex items-center gap-1">
      <Building2 className="w-3 h-3 text-primary" />
      <span className="text-xs font-medium text-primary">
        {currentBranch.name}
      </span>
    </div>
  </div>
)}
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Authentication                       │
│                  (AuthContext loads user)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     BranchContext                            │
│  • Checks user.role                                          │
│  • If Manager: Lock selectedBranchId to user.branchId        │
│  • If Owner: Allow free branch selection                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      BranchGuard                             │
│  • Wraps all /app routes                                     │
│  • Validates URL params & path segments                      │
│  • Redirects if tampering detected                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Page Components                            │
│  • Dashboard: Filters KPIs by branch                         │
│  • Reports: Hides multi-branch filters                       │
│  • Inventory: Locks branch selection                         │
│  • POS: Shows locked branch badge                            │
│  • Expenses: Filters by assigned branch                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Contexts                              │
│  • SalesContext: Filters by branchId                         │
│  • ExpenseContext: Filters by branchId                       │
│  • InventoryContext: Filters by branchId                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### ✅ Protected Against

1. **Manual URL Manipulation**
   - Query parameters: `?branch=other-id` → Blocked
   - Path segments: `/branch/other-id` → Blocked
   - LocalStorage tampering → Overridden on every render

2. **UI State Manipulation**
   - Branch selector hidden for Managers
   - `setSelectedBranchId` overridden by BranchContext
   - All dropdowns disabled for non-owners

3. **Data Leakage in UI**
   - KPIs filtered by branch
   - Reports filtered by branch
   - Transaction lists filtered by branch
   - Analytics filtered by branch

### ⚠️ NOT Protected Against (Backend Responsibility)

1. **Direct API Calls**
   - Managers could use browser DevTools to call APIs directly
   - Backend MUST validate `branchId` in all endpoints

2. **LocalStorage Direct Modification**
   - While overridden, determined users could modify localStorage
   - Backend MUST NOT trust client-provided branch IDs

3. **Network Request Tampering**
   - Users could modify network requests via proxy
   - Backend MUST enforce RBAC at the API level

---

## Testing Checklist

### As a Manager:

- [ ] Can ONLY see dashboard data from assigned branch
- [ ] Top navbar KPIs show ONLY assigned branch data
- [ ] Cannot switch branches in POS Terminal
- [ ] Cannot switch branches in Reports page
- [ ] Branch selector is HIDDEN in all forms
- [ ] Attempting `?branch=other-id` redirects to dashboard
- [ ] Recent transactions show ONLY assigned branch
- [ ] Inventory shows ONLY assigned branch products
- [ ] Expenses show ONLY assigned branch costs

### As a Business Owner:

- [ ] Can see ALL branches in dropdown selectors
- [ ] Can switch branches freely in POS
- [ ] Can filter reports by ALL branches
- [ ] Dashboard shows global business data
- [ ] Can create products for ANY branch
- [ ] Can view ALL branch performance metrics

---

## Manager Experience Example

```
┌─────────────────────────────────────────────────────────────┐
│  Manager: John Smith (Downtown Branch)                      │
└─────────────────────────────────────────────────────────────┘

DASHBOARD VIEW:
✅ Today's Customers: 45 (Downtown only)
✅ Today's Sales: KES 12,500 (Downtown only)
✅ Recent Transactions: 5 latest from Downtown
✅ Sales Chart: 7-day trend for Downtown

POS TERMINAL VIEW:
┌─────────────────────────────────────────┐
│ POS Terminal                            │
│ 🏢 Downtown Branch [Locked]             │
│ (Cannot change branch)                  │
└─────────────────────────────────────────┘

REPORTS VIEW:
✅ Sales filtered to Downtown
✅ Staff performance for Downtown only
✅ No "All Branches" option
✅ Branch filter dropdown is HIDDEN

INVENTORY VIEW:
✅ Products from Downtown only
✅ Cannot add products to other branches
✅ Branch field is DISABLED (grayed out)
```

---

## Business Owner Experience Example

```
┌─────────────────────────────────────────────────────────────┐
│  Owner: Jane Doe (All Branches)                             │
└─────────────────────────────────────────────────────────────┘

DASHBOARD VIEW:
✅ Today's Customers: 245 (All branches combined)
✅ Today's Sales: KES 87,300 (All branches)
✅ Branch breakdown: Downtown, Uptown, Mall
✅ Top performing branches visible

POS TERMINAL VIEW:
┌─────────────────────────────────────────┐
│ POS Terminal                            │
│ 🏢 [Select Branch ▼]                    │
│ • Downtown Branch                       │
│ • Uptown Branch                         │
│ • Mall Branch                           │
└─────────────────────────────────────────┘

REPORTS VIEW:
✅ Branch Filter: [All Branches ▼]
✅ Can select specific branch
✅ Can view cross-branch analytics
✅ Branch performance comparison

INVENTORY VIEW:
✅ Can add products to ANY branch
✅ Branch selector is ENABLED
✅ Can view multi-branch inventory
✅ "All Branches" filter available
```

---

## Migration & Rollout

### Phase 1: Frontend Isolation ✅ COMPLETE
- [x] BranchContext auto-locking
- [x] BranchGuard route protection
- [x] Dashboard branch filtering
- [x] Reports branch filtering
- [x] POS branch locking
- [x] Inventory branch locking
- [x] Expenses branch filtering
- [x] KPI branch filtering

### Phase 2: Backend Enforcement (TODO)
- [ ] Add middleware to validate `user.branchId` on all requests
- [ ] Sales API: Filter sales by `branchId` for Managers
- [ ] Inventory API: Filter products by `branchId`
- [ ] Expenses API: Filter expenses by `branchId`
- [ ] Reports API: Apply branch filtering server-side
- [ ] Add audit logging for cross-branch access attempts

### Phase 3: Advanced Features (TODO)
- [ ] Branch transfer requests (Manager → Owner approval)
- [ ] Cross-branch stock transfers (with approval workflow)
- [ ] Branch-specific permissions (custom role permissions per branch)
- [ ] Branch performance benchmarking

---

## Troubleshooting

### Issue: Manager sees other branches in dropdown
**Solution:** Check that `canSwitchBranch()` returns `false` and `getAccessibleBranches()` returns only assigned branch.

### Issue: KPIs show all branches for Manager
**Solution:** Verify `KPISynchronizer` passes `branchId` to `getTotalRevenueToday()` and `getTotalCustomersToday()`.

### Issue: Manager can navigate to `?branch=other-id`
**Solution:** Ensure `BranchGuard` is wrapping the `/app` route and checking URL parameters.

### Issue: Inventory shows all branches
**Solution:** Check `Inventory.tsx` filtering logic and ensure `filterBranchId` is initialized to `user.branchId`.

---

## Conclusion

This frontend branch isolation system provides a comprehensive UI-level restriction for Managers and Staff, ensuring they can only view and interact with their assigned branch's data. While robust, this is **frontend-only** and must be complemented with backend API enforcement for complete security.

**Next Step:** Implement backend branch validation middleware and API filtering.

---

**Last Updated:** February 18, 2026  
**Version:** 1.0.0  
**Maintainer:** Enterprise POS Development Team
