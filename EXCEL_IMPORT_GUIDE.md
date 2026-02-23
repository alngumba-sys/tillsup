# Excel Import Feature Guide

## Overview
Tillsup now supports bulk importing of Staff and Inventory data via Excel files, similar to the existing Branches import functionality.

## Features Added

### 1. Staff Import
**Location:** Staff Management Tab

**Template Columns:**
- **Required:**
  - First Name
  - Last Name
  - Email

- **Optional:**
  - Role (Cashier, Manager, Business Owner)
  - Branch (Branch name)
  - Salary Type (monthly, hourly, daily, weekly)
  - Base Salary (numeric value)

**Business Rules:**
- Staff with existing emails will be skipped
- Invalid roles default to "Cashier"
- Branch names must match existing active branches
- If no branch specified, uses default branch
- Salary information is optional

**Template Example:**
```
First Name | Last Name | Email               | Role    | Branch       | Salary Type | Base Salary
John       | Doe       | john@example.com    | Cashier | Main Branch  | monthly     | 50000
Jane       | Smith     | jane@example.com    | Manager | Downtown     | hourly      | 500
```

### 2. Inventory Import
**Location:** Inventory Management Page

**Template Columns:**
- **Required:**
  - Product Name

- **Optional:**
  - Category
  - SKU
  - Stock Quantity
  - Cost Price
  - Retail Price
  - Wholesale Price
  - Supplier
  - Branch
  - Low Stock Threshold

**Business Rules:**
- Products with duplicate SKUs in the same branch will be skipped
- Category and Supplier names must match existing records (case-insensitive)
- If no branch specified, uses default branch
- Auto-generates SKU if not provided
- Retail Price takes priority over Cost Price for product price

**Template Example:**
```
Product Name    | Category    | SKU      | Stock | Cost | Retail | Wholesale | Supplier    | Branch       | Low Stock
Sample Product  | Electronics | PROD-001 | 100   | 50   | 75     | 65        | Supplier Co | Main Branch  | 10
Sample Widget   | Groceries   | PROD-002 | 50    | 20   | 30     | 25        | Fresh Foods | Downtown     | 5
```

## How to Use

### Step 1: Download Template
1. Click "Import Excel" button
2. Click "Download Template" to get the Excel template
3. Open the template in Excel or Google Sheets

### Step 2: Fill in Your Data
1. Keep the header row intact (do not modify column names)
2. Fill in your data starting from row 2
3. Follow the column requirements (required vs optional)
4. Use exact names for references (Category, Branch, Supplier)

### Step 3: Upload and Import
1. Save your Excel file (.xlsx format)
2. Click "Import Excel" button
3. Click "Choose file" and select your Excel file
4. Click "Import Staff" or "Import Products"
5. Review the validation results

## Validation Results

The system provides detailed feedback:

### ✅ Success (Green)
- Lists all successfully imported records
- Shows row number and item name

### ⚠️ Warnings (Yellow)
- Items that were skipped (e.g., duplicates)
- Missing optional fields with defaults applied
- Non-existent references (will use defaults)

### ❌ Errors (Red)
- Missing required fields
- Invalid data formats
- Failed database operations
- Items that could not be processed

## Tips for Successful Import

### 1. Data Preparation
- Clean your data before import
- Remove any empty rows
- Ensure email addresses are valid
- Use consistent naming for categories/branches/suppliers

### 2. Name Matching
- Category, Branch, and Supplier names are case-insensitive
- They must exactly match existing records
- Create missing categories/branches/suppliers before importing

### 3. Error Handling
- Review warnings and errors carefully
- Fix issues in your Excel file
- Re-import the corrected file

### 4. Best Practices
- Start with a small test import (5-10 rows)
- Verify results before importing large datasets
- Keep a backup of your Excel file
- Use the template to ensure correct format

## Common Issues and Solutions

### Issue: "Could not find header row"
**Solution:** Ensure the first row contains the exact column names from the template

### Issue: "Branch not found"
**Solution:** Create the branch first, or use an existing branch name

### Issue: "Category not found" (Inventory)
**Solution:** Create the category first in the Categories tab

### Issue: "Supplier not found" (Inventory)
**Solution:** Add the supplier to your suppliers list first

### Issue: "Staff with email already exists"
**Solution:** This is expected - the system skips duplicates. Either:
- Remove the duplicate from your Excel file
- Update the email address
- Edit the existing staff member manually

### Issue: "Product with SKU already exists"
**Solution:** Either:
- Use a different SKU
- Remove the SKU column (system will auto-generate)
- Update the existing product manually

## Technical Details

### File Format
- Supported: `.xlsx`, `.xls`
- Maximum file size: Depends on browser/server limits
- Recommended: Keep imports under 1000 rows for best performance

### Processing
- Imports are processed row-by-row
- If an error occurs on one row, other rows still process
- The import shows a summary of all results

### Database Impact
- Each row creates one database record
- Failed imports do not affect existing data
- No partial records are created (all-or-nothing per row)

## Feature Locations

1. **Staff Import:**
   - Navigate to: Staff → Staff Management tab
   - Click: "Import Excel" button (next to "Add Staff Member")

2. **Inventory Import:**
   - Navigate to: Inventory page
   - Click: "Import Excel" button (next to "Add Product")

3. **Branches Import** (existing feature):
   - Navigate to: Staff → Branch Management tab  
   - Click: "Import Excel" button

## Security Notes

- Only business owners can import data
- Staff members cannot import their own colleagues
- Branch managers can only import to their assigned branch
- All imports are logged with timestamp and user info

## Future Enhancements

Potential improvements for future versions:
- Support for updating existing records
- CSV file format support
- Import history/audit log
- Batch delete/update via Excel
- Image upload via URLs
- Custom field mapping
- Import scheduling

---

For support or questions about the Excel import feature, please contact your system administrator.
