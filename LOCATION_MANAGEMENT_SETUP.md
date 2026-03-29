# 📍 Location Management Setup Guide

## Overview
The Location Management system allows you to manage multiple shops and warehouses across your business with multi-location inventory tracking.

---

## ⚠️ Current Status

Your Tillsup application is currently running with **demo location data** because the database tables haven't been created yet.

### How to Tell if Tables Don't Exist:
- Console shows: `Locations table not found - using demo data`
- You see demo locations (Westlands Shop, South B Shop, etc.)
- New locations don't persist after refresh

---

## 🚀 Quick Setup (2 Minutes)

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Migration
1. Open the file: `/supabase/migrations/create_locations_and_stock_transfers.sql`
2. Copy **all the contents** of that file
3. Paste into the SQL Editor
4. Click **Run** or press `Ctrl + Enter`

### Step 3: Verify Success
You should see:
```
Success. No rows returned
```

### Step 4: Refresh Your App
1. Refresh your browser
2. The demo data warning should disappear
3. Your app is now ready to use real location data!

---

## 📦 What Gets Created

### Tables:
1. **`locations`** - Stores all shops and warehouses
   - Supports multiple locations per business
   - Tracks stock value and product counts
   - Has a default location feature

2. **`stock_transfers`** - Movement of inventory between locations
   - Tracks status (pending, in_transit, completed, cancelled)
   - Records who initiated and completed transfers
   - Includes notes and estimated time

3. **`location_stock`** - Detailed inventory per location
   - Tracks quantity per product per location
   - Low stock threshold alerts
   - Last updated timestamps

### Security:
- ✅ Row Level Security (RLS) enabled
- ✅ Users can only see their own business locations
- ✅ Multi-tenant isolation
- ✅ Default locations cannot be deleted

### Performance:
- ✅ Optimized indexes for fast queries
- ✅ Automatic timestamp updates
- ✅ Foreign key constraints

---

## 🎯 Features After Setup

Once you run the migration, you'll be able to:

### Location Management
- ✅ Create unlimited shops and warehouses
- ✅ Set one location as default
- ✅ Track contact info for each location
- ✅ View stock value per location
- ✅ Monitor low stock items

### Stock Transfers
- ✅ Transfer inventory between locations
- ✅ Track transfer status
- ✅ View transfer history
- ✅ Add notes to transfers
- ✅ Estimate transfer time

### Inventory Tracking
- ✅ See stock levels per location
- ✅ Set low stock thresholds
- ✅ Global view across all locations
- ✅ Filter by specific location

---

## 🔧 Troubleshooting

### Error: "Could not find the table 'public.locations'"
**Solution:** You haven't run the migration yet. Follow Step 1-3 above.

### Error: "relation 'locations' already exists"
**Solution:** The tables are already created! Just refresh your app.

### Locations don't save
**Possible causes:**
1. Migration wasn't run → Run the SQL migration
2. RLS policy issue → Check if `get_user_business_id()` function exists
3. Business ID missing → Make sure you're logged in

### Can't see locations from Supabase table
**Solution:** 
1. Go to Supabase Dashboard → Table Editor → locations
2. Check the `business_id` column matches your business
3. Verify RLS is enabled but you can still see rows

---

## 📊 Database Schema

### Locations Table
```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY,
    business_id TEXT REFERENCES businesses(id),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('shop', 'warehouse')),
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    total_products INTEGER DEFAULT 0,
    total_stock_value DECIMAL(10,2) DEFAULT 0,
    low_stock_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Stock Transfers Table
```sql
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY,
    business_id TEXT REFERENCES businesses(id),
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    product_id UUID,
    product_name TEXT,
    quantity INTEGER CHECK (quantity > 0),
    status TEXT CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
    notes TEXT,
    estimated_time TEXT,
    initiated_by UUID REFERENCES auth.users(id),
    initiated_by_name TEXT,
    completed_by UUID,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ Verification Checklist

After running the migration, verify everything works:

- [ ] No console errors about missing tables
- [ ] Can create new locations
- [ ] Locations persist after refresh
- [ ] Can edit existing locations
- [ ] Can delete non-default locations
- [ ] Cannot delete default location
- [ ] Location count updates correctly
- [ ] Stock value calculations work

---

## 🆘 Need Help?

If you're still having issues:

1. **Check Console:** Open browser DevTools (F12) and look for specific error messages
2. **Check Supabase Logs:** Dashboard → Logs → Check for policy errors
3. **Verify Business ID:** Make sure `business_id` in profiles table is set correctly
4. **Check RLS Policies:** SQL Editor → Run: `SELECT * FROM pg_policies WHERE tablename = 'locations'`

---

## 🎉 You're All Set!

Once the migration is complete, your Location Management system is fully operational. You can now:

1. Create shops and warehouses
2. Transfer stock between locations
3. Track inventory per location
4. Monitor stock levels across your business

**Next Steps:**
- Add your first real location
- Set up stock transfers
- Configure low stock thresholds
- Start tracking multi-location inventory

---

**Migration File Location:** `/supabase/migrations/create_locations_and_stock_transfers.sql`

**Created:** March 12, 2026  
**Version:** 1.0  
**Status:** Ready to Deploy 🚀
