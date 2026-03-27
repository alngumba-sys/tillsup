# Warehouse-First Inventory Management System

## Overview

Tillsup now enforces a **warehouse-first inventory model** where all products must originate in a warehouse before being distributed to shops. This ensures proper inventory control, tracking, and prevents stock discrepancies.

---

## Key Principles

### 1. **Warehouse as Primary Stock Entry Point**
- ✅ All new products MUST be added to a warehouse first
- ❌ Direct product creation in shops is disabled
- 🔄 Stock can only enter shops through warehouse transfers

### 2. **Bidirectional Stock Transfers**
- **Warehouse → Shop**: Move inventory from warehouse to retail locations
- **Shop → Warehouse**: Return excess or unsold inventory back to warehouse
- Every transfer shows confirmation dialog with exact stock impact

### 3. **Mandatory Source Selection**
- When adding inventory to a shop, you **must** select a source warehouse
- Stock is automatically reduced in the source warehouse
- Stock is automatically increased in the destination shop

### 4. **Clear Confirmation Dialogs**
- Before every transfer, you see:
  - Source location and current stock
  - Destination location and current stock
  - Exact quantity being transferred
  - Stock levels **after** the transfer
  - Warnings for low stock or insufficient inventory

---

## How It Works

### Adding New Products

#### Step 1: Create Product in Warehouse
1. Go to **Inventory** page
2. Click **"Add Product to Warehouse"** button
3. Fill in product details:
   - Product name, SKU, barcode
   - Pricing (cost, retail, wholesale)
   - Initial stock quantity
   - Category, supplier, etc.
4. **Select a warehouse** from the location dropdown
   - ⚠️ Only warehouses are shown in this dropdown
   - You cannot select a shop when adding a new product
5. Click **Save**
6. Product is now in your warehouse inventory! 🎉

#### Step 2: Transfer Stock to Shops
1. Navigate to **Inventory** page
2. Filter by the shop you want to add inventory to
3. Find the product in the list
4. Click **"Add from Warehouse"** button (on each product row)
5. **Select source warehouse** from dropdown
   - Shows available stock in each warehouse
6. Enter **quantity to transfer**
7. Add optional notes
8. Click **Continue**
9. **Review confirmation dialog**:
   ```
   Warehouse A Stock:    100 units → 50 units (-50)
   Shop 1 Stock:         20 units  → 70 units (+50)
   ```
10. Click **Confirm Transfer**
11. Stock is automatically moved! ✅

---

## User Interface Changes

### Inventory Page

#### When Viewing "All Locations" or a Warehouse:
```
┌─────────────────────────────────────────┐
│  [+ Add Product to Warehouse]           │
└─────────────────────────────────────────┘
```
- Button labeled: **"Add Product to Warehouse"**
- Opens dialog with warehouse-only location selection

#### When Viewing a Shop:
```
┌─────────────────────────────────────────┐
│  Product List                            │
│  ┌───────────────────────────────────┐  │
│  │ Product Name                       │  │
│  │ SKU: ABC123                        │  │
│  │ Stock: 20 units                    │  │
│  │ [Add from Warehouse]               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```
- Each product has **"Add from Warehouse"** button
- No "Add Product" button when viewing shops
- Clear indication that inventory comes from warehouses

### Add Product Dialog

```
╔═══════════════════════════════════════════╗
║  Add New Product to Warehouse             ║
╠═══════════════════════════════════════════╣
║                                           ║
║  ⚠️ Warehouse-First Inventory Model      ║
║  All products must originate in a         ║
║  warehouse first.                         ║
║                                           ║
║  Step 1: Add to warehouse                 ║
║  Step 2: Transfer to shops as needed      ║
║                                           ║
║  ─────────────────────────────────────    ║
║                                           ║
║  Location: [Select Warehouse ▼]          ║
║            ⚠️ Only warehouses shown       ║
║                                           ║
║  Product Name: _____________________      ║
║  SKU:          _____________________      ║
║  Stock:        _____________________      ║
║  Price:        _____________________      ║
║                                           ║
║  [Cancel]  [Save Product]                 ║
╚═══════════════════════════════════════════╝
```

### Stock Transfer Confirmation

```
╔═══════════════════════════════════════════╗
║  ✓ Confirm Stock Transfer                 ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Product: Coca-Cola 500ml                 ║
║  Quantity: 50 units                       ║
║                                           ║
║  ┌─────────────────┐   →   ┌───────────┐ ║
║  │ Main Warehouse  │  →→→  │ Shop 1    │ ║
║  │                 │       │           │ ║
║  │ Current: 100    │       │ Current: 20│ ║
║  │ After:   50 ⚠️  │       │ After:  70 │ ║
║  └─────────────────┘       └───────────┘ ║
║                                           ║
║  ⚠️ This will reduce Main Warehouse       ║
║     stock to 50 units (Low Stock)         ║
║                                           ║
║  [Cancel]  [Confirm Transfer]             ║
╚═══════════════════════════════════════════╝
```

---

## Stock Transfer Scenarios

### Scenario 1: Warehouse to Shop (Standard Flow)
```
Initial State:
  Warehouse A: 200 units
  Shop 1:       30 units

Action: Transfer 100 units from Warehouse A to Shop 1

Confirmation Shows:
  Warehouse A: 200 → 100 units (-100)
  Shop 1:       30 → 130 units (+100)

Final State:
  Warehouse A: 100 units
  Shop 1:      130 units
```

### Scenario 2: Shop to Warehouse (Return Stock)
```
Initial State:
  Shop 2:       150 units (overstocked)
  Warehouse B:   50 units

Action: Return 80 units from Shop 2 to Warehouse B

Confirmation Shows:
  Shop 2:       150 → 70 units (-80)
  Warehouse B:   50 → 130 units (+80)

Final State:
  Shop 2:       70 units
  Warehouse B: 130 units
```

### Scenario 3: Insufficient Stock Warning
```
Initial State:
  Warehouse C: 25 units
  Shop 3:      10 units

Action: Attempt to transfer 50 units from Warehouse C to Shop 3

⛔ Error:
  ┌───────────────────────────────────────┐
  │ ⚠️ Insufficient Stock                 │
  │                                       │
  │ Warehouse C only has 25 units         │
  │ available, but you're trying to       │
  │ transfer 50 units.                    │
  │                                       │
  │ This will result in negative stock.   │
  │                                       │
  │ [Confirm Transfer] (DISABLED)         │
  └───────────────────────────────────────┘

Result: Transfer blocked, cannot proceed
```

---

## Technical Implementation

### Components Created

1. **`StockTransferConfirmation.tsx`**
   - Confirmation dialog for all stock transfers
   - Shows before/after stock levels
   - Validates sufficient stock
   - Displays warnings for low stock

2. **`AddProductToShopDialog.tsx`**
   - Dialog for adding products to shops from warehouses
   - Enforces warehouse source selection
   - Prevents transfers if insufficient stock
   - Shows stock availability in real-time

3. **`WarehouseOnlyAlert.tsx`**
   - Educational alert explaining warehouse-first model
   - Shows in product creation dialogs
   - Guides users through proper workflow

### Code Changes

#### `Inventory.tsx`
- Modified `ProductForm` to filter only warehouses when adding new products
- Added warehouse-only validation in `handleAddProduct()`
- Changed button text from "Add Product" to "Add Product to Warehouse"
- Updated dialog description to explain warehouse-first model
- Default location selection now only picks warehouses

#### `LocationContext.tsx`
- `transferStock()` function handles bidirectional transfers
- Validates stock availability before transfer
- Updates stock levels atomically
- Creates transfer history records

---

## Database Structure

### Stock Transfers Table
```sql
CREATE TABLE stock_transfers (
  id UUID PRIMARY KEY,
  business_id TEXT NOT NULL,
  from_location_id TEXT NOT NULL,
  to_location_id TEXT NOT NULL,
  product_id UUID NOT NULL,
  product_name TEXT,
  quantity INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  notes TEXT,
  initiated_by TEXT,
  initiated_by_name TEXT,
  completed_by TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Location Stock Table
```sql
CREATE TABLE location_stock (
  location_id TEXT NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  last_updated TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (location_id, product_id)
);
```

---

## Benefits

### 1. **Inventory Accuracy**
- Single source of truth (warehouse)
- No orphaned stock in shops
- Clear audit trail of all movements

### 2. **Better Stock Control**
- Prevent over-ordering by shops
- Centralized replenishment planning
- Easier to manage safety stock levels

### 3. **Improved Reporting**
- Track stock movement patterns
- Identify slow-moving products
- Optimize warehouse-to-shop distribution

### 4. **User Safety**
- Confirmation dialogs prevent mistakes
- Clear warnings for low stock
- Impossible to create negative stock

### 5. **Scalability**
- Supports multiple warehouses
- Easy to add new shops
- Handles complex supply chains

---

## FAQ

**Q: What if I don't have a warehouse?**
A: You need to create at least one warehouse in **Location Management** before you can add products. A warehouse can be a physical storage facility, your back room, or even a virtual "Central Inventory" location.

**Q: Can I add products directly to a shop?**
A: No. The system enforces warehouse-first. This is intentional to maintain inventory integrity.

**Q: What happens if I try to transfer more stock than available?**
A: The system will show an error and disable the "Confirm Transfer" button. You cannot proceed with insufficient stock.

**Q: Can I transfer stock from Shop A to Shop B directly?**
A: Yes! While the primary flow is warehouse → shop, you can also transfer between shops. The same confirmation process applies.

**Q: How do I view transfer history?**
A: Go to **Stock Transfers** page to see all historical transfers with full details.

---

## Future Enhancements

- [ ] Batch transfers (multiple products at once)
- [ ] Scheduled/recurring transfers
- [ ] Transfer approval workflow for managers
- [ ] Automated reorder points
- [ ] Barcode scanning for transfers
- [ ] Mobile app for warehouse staff

---

## Support

For issues or questions about the warehouse-first inventory system:
1. Check this documentation
2. Contact your system administrator
3. File a support ticket with detailed description

---

**Last Updated:** March 13, 2026  
**System Version:** Tillsup 2.0 - Warehouse-First Edition
