# Quick Debug Guide - Image Upload & Save Issues

## 🔍 Where to Find Debug Info

### 1. **Debug Button (TOP RIGHT of Dialog)**
   - Location: Edit Product dialog → Top right corner
   - Button labeled: "Debug"
   - Click it to log all form data to browser console

### 2. **Status Bar (BOTTOM of Dialog)**  
   - Location: Edit Product dialog → Bottom, above Cancel/Save buttons
   - Shows:
     - ✅ Product name being edited
     - ✅ Image status (Uploaded ✓ or No Image ⚠️)
     - ✅ Thumbnail preview (if image exists)

### 3. **Image Upload Feedback**
   - Location: Right below the file input field
   - Shows one of:
     - 🔄 "Uploading image..." (blue, animated)
     - ✅ "Image uploaded successfully" (green)
     - ⚠️ "No image uploaded yet" (gray)

### 4. **Browser Console (F12)**
   - Press `F12` to open developer tools
   - Click "Console" tab
   - Look for these messages:
     ```
     Uploading file to Inventoryimages bucket: [filename]
     Upload successful: [data]
     Public URL: [url]
     handleEditProduct called {...}
     Updating product with: {...}
     ```

## 📋 Step-by-Step Testing

### Test Image Upload:
1. Open Edit Product dialog
2. Press `F12` to open console
3. Click file input and select an image
4. **Watch for**:
   - ✅ "Uploading image..." appears below file input
   - ✅ Console logs: "Uploading file to Inventoryimages bucket"
   - ✅ Console logs: "Upload successful"
   - ✅ Toast: "Image uploaded successfully"
   - ✅ Status bar shows green "Uploaded" badge
   - ✅ Thumbnail appears in status bar
   - ✅ "Image uploaded successfully" appears below file input

5. **If stuck on "Uploading image..."**:
   - Check console for errors
   - Look for: "Bucket not found" or "row-level security" errors
   - Solution: Run `/supabase_storage_policy.sql`

### Test Save Changes:
1. After uploading image (verify status bar shows "Uploaded")
2. Click "Debug" button (top right)
3. Check console - should show:
   ```
   Form Data: {...}
   Image URL: https://...
   Has Image: true
   ```
4. Click "Save Changes"
5. **Watch for**:
   - ✅ Console logs: "handleEditProduct called"
   - ✅ Console logs: "Updating product with:"
   - ✅ Toast: "Product updated successfully!"
   - ✅ Dialog closes

6. **If nothing happens**:
   - Check console for validation errors
   - Click "Debug" button again
   - Verify all required fields are filled

## 🐛 Common Issues

### Issue 1: Image Stuck on "Uploading..."
**Symptoms:**
- Blue "Uploading image..." text never disappears
- No error in console

**Solution:**
1. Check console for exact error
2. Run this SQL in Supabase:
```sql
SELECT * FROM storage.buckets WHERE id = 'Inventoryimages';
```
3. If empty, run `/supabase_storage_policy.sql`

### Issue 2: Upload Works But Save Doesn't Include Image
**Symptoms:**
- Status bar shows green "Uploaded" badge
- Image preview visible
- After save, product has no image in database

**Solution:**
1. Click "Debug" button
2. Check console: Does `Image URL` have a value?
3. Click "Save Changes"
4. Check console: Does `Updating product with:` include `image` field?
5. If missing, check `updateProduct` function in InventoryContext

### Issue 3: No Feedback at All
**Symptoms:**
- Click file input, nothing happens
- No "Uploading..." text appears

**Solution:**
1. Check if `handleImageUpload` is being called
2. Add this to console:
```javascript
document.getElementById('image').addEventListener('change', (e) => {
  console.log('File input changed:', e.target.files);
});
```

## 🎯 Visual Indicators Reference

| Location | Status | Meaning |
|----------|--------|---------|
| File Input | 🔄 "Uploading..." | Upload in progress |
| File Input | ✅ "Image uploaded successfully" | Upload complete |
| File Input | ⚠️ "No image uploaded yet" | No image |
| Status Bar | 🟢 "Uploaded" badge | Image exists in form |
| Status Bar | 🟡 "No Image" badge | No image in form |
| Status Bar | 🖼️ Thumbnail | Preview of uploaded image |

## 💡 Quick Console Commands

Open console (F12) and try these:

```javascript
// Check if file input exists
document.getElementById('image');

// Check Supabase storage
await supabase.storage.from('Inventoryimages').list();

// Test upload manually
const input = document.getElementById('image');
input.addEventListener('change', (e) => {
  console.log('Files:', e.target.files);
});
```

## ✅ Success Checklist

When everything is working:
- [ ] File input appears
- [ ] Selecting file shows "Uploading..." 
- [ ] Console shows upload messages
- [ ] Toast: "Image uploaded successfully"
- [ ] Status bar shows green "Uploaded" badge
- [ ] Thumbnail appears in status bar
- [ ] Debug button shows Image URL in console
- [ ] Save Changes logs to console
- [ ] Toast: "Product updated successfully!"
- [ ] Dialog closes
- [ ] Product has image in table

---

**Need More Help?**
1. Take screenshot of status bar
2. Copy all console output
3. Click "Debug" button and copy output
4. Note exact steps to reproduce
