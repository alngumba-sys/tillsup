# Branch Isolation Quick Reference

> **TL;DR:** Managers can ONLY see their assigned branch. Business Owners see everything.

---

## For Frontend Developers

### When Fetching Sales Data
```typescript
// ❌ WRONG - No branch filtering
const revenue = getTotalRevenueToday(businessId, staffId);

// ✅ CORRECT - Include branchId
const revenue = getTotalRevenueToday(businessId, staffId, branchId);
```

### When Filtering Data Lists
```typescript
// Always check branchId for Managers
const filteredSales = sales.filter(sale => {
  if (businessId && sale.businessId !== businessId) return false;
  if (staffId && sale.staffId !== staffId) return false;
  // ⭐ CRITICAL: Filter by branch for Managers
  if (branchId && sale.branchId !== branchId) return false;
  return true;
});
```

### When Creating Forms
```typescript
// Disable branch selector for non-owners
<Select 
  value={branchId} 
  disabled={user.role !== "Business Owner"}
>
  {/* ... */}
</Select>

// Show helper text
{user.role !== "Business Owner" && (
  <p className="text-xs text-muted-foreground">
    Items will be added to your assigned branch
  </p>
)}
```

### When Building Analytics
```typescript
// Determine branch filtering based on role
const { branchId } = useMemo(() => {
  if (user.role === "Manager") {
    return { branchId: user.branchId };
  }
  return { branchId: undefined }; // Owner sees all
}, [user]);

// Use in calculations
const metrics = calculateMetrics(businessId, staffId, branchId);
```

---

## For Backend Developers

### API Endpoint Validation
```typescript
// ⚠️ TODO: Backend MUST validate branch access
app.get('/api/sales', (req, res) => {
  const { branchId } = req.query;
  const user = req.user;
  
  // Enforce branch restriction for Managers
  if (user.role === 'Manager' && branchId !== user.branchId) {
    return res.status(403).json({ error: 'Access denied to this branch' });
  }
  
  // Fetch sales...
});
```

### Database Queries
```sql
-- ⚠️ TODO: Always filter by branchId for Managers
SELECT * FROM sales 
WHERE business_id = ? 
  AND (? IS NULL OR branch_id = ?)  -- Branch filter
  AND timestamp >= ?;
```

---

## Role Behavior Cheat Sheet

| Feature | Business Owner | Manager | Staff/Cashier |
|---------|----------------|---------|---------------|
| Switch Branches | ✅ Yes | ❌ No | ❌ No |
| See All Branches | ✅ Yes | ❌ No | ❌ No |
| Branch Selector | ✅ Visible | ❌ Hidden/Disabled | ❌ Hidden/Disabled |
| Dashboard KPIs | All branches | Assigned branch | Own sales only |
| Reports Filter | All branches | Assigned branch | Own sales only |
| POS Terminal | Can select branch | Branch locked | Branch locked |

---

## Common Patterns

### Pattern 1: Get Branch ID from User
```typescript
const effectiveBranchId = user.role === "Manager" 
  ? user.branchId 
  : selectedBranchId;
```

### Pattern 2: Check if Can Switch Branch
```typescript
const { canSwitchBranch } = useBranch();
if (canSwitchBranch()) {
  // Show branch selector
}
```

### Pattern 3: Get Accessible Branches
```typescript
const { getAccessibleBranches } = useBranch();
const branches = getAccessibleBranches(); // Returns all for Owner, single for Manager
```

---

## Critical Files

| File | Purpose |
|------|---------|
| `/src/app/contexts/BranchContext.tsx` | Auto-locks branch for Managers |
| `/src/app/components/BranchGuard.tsx` | Blocks URL tampering |
| `/src/app/contexts/SalesContext.tsx` | Provides branch filtering |
| `/src/app/components/KPISynchronizer.tsx` | Filters top navbar KPIs |
| `/src/app/pages/Dashboard.tsx` | Shows branch-specific data |

---

## Testing Scenarios

### Test as Manager
1. Login as Manager
2. Verify dashboard shows ONLY your branch
3. Try navigating to `?branch=other-id` → Should redirect
4. Check POS shows "Locked" badge
5. Verify Reports has no branch filter

### Test as Owner
1. Login as Business Owner
2. Verify can select any branch
3. Dashboard shows global data
4. POS shows branch dropdown
5. Reports show "All Branches" option

---

## Troubleshooting

**Issue:** Manager sees all branches in dashboard  
**Fix:** Check `branchId` is passed to KPI functions

**Issue:** Branch selector visible for Manager  
**Fix:** Use `canSwitchBranch()` to conditionally show

**Issue:** KPIs show wrong numbers  
**Fix:** Verify `KPISynchronizer` filters by `branchId`

---

## Next Steps for Security

1. ⚠️ **CRITICAL:** Implement backend branch validation
2. Add API middleware to check `user.branchId`
3. Filter database queries by branch
4. Add audit logging for access attempts
5. Implement rate limiting per branch

---

**Quick Links:**
- Full Documentation: `/FRONTEND_BRANCH_ISOLATION.md`
- Implementation Summary: `/BRANCH_ISOLATION_IMPLEMENTATION.md`
- Architecture Diagram: `/SAAS_ARCHITECTURE.md`

---

**Updated:** February 18, 2026
