# Debugging Inventory Edit & Upload Issues

## Overview
A comprehensive debug panel has been added to the Product Form to help diagnose image upload and save issues.

## How to Use the Debug Panel

### 1. **Access the Debug Panel**
   - Open any product for editing (or create a new one)
   - Scroll to the bottom of the form
   - Click **"Show Debug Info"** button
   - A diagnostic panel will expand showing all form state

### 2. **What the Debug Panel Shows**

#### Real-time State Information:
- ✅ **Mode**: Whether you're in "Add" or "Edit" mode
- ✅ **Product Name**: Current value in the name field
- ✅ **Category**: Selected category ID
- ✅ **Price**: Current price value
- ✅ **Stock**: Current stock quantity
- ✅ **Branch ID**: Selected branch
- ✅ **SKU**: Product SKU/barcode
- ✅ **Supplier**: Selected supplier
- ✅ **Image URL**: Shows if image is uploaded with:
  - ✅ Green badge if image exists
  - ⚠️ Yellow badge if no image
  - 🖼️ Thumbnail preview of the image
  - Full URL for verification
- ✅ **Upload Status**: Shows if upload is in progress

#### Additional Features:
- 📝 **Full Console Log Button**: Click to dump complete form state to browser console
- 💡 **Debug Tips**: Quick reference for troubleshooting

### 3. **Debugging Image Upload Issues**

#### Step-by-Step Process:
1. **Open Browser Console** (Press F12)
2. **Click "Show Debug Info"** in the form
3. **Upload an Image**:
   - Watch for console messages:
     ```
     Uploading file to Inventoryimages bucket: [filename]
     Upload successful: [data]
     Public URL: [url]
     ```
4. **Check Debug Panel**: The "Image URL" field should update immediately with the uploaded image
5. **Look for Preview**: A thumbnail should appear below the URL

#### Common Issues & Solutions:

**Issue 1: "Uploading image..." stuck forever**
- **Cause**: Storage bucket doesn't exist or RLS policies not configured
- **Solution**: Run `/supabase_storage_policy.sql` in Supabase SQL Editor
- **Console Error**: Look for "Bucket not found" or "row-level security"

**Issue 2: Upload completes but no image in debug panel**
- **Cause**: `formData.image` not updating
- **Solution**: Click "Log Full State to Console" and check if `image` field is populated
- **Fix**: Check `onFormChange` is being called correctly

**Issue 3: Image shows in debug panel but doesn't save**
- **Cause**: Save function not passing image to database
- **Solution**: See "Debugging Save Issues" below

### 4. **Debugging Save Issues**

#### Step-by-Step Process:
1. **Make changes** to the product
2. **Open Browser Console** (F12)
3. **Click "Save Changes"**
4. **Watch for console messages**:
   ```
   handleEditProduct called {editingItem: ..., formData: ...}
   Updating product with: {...}
   ```
5. **Check for errors**: Any validation or database errors will show in console

#### What Gets Logged:
- ✅ Current `editingItem` (the product being edited)
- ✅ Current `formData` (all form values including image)
- ✅ Final `updates` object being sent to database
- ❌ Any validation errors
- ❌ Any database errors

#### Common Issues & Solutions:

**Issue 1: Nothing happens when clicking "Save Changes"**
- **Check**: Console for validation errors
- **Look for**: "Product name is required", "Valid price is required", etc.
- **Debug Panel**: Verify all required fields are filled

**Issue 2: "Save Changes" runs but data not in database**
- **Check**: Console for database errors
- **Look for**: "Error updating product:" messages
- **Verify**: The `updates` object logged contains your image URL

**Issue 3: Everything saves except the image**
- **Check**: Debug panel to confirm `formData.image` has a value
- **Check**: Console log of `updates` object - does it include `image`?
- **Verify**: Database column `image` exists in `inventory` table

### 5. **Edit Dialog Footer Info**

The Edit Dialog now shows:
- **Product being edited**: Name and ID snippet
- **Helps confirm**: You're editing the correct product

### 6. **Step-by-Step Troubleshooting Workflow**

#### For Image Upload Issues:
```
1. Open product for editing
2. Click "Show Debug Info"
3. Open browser console (F12)
4. Click file input and select image
5. Watch console for upload messages
6. Check debug panel - does Image URL appear?
7. If yes: Image upload works ✅
8. If no: Check console for error messages ❌
```

#### For Save Issues:
```
1. Upload image (verify it shows in debug panel)
2. Click "Log Full State to Console"
3. Verify formData.image exists in console
4. Click "Save Changes"
5. Watch console for "handleEditProduct called"
6. Watch console for "Updating product with:"
7. Verify the updates object includes image
8. Check for success toast or error messages
```

### 7. **Console Commands for Advanced Debugging**

You can also manually inspect state in the browser console:

```javascript
// Check if Supabase is connected
console.log(supabase);

// Test storage bucket access
await supabase.storage.from('Inventoryimages').list();

// Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Test image upload manually
const testFile = new File(['test'], 'test.png', { type: 'image/png' });
const { data, error } = await supabase.storage
  .from('Inventoryimages')
  .upload('test-' + Date.now() + '.png', testFile);
console.log('Upload result:', { data, error });
```

### 8. **Expected Behavior**

#### Successful Image Upload:
1. File input is clicked
2. Image is selected
3. "Uploading image..." appears briefly
4. Console shows: "Uploading file to Inventoryimages bucket: [filename]"
5. Console shows: "Upload successful: [data]"
6. Console shows: "Public URL: [url]"
7. Toast notification: "Image uploaded successfully"
8. Debug panel shows green "Uploaded" badge
9. Image URL appears in debug panel
10. Thumbnail preview appears

#### Successful Save:
1. "Save Changes" is clicked
2. Console shows: "handleEditProduct called {...}"
3. Console shows: "Updating product with: {...}"
4. Toast notification: "Product updated successfully!"
5. Dialog closes
6. Product table refreshes with new data

## Error Messages Reference

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Upload Permission Error" | RLS policies not set | Run `supabase_storage_policy.sql` |
| "Storage Not Configured" | Bucket doesn't exist | Create 'Inventoryimages' bucket in Supabase |
| "File too large" | Image > 2MB | Compress image or use smaller file |
| "Invalid file type" | Not an image file | Upload PNG, JPG, or other image formats |
| "Product name is required" | Name field empty | Fill in product name |
| "Valid price is required" | Price invalid or empty | Enter valid price > 0 |
| "Branch selection is required" | No branch selected | Select a branch |
| "Category is required" | No category selected | Select a category |

## Quick Checklist

Before reporting an issue, verify:

- [ ] Browser console is open (F12)
- [ ] Debug panel is visible
- [ ] Supabase connection is active
- [ ] User is authenticated
- [ ] Storage bucket 'Inventoryimages' exists
- [ ] RLS policies are configured
- [ ] Image file is < 2MB
- [ ] Image file is valid format (PNG, JPG, etc.)
- [ ] All required form fields are filled
- [ ] formData.image shows in debug panel after upload
- [ ] Console shows no errors during upload
- [ ] Console shows no errors during save

## Support

If issues persist after using the debug panel:

1. **Copy all console output** (right-click in console → Save as...)
2. **Take screenshot** of debug panel showing the issue
3. **Note the exact steps** that reproduce the problem
4. **Include error messages** from console
5. **Check Supabase logs** in Supabase Dashboard → Logs

## Database Schema Verification

Make sure your `inventory` table has the `image` column:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory' 
  AND column_name = 'image';

-- If missing, add it:
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image TEXT;
```

## Storage Bucket Verification

Check if bucket exists:

```sql
-- In Supabase Dashboard → Storage → Check for 'Inventoryimages' bucket

-- Or via SQL:
SELECT * FROM storage.buckets WHERE id = 'Inventoryimages';
```

## Success Indicators

✅ **Image Upload Working:**
- Upload completes in < 2 seconds
- Green "Uploaded" badge in debug panel
- Image URL visible
- Thumbnail shows

✅ **Save Working:**
- Toast: "Product updated successfully!"
- Dialog closes automatically
- Product table refreshes
- Changes visible in table

---

**Last Updated**: 2024-02-23  
**Version**: 1.0
