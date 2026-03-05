# Tillsup Database Setup Instructions

## ⚠️ CRITICAL: Database Not Configured

Your Tillsup application is not working because the Supabase database tables are not set up. This is a **one-time setup** that takes less than 2 minutes.

## 🚀 Quick Fix (2 Minutes)

### Step 1: Open Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar (or click the **SQL** icon)

### Step 2: Run the Setup SQL

1. Copy the **entire contents** of the file `/SUPABASE_COMPLETE_SETUP.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Step 3: Verify Success

You should see a success message like:
```
Success. No rows returned
```

This means all tables were created successfully!

### Step 4: Test Your Application

1. Refresh your Tillsup application
2. Try creating:
   - ✅ A new product (Inventory page)
   - ✅ A new supplier (Suppliers page)
   - ✅ A new staff member (Staff page)
   - ✅ Upload a product image

Everything should now work! 🎉

---

## 📋 What Gets Created

The setup script creates:

### Tables
- ✅ **profiles** - User accounts and staff members
- ✅ **suppliers** - Supplier information
- ✅ **inventory** - Product catalog with multi-tier pricing
- ✅ **staff_invites** - Pending staff invitations

### Security
- ✅ Row Level Security (RLS) policies for all tables
- ✅ Proper authentication and authorization
- ✅ Role-based access control (Business Owners and Managers can create staff)

### Storage
- ✅ **Inventoryimages** bucket for product images
- ✅ Public access for image viewing

### Performance
- ✅ Database indexes for fast queries
- ✅ Auto-update timestamps

---

## 🔍 Troubleshooting

### Error: "relation already exists"
This is **not an error** - it means the table was already created. The script uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times.

### Products/Suppliers/Staff Still Not Creating
1. **Check browser console** (F12 > Console tab) for detailed error messages
2. Make sure you're **logged in** to the application
3. Verify the SQL ran successfully (no red error messages in Supabase SQL Editor)
4. Try **logging out and back in** to refresh your session

### Images Not Uploading
If product images still don't upload:
1. Go to **Supabase Dashboard > Storage**
2. Verify the **Inventoryimages** bucket exists
3. Check it's set to **Public bucket**
4. See `/SUPABASE_STORAGE_SETUP.md` for detailed storage troubleshooting

### "Permission Denied" Errors
This means RLS policies aren't set up:
1. Make sure you ran the **entire SQL script**, not just parts of it
2. The policies should show "Allow authenticated users full access" for each table
3. Check in **Supabase Dashboard > Authentication > Policies**

---

## 📖 Additional Documentation

- **`/SUPABASE_COMPLETE_SETUP.sql`** - The complete setup SQL script
- **`/SUPABASE_DATABASE_SETUP.md`** - Detailed database documentation
- **`/SUPABASE_STORAGE_SETUP.md`** - Image upload troubleshooting

---

## 🆘 Still Having Issues?

1. **Clear browser cache** and reload
2. **Check Supabase project status** - make sure it's not paused (free tier)
3. **Verify your Supabase credentials** in your environment configuration
4. **Check browser console** for detailed error messages
5. **Review Supabase Logs**: Dashboard > Logs > Postgres Logs

---

## ✅ Success Checklist

After running the setup, you should be able to:

- [ ] Create new products in Inventory
- [ ] Upload product images
- [ ] Create new suppliers
- [ ] Create new staff members
- [ ] See data persist after page refresh
- [ ] No console errors when performing these actions

If all checkboxes are checked, congratulations! Your Tillsup database is fully configured. 🎉

---

## 🔐 Security Note

The RLS policies implement role-based access control:

**Profiles Table:**
- ✅ Users can view all profiles in their business
- ✅ Users can update their own profile
- ✅ Business Owners and Managers can create new staff profiles
- ✅ Business Owners can delete staff (except themselves)

**Other Tables (Suppliers, Inventory, Staff Invites):**
- ✅ All authenticated users have full access to their business data

For production use, you may want to implement more granular policies based on:
- Branch-level isolation (staff can only see their branch data)
- Read-only access for certain roles (Cashiers can view but not edit suppliers)
- Department-specific permissions

For now, this setup provides secure, role-based access that's perfect for getting started!