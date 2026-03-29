# 📍 Location-Based Inventory - User Guide

## What's New?

Your Tillsup inventory system now supports **location-specific stock tracking**! You can assign products to specific shops or warehouses and manage stock across multiple locations.

---

## 🎯 Key Features

### 1. Location Selection When Adding Products

When adding a new product, you'll now see:

```
┌────────────────────────────────────────────┐
│ Initial Location *                         │
│ (Shop or Warehouse)                        │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Select location for initial stock   ▼  │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Options:                                   │
│ 🏪 Westlands Shop          [Shop]         │
│ 🏪 South B Shop            [Shop]         │
│ 🏪 Eastleigh Shop          [Shop]         │
│ 📦 Main Warehouse          [Warehouse]    │
│ 📦 Secondary Warehouse     [Warehouse]    │
└────────────────────────────────────────────┘

💡 Choose where this product will be initially stocked
```

**Benefits:**
- ✅ Clear distinction between shops and warehouses
- ✅ Visual icons help identify location type
- ✅ Required field - ensures every product has a location
- ✅ Auto-selects first active location

---

### 2. Enhanced Inventory Table

The inventory table now shows location information:

```
┌────────────────────┬──────────┬────────┬────────────────────────┐
│ Product            │ Stock    │ Locations                      │
├────────────────────┼──────────┼────────────────────────────────┤
│ Chocolate Cake     │ 150      │ 🏪 Westlands Shop  [Primary]  │
│ SKU: CHO-001       │          │ Stock at 1 location            │
├────────────────────┼──────────┼────────────────────────────────┤
│ Coffee Beans 1kg   │ 200      │ 📦 Main Warehouse  [Primary]  │
│ SKU: COF-002       │          │ Stock at 1 location            │
└────────────────────┴──────────┴────────────────────────────────┘
```

**What You See:**
- 🏪 Shop icon (cyan) for retail locations
- 📦 Warehouse icon (purple) for storage facilities
- "Primary" badge shows main stock location
- Quick glance at how many locations stock the item

---

### 3. Manage Stock Locations Dialog

Click the **📍 MapPin icon** in the actions column to open the location manager:

```
┌─────────────────────────────────────────────────────────┐
│ 📍 Manage Stock Locations                               │
│ Manage stock for Chocolate Cake across locations        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ Stock Summary ─────────────────────────────────────┐ │
│ │                                                      │ │
│ │  150         Total units across all locations       │ │
│ │              SKU: CHO-001                            │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                         │
│ Stock at Each Location                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Location          │ Type      │ Stock │ Actions     │ │
│ ├──────────────────┼───────────┼───────┼─────────────┤ │
│ │ 🏪 Westlands     │ [Shop]    │  150  │ Edit Stock  │ │
│ │    Shop          │           │ [Pri] │             │ │
│ ├──────────────────┼───────────┼───────┼─────────────┤ │
│ │ 🏪 South B Shop  │ [Shop]    │   0   │ + Add Stock │ │
│ ├──────────────────┼───────────┼───────┼─────────────┤ │
│ │ 📦 Main          │ [Wareh.]  │   0   │ + Add Stock │ │
│ │    Warehouse     │           │       │             │ │
│ └──────────────────┴───────────┴───────┴─────────────┘ │
│                                                         │
│ ℹ️ Multi-Location Feature                              │
│ To enable full multi-location stock tracking, run      │
│ the SQL migration in your Supabase dashboard.          │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- See total stock across all locations
- View stock quantity at each location
- Identify primary stock location
- Quick access to edit stock
- Preview of multi-location capabilities

---

## 🔄 Workflows

### Adding a New Product

1. Click **"Add Product"** button
2. Fill in product details (name, category, price, etc.)
3. **Select Initial Location** - Choose shop or warehouse
4. Enter stock quantity for that location
5. Click **"Add Product"**

✅ Product is now in inventory at the selected location!

---

### Viewing Product Locations

1. Go to **Inventory** page
2. Look at the **"Locations"** column
3. See which location stocks the product
4. Note the "Stock at X locations" count

---

### Managing Stock at Multiple Locations

1. Find the product in inventory
2. Click the **📍 MapPin icon** in the actions column
3. View the **Manage Stock Locations** dialog
4. See stock summary and distribution
5. Click **"Edit Stock"** to adjust quantity at primary location
6. *(Coming Soon)* Click **"Add Stock"** to distribute to other locations

---

## 🎨 Visual Legend

### Icons

| Icon | Meaning |
|------|---------|
| 🏪 `Building2` | Shop / Retail Location |
| 📦 `Package` | Warehouse / Storage Facility |
| 📍 `MapPin` | Manage Stock Locations |
| ✏️ `Edit` | Edit Product Details |
| 🗑️ `Trash2` | Delete Product |

### Badges

| Badge | Meaning |
|-------|---------|
| `[Primary]` | Main stock location for product |
| `[Shop]` | Retail/customer-facing location |
| `[Warehouse]` | Storage/distribution location |

### Colors

| Color | Usage |
|-------|-------|
| **#0891b2** (Tillsup Blue) | Shops, primary actions |
| **Purple** | Warehouses |
| **Green** | In stock, success states |
| **Yellow** | Low stock warnings |
| **Red** | Out of stock, destructive actions |

---

## 💡 Tips & Best Practices

### 1. Organizing Inventory

**Shops:**
- Use for retail locations with customer traffic
- Stock customer-facing products
- Typically lower quantities, faster turnover

**Warehouses:**
- Use for bulk storage
- Stock high-volume items
- Central distribution point

### 2. Stock Management

✅ **DO:**
- Assign products to the location where they'll be sold/used
- Use warehouses for bulk storage
- Regularly review stock at each location
- Transfer stock between locations as needed

❌ **DON'T:**
- Leave products without a location
- Mix customer-facing and storage locations
- Forget to update stock after transfers

### 3. Multi-Location Strategy

For businesses with multiple shops:
1. Stock fast-moving items at all shop locations
2. Keep slow-moving items in warehouse
3. Transfer stock as needed based on demand
4. Use the manage locations dialog to track distribution

---

## 🚀 Coming Soon

After running the SQL migration:

### ✨ Full Multi-Location Features

1. **Stock Distribution**
   - Add stock to multiple locations at once
   - See all locations in inventory table
   - Color-coded stock levels per location

2. **One-Click Transfers**
   - Transfer stock from manage locations dialog
   - Automatic stock updates
   - Transfer history tracking

3. **Advanced Reporting**
   - Stock valuation per location
   - Sales performance by location
   - Location-specific low stock alerts

4. **Bulk Operations**
   - Distribute stock across locations automatically
   - Rebalancing suggestions
   - Location-based reorder points

---

## 🆘 Troubleshooting

### "Location selection is required"
**Solution:** You must select a location (shop or warehouse) when adding a product. This ensures proper inventory tracking.

### "No locations available"
**Solution:** Create locations first via the Locations Management page before adding products.

### "Add Stock" button shows "Coming Soon"
**Info:** This is expected! Full multi-location distribution requires running the SQL migration first. Contact your system administrator.

### Can't see multiple locations for a product
**Info:** Currently, products are assigned to one primary location. After the migration, you'll be able to distribute stock across multiple locations.

---

## 📞 Support

For questions about location-based inventory:
1. Check this guide
2. Review the implementation summary at `/IMPLEMENTATION_SUMMARY.md`
3. Contact your Tillsup administrator

---

**Last Updated:** March 12, 2026  
**Feature Status:** ✅ Active (Phase 1)  
**Migration Status:** 📋 Pending
