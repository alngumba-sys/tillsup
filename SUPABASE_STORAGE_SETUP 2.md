# Supabase Storage Setup for Tillsup

## Issue
Images are not uploading because the Supabase Storage bucket is not properly configured.

## Solution

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Enter the bucket name: `Inventoryimages`
5. **Important:** Enable **"Public bucket"** option
6. Click **"Create bucket"**

### Step 2: Set Up RLS (Row Level Security) Policies

After creating the bucket, you need to add policies to allow authenticated users to upload images.

1. In Supabase Dashboard, go to **Storage** > Click on **"Inventoryimages"** bucket
2. Click on **"Policies"** tab
3. Click **"New Policy"**

#### Policy 1: Allow Authenticated Users to Upload

```sql
-- Policy Name: Allow authenticated users to upload
-- Allowed operation: INSERT

CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Inventoryimages');
```

#### Policy 2: Allow Public Read Access

```sql
-- Policy Name: Allow public read access
-- Allowed operation: SELECT

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Inventoryimages');
```

#### Policy 3: Allow Authenticated Users to Update

```sql
-- Policy Name: Allow authenticated users to update
-- Allowed operation: UPDATE

CREATE POLICY "Allow authenticated users to update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Inventoryimages')
WITH CHECK (bucket_id = 'Inventoryimages');
```

#### Policy 4: Allow Authenticated Users to Delete

```sql
-- Policy Name: Allow authenticated users to delete
-- Allowed operation: DELETE

CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Inventoryimages');
```

### Step 3: Configure Bucket Settings

1. Go to **Storage** > **Inventoryimages** bucket
2. Click on **"Configuration"** or settings icon
3. Verify these settings:
   - **File size limit:** 2MB (2097152 bytes)
   - **Allowed MIME types:** 
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`
     - `image/gif`

### Alternative: Quick Setup via SQL Editor

You can also run this SQL in the Supabase SQL Editor to set everything up at once:

```sql
-- Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('Inventoryimages', 'Inventoryimages', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Inventoryimages');

CREATE POLICY IF NOT EXISTS "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Inventoryimages');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Inventoryimages')
WITH CHECK (bucket_id = 'Inventoryimages');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Inventoryimages');
```

## Verification

After setup, test the image upload:

1. Go to **Inventory** page
2. Click **"Add Product"**
3. Try uploading an image
4. You should see "Image uploaded successfully" toast notification

## Troubleshooting

### Error: "Bucket not found"
- Make sure you created the bucket with exact name: `Inventoryimages` (capital I)

### Error: "Upload Permission Error" or "violates row-level security"
- Make sure you ran all the RLS policies above
- Verify that the authenticated user has proper session token

### Error: "Upload Timeout"
- Check your internet connection
- Try uploading a smaller image (under 1MB)
- Check if Supabase project is active and not paused

### Images upload but don't display
- Make sure the bucket is set to **Public**
- Verify the public URL is being generated correctly in browser console

## Need Help?

Contact your Supabase administrator or check:
- Supabase Dashboard > Storage > Inventoryimages > Policies
- Supabase Dashboard > API > API Settings (verify your project URL and anon key)
