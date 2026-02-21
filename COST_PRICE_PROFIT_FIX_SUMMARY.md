# Cost Price & Profit Calculation Fix - Summary

## Date: February 18, 2026

## Overview
Fixed profit calculations throughout the POS application to ensure that **Cost Price (COGS)** is properly accounted for when calculating **Net Profit** in all reports, analytics, and the dashboard.

---

## Problem Statement

The user wanted to ensure that when calculating net profit, the system properly uses:

**Net Profit = Selling Price - Cost Price - Operating Expenses**

Or more formally:

**Net Profit = Revenue - COGS - Operating Expenses**

Where:
- **Revenue** = Total sales (selling price × quantity)
- **COGS** = Cost of Goods Sold (cost price × quantity)
- **Operating Expenses** = Rent, salaries, utilities, etc.

---

## What Was Already Working

✅ **Inventory Management** (`/src/app/pages/Inventory.tsx`)
- Products can have a `costPrice` field set when created/edited
- Cost price can be imported/exported via CSV
- Field is optional but recommended

✅ **POS Terminal** (`/src/app/pages/POSTerminal.tsx`)
- When adding items to cart, `costPrice` is copied from inventory
- Cost price is saved with each sale item for future calculations

✅ **SalesContext** (`/src/app/contexts/SalesContext.tsx`)
- `getTotalCOGS()` - Calculates total Cost of Goods Sold
- `getTotalGrossProfit()` - Calculates Revenue - COGS
- `getGrossProfitMargin()` - Calculates margin percentage

✅ **Dashboard** (`/src/app/pages/Dashboard.tsx`)
- Already correctly calculates:
  - `todayCOGS` from sale items
  - `todayGrossProfit = todayRevenue - todayCOGS`
  - `todayNetProfit = todayGrossProfit - todayExpenses`

---

## What Was Fixed

### 1. ReportsEnhanced - Daily Profit Calculations
**File:** `/src/app/pages/ReportsEnhanced.tsx`

**Issue:** Daily profit was calculated as `revenue - expenses`, ignoring COGS

**Fix:**
```typescript
// BEFORE (lines 220-239)
const dailyData = new Map<string, { revenue: number; expenses: number; profit: number }>();
// ...
data.profit = data.revenue - data.expenses; // ❌ Missing COGS

// AFTER
const dailyData = new Map<string, { revenue: number; expenses: number; cogs: number; profit: number }>();

filteredSales.forEach(sale => {
  // ... track revenue ...
  
  // Calculate COGS for this sale
  const saleCOGS = sale.items.reduce((itemSum, item) => {
    return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
  }, 0);
  existing.cogs += saleCOGS;
});

// Calculate profit correctly
data.profit = data.revenue - data.cogs - data.expenses; // ✅ Includes COGS
```

### 2. ReportsEnhanced - Branch Performance Profit
**File:** `/src/app/pages/ReportsEnhanced.tsx`

**Issue:** Branch profit was calculated as `revenue - expenses`, ignoring COGS

**Fix:**
```typescript
// BEFORE (lines 265-320)
const branchMap = new Map<string, {
  // ...
  revenue: number;
  expenses: number;
  profit: number;
  // ...
}>();

// AFTER
const branchMap = new Map<string, {
  // ...
  revenue: number;
  cogs: number;      // ✅ Added COGS tracking
  expenses: number;
  profit: number;
  // ...
}>();

// Calculate COGS per branch
filteredSales.forEach(sale => {
  // ...
  const saleCOGS = sale.items.reduce((itemSum, item) => {
    return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
  }, 0);
  existing.cogs += saleCOGS;
});

// Calculate profit correctly
data.profit = data.revenue - data.cogs - data.expenses; // ✅ Includes COGS
```

---

## How It Works Now

### Complete Profit Calculation Flow

1. **Product Creation** (Inventory)
   - User creates product with:
     - Cost Price: $5 (what you paid to supplier)
     - Retail Price: $10 (what you sell it for)

2. **Sale at POS Terminal**
   - Cashier selects product, chooses quantity (e.g., 2 units)
   - System records:
     - Revenue: $10 × 2 = $20
     - COGS: $5 × 2 = $10 (cost price tracked)

3. **Profit Calculation**
   - **Gross Profit** = Revenue - COGS
     - $20 - $10 = $10
   
   - **Net Profit** = Gross Profit - Operating Expenses
     - If operating expenses are $3
     - $10 - $3 = $7 ✅

### Where Profit is Calculated Correctly

✅ **Dashboard**
- Today's COGS
- Today's Gross Profit
- Today's Net Profit (Revenue - COGS - Expenses)

✅ **ReportsEnhanced - Overview Tab**
- Total Revenue
- Total COGS (calculated internally)
- Total Expenses
- Net Profit (Revenue - COGS - Expenses)
- Daily Profit Trend (includes COGS per day)

✅ **ReportsEnhanced - Branch Performance Tab**
- Revenue by Branch
- COGS by Branch (calculated per sale)
- Expenses by Branch
- Profit by Branch (Revenue - COGS - Expenses)

✅ **Reports (Standard)**
- COGS Display
- Gross Profit
- Gross Profit Margin

---

## Formulas Reference

### Product Level
```
Selling Price = Retail Price or Wholesale Price
Unit Profit = Selling Price - Cost Price

Example:
- Cost Price: $5
- Retail Price: $10
- Unit Profit: $10 - $5 = $5
```

### Sale Level
```
Revenue = Σ (Selling Price × Quantity)
COGS = Σ (Cost Price × Quantity)
Gross Profit = Revenue - COGS

Example (2 products):
- Product A: Cost $5, Sell $10, Qty 3
  - Revenue: $10 × 3 = $30
  - COGS: $5 × 3 = $15
  
- Product B: Cost $8, Sell $15, Qty 2
  - Revenue: $15 × 2 = $30
  - COGS: $8 × 2 = $16

Total:
- Revenue: $30 + $30 = $60
- COGS: $15 + $16 = $31
- Gross Profit: $60 - $31 = $29
```

### Business Level
```
Net Profit = Revenue - COGS - Operating Expenses
          = Gross Profit - Operating Expenses

Example:
- Revenue: $60
- COGS: $31
- Operating Expenses: $10 (rent, salaries, utilities)
- Gross Profit: $60 - $31 = $29
- Net Profit: $29 - $10 = $19 ✅
```

---

## Testing Recommendations

### Test Case 1: Single Product Sale
1. Create a product:
   - Name: "Widget"
   - Cost Price: $5
   - Retail Price: $10

2. Make a sale:
   - Sell 2 units at retail price
   - Expected Revenue: $20
   - Expected COGS: $10
   - Expected Gross Profit: $10

3. Check Dashboard:
   - Today's Revenue should show $20
   - Today's Net Profit should include the COGS deduction

4. Check ReportsEnhanced:
   - Total Revenue: $20
   - Net Profit: Should reflect COGS deduction

### Test Case 2: Multiple Products with Expenses
1. Create two products:
   - Product A: Cost $5, Retail $10
   - Product B: Cost $8, Retail $15

2. Make sales:
   - Product A: 3 units = $30 revenue, $15 COGS
   - Product B: 2 units = $30 revenue, $16 COGS

3. Add an expense:
   - Category: "Rent"
   - Amount: $10

4. Check ReportsEnhanced:
   - Total Revenue: $60
   - Total COGS: $31 (calculated internally)
   - Total Expenses: $10
   - Net Profit: $60 - $31 - $10 = $19 ✅

5. Check Branch Performance:
   - Each branch should show profit as Revenue - COGS - Expenses

---

## Multi-Pricing Support

The system supports different price tiers:

1. **Cost Price** - What you paid (for COGS calculation)
2. **Retail Price** - Standard selling price
3. **Wholesale Price** - Bulk/discount price

**Example:**
- Cost Price: $5
- Retail Price: $10
- Wholesale Price: $8

**When selling at Retail:**
- Revenue: $10
- COGS: $5
- Profit per unit: $5

**When selling at Wholesale:**
- Revenue: $8
- COGS: $5
- Profit per unit: $3

Both scenarios correctly calculate COGS using the same cost price ($5).

---

## Impact on Existing Data

✅ **Backward Compatible**
- Products without `costPrice` will have COGS = 0
- Old sales without `costPrice` will still work
- No data migration required

⚠️ **Recommended Actions**
1. Update existing products to include cost prices for accurate future reporting
2. Review historical reports and note that older sales may not have COGS data
3. Train staff to always enter cost price when adding new products

---

## Files Modified

1. `/src/app/pages/ReportsEnhanced.tsx`
   - Updated daily profit calculation to include COGS
   - Updated branch performance profit to include COGS

2. `/PROFIT_CALCULATIONS_GUIDE.md`
   - Marked all implementation checklist items as complete

3. `/COST_PRICE_PROFIT_FIX_SUMMARY.md` (this file)
   - Created comprehensive documentation

---

## Verification Steps

To verify the fix is working:

1. ✅ Create a product with a cost price
2. ✅ Make a sale in POS Terminal
3. ✅ Check Dashboard - Net Profit should include COGS
4. ✅ Check ReportsEnhanced Overview - Net Profit formula should be correct
5. ✅ Check ReportsEnhanced Branch Performance - Profit should include COGS
6. ✅ Daily profit trend should reflect Revenue - COGS - Expenses

---

## Summary

**Problem:** Profit calculations were missing COGS (cost price) deductions in daily reports and branch performance.

**Solution:** Updated ReportsEnhanced to:
1. Track COGS per day in daily profit calculations
2. Track COGS per branch in branch performance
3. Calculate Net Profit = Revenue - COGS - Expenses (everywhere)

**Result:** All profit calculations now properly account for the cost of products sold, giving accurate financial reporting across the entire POS system.
