# Profit Calculations Guide

## Overview
This document explains how purchase prices and profit calculations work throughout the POS SaaS platform.

---

## Purchase Price (Cost Price / COGS)

### Definition
**Purchase Price** (also called **Cost Price** or **COGS - Cost of Goods Sold**) is the amount you paid to acquire or produce each product unit.

### Where it's Set
1. **Inventory Management** (`/src/app/pages/Inventory.tsx`)
   - Optional field when adding/editing products
   - Field: `costPrice` (stored as number)
   - Can be imported via CSV with "Cost Price" column

2. **Data Flow**
   ```
   Inventory Form → InventoryContext → Product Record
                                          ↓
                                     POS Terminal
                                          ↓
                                    Sale Record
   ```

### How it's Tracked
- **InventoryContext** (`/src/app/contexts/InventoryContext.tsx`)
  - Each product has optional `costPrice?: number`
  
- **POSTerminal** (`/src/app/pages/POSTerminal.tsx`)
  - When adding items to cart, `costPrice` is copied from inventory
  - Stored in cart items for later sale recording
  
- **SalesContext** (`/src/app/contexts/SalesContext.tsx`)
  - Each sale item includes `costPrice?: number`
  - Used to calculate COGS and gross profit

---

## Current Profit Calculation Formulas

### 1. Cost of Goods Sold (COGS)
**Location:** `SalesContext.getTotalCOGS()`

```typescript
COGS = Σ (costPrice × quantity) for all sold items
```

**Code:**
```typescript
const getTotalCOGS = (businessId?: string, staffId?: string): number => {
  return filterSales(businessId, staffId).reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
    }, 0);
  }, 0);
};
```

### 2. Gross Profit
**Location:** `SalesContext.getTotalGrossProfit()`

```typescript
Gross Profit = Total Revenue - COGS
```

**Code:**
```typescript
const getTotalGrossProfit = (businessId?: string, staffId?: string): number => {
  const totalRevenue = getTotalRevenue(businessId, staffId);
  const totalCOGS = getTotalCOGS(businessId, staffId);
  return totalRevenue - totalCOGS;
};
```

### 3. Gross Profit Margin
**Location:** `SalesContext.getGrossProfitMargin()`

```typescript
Gross Profit Margin = (Gross Profit / Total Revenue) × 100
```

**Code:**
```typescript
const getGrossProfitMargin = (businessId?: string, staffId?: string): number => {
  const totalRevenue = getTotalRevenue(businessId, staffId);
  const totalGrossProfit = getTotalGrossProfit(businessId, staffId);
  return totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
};
```

### 4. Net Profit (NEEDS UPDATE)
**Current Locations:** 
- Dashboard (`/src/app/pages/Dashboard.tsx`)
- ReportsEnhanced (`/src/app/pages/ReportsEnhanced.tsx`)

**Current Formula (INCORRECT):**
```typescript
Net Profit = Total Revenue - Operating Expenses
```

**Correct Formula:**
```typescript
Net Profit = Total Revenue - COGS - Operating Expenses
           = Gross Profit - Operating Expenses
```

---

## Issues Identified

### Problem 1: Net Profit Calculation
**Current behavior:**
- Dashboard and ReportsEnhanced calculate Net Profit as `Revenue - Expenses`
- This ignores the cost of products sold (COGS)
- Results in inflated profit numbers

**Example:**
- Revenue: $1,000
- Product Purchase Price (COGS): $600
- Operating Expenses: $200

**Current Calculation:**
```
Net Profit = $1,000 - $200 = $800 ❌ WRONG
```

**Correct Calculation:**
```
Gross Profit = $1,000 - $600 = $400
Net Profit = $400 - $200 = $200 ✅ CORRECT
```

### Problem 2: Inconsistent Terminology
- "Gross Profit" is only shown in Reports.tsx
- Dashboard and ReportsEnhanced show "Net Profit" but calculate it incorrectly
- No clear distinction between the two concepts

---

## Solution: Updated Profit Calculations

### Dashboard Updates
**File:** `/src/app/pages/Dashboard.tsx`

**Changes:**
1. Add COGS calculation using `getTotalCOGS()`
2. Calculate Gross Profit
3. Update Net Profit to include COGS
4. Show both Gross Profit and Net Profit cards (for Business Owners/Managers)

**New Formula:**
```typescript
const todayCOGS = getTotalCOGS(businessId, staffId); // From SalesContext
const todayGrossProfit = todayRevenue - todayCOGS;
const todayNetProfit = todayGrossProfit - todayExpenses;
```

### ReportsEnhanced Updates
**File:** `/src/app/pages/ReportsEnhanced.tsx`

**Changes:**
1. Calculate COGS for all filtered sales
2. Add Gross Profit metric
3. Update Net Profit to include COGS
4. Update daily profit calculations
5. Update branch performance to include COGS

**New Formulas:**
```typescript
const totalCOGS = filteredSales.reduce((sum, sale) => {
  return sum + sale.items.reduce((itemSum, item) => {
    return itemSum + (item.costPrice ? item.costPrice * item.quantity : 0);
  }, 0);
}, 0);

const grossProfit = totalRevenue - totalCOGS;
const netProfit = grossProfit - totalExpenses;
```

---

## Where Purchase Price is Used

### 1. Inventory Management
- **Display:** Shows cost price in inventory table
- **Export:** Includes "Cost Price" column in CSV exports
- **Import:** Accepts "Cost Price" column in CSV imports

### 2. POS Terminal
- **Cart Items:** Tracks costPrice when adding products to cart
- **Sales Recording:** Saves costPrice with each sale item for future analysis

### 3. Reports (Standard)
- **COGS Display:** Shows total cost of goods sold
- **Gross Profit:** Calculated using COGS
- **Profit Margin:** Percentage based on gross profit

### 4. Reports (Enhanced) - TO BE UPDATED
- **Net Profit:** Will include COGS in calculation
- **Daily Trends:** Will show COGS, Gross Profit, and Net Profit
- **Branch Performance:** Will include COGS and accurate profit per branch

### 5. Dashboard - TO BE UPDATED
- **Today's Profit:** Will be updated to show accurate net profit
- **KPI Cards:** Will distinguish between Gross and Net Profit

---

## Complete Profit Hierarchy

```
Total Revenue ($1,000)
    ↓
- COGS ($600) ← Purchase prices of products sold
    ↓
= Gross Profit ($400) ← Profit from selling products
    ↓
- Operating Expenses ($200) ← Rent, salaries, utilities, etc.
    ↓
= Net Profit ($200) ← Actual business profit
```

---

## Implementation Checklist

- [x] ✅ Purchase price tracked in Inventory
- [x] ✅ Purchase price flows to POS Terminal
- [x] ✅ Purchase price saved in Sales records
- [x] ✅ COGS calculation in SalesContext
- [x] ✅ Gross Profit calculation in SalesContext
- [x] ✅ Reports.tsx shows Gross Profit correctly
- [x] ✅ Update Dashboard to calculate Net Profit correctly
- [x] ✅ Update ReportsEnhanced to calculate Net Profit correctly
- [x] ✅ Add Gross Profit display to Dashboard
- [x] ✅ Add COGS display to ReportsEnhanced

---

## Testing Purchase Price Calculations

### Test Case 1: Simple Sale
```
Product: Widget
Cost Price: $5
Selling Price (Retail): $10
Quantity Sold: 2

Revenue = $10 × 2 = $20
COGS = $5 × 2 = $10
Gross Profit = $20 - $10 = $10
Gross Margin = ($10 / $20) × 100 = 50%
```

### Test Case 2: Complete Profit Chain
```
Sale:
  Product A: Cost $5, Sold for $10, Qty 3
  Product B: Cost $8, Sold for $15, Qty 2

Revenue = ($10 × 3) + ($15 × 2) = $60
COGS = ($5 × 3) + ($8 × 2) = $31
Gross Profit = $60 - $31 = $29

Operating Expenses = $10 (rent, utilities, etc.)
Net Profit = $29 - $10 = $19
```

---

## Notes for Developers

1. **Optional Field:** `costPrice` is optional. If not set, it defaults to 0 in profit calculations.

2. **Backward Compatibility:** Existing sales without `costPrice` will still work; their COGS will be calculated as 0.

3. **Multi-tier Pricing:** The system supports:
   - `costPrice` (what you paid)
   - `retailPrice` (standard selling price)
   - `wholesalePrice` (bulk selling price)

4. **Branch Filtering:** All profit calculations respect branch-level filtering for multi-branch operations.

5. **Staff Performance:** COGS and profit metrics are available for staff performance tracking.

---

## Future Enhancements

1. **Supplier Integration:** Link costPrice to Supplier Invoices for automatic updates
2. **Inventory Valuation:** Calculate total inventory value using cost prices
3. **Profit Trends:** Show gross and net profit trends over time
4. **Product Profitability:** Analyze which products have the best margins
5. **Alert System:** Notify when selling below cost price