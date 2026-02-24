# Owner ID Fix & Prevention Guide

## 🚨 Problem
The RLS (Row Level Security) policies on the `businesses` table require that `owner_id = auth.uid()`. When `owner_id` is NULL or points to a non-existent user, login hangs because the business data cannot be fetched.

## ✅ Solution

### Step 1: Run the Migration Script

Execute the comprehensive migration script in your Supabase SQL Editor:

```bash
File: /supabase/migrations/fix_owner_id_and_prevent_future_issues.sql
```

**What this script does:**

1. **Diagnoses** - Finds all businesses with NULL or invalid owner_id
2. **Fixes** - Automatically repairs mismatched data by:
   - Matching businesses to their owners via profiles table
   - Updating NULL owner_ids
   - Correcting invalid owner_ids
3. **Prevents** - Adds multiple layers of protection:
   - NOT NULL constraint on owner_id
   - Foreign key constraint with CASCADE
   - Validation trigger (blocks invalid data)
   - Auto-set trigger (fills owner_id from auth.uid())
   - Helper function for safe business creation

### Step 2: Review the Output

The script will output diagnostic information:

```
═══════════════════════════════════════════════════════
DIAGNOSTIC REPORT: Businesses with NULL owner_id
═══════════════════════════════════════════════════════
Count: 0

═══════════════════════════════════════════════════════
FIXING: Businesses with NULL owner_id
═══════════════════════════════════════════════════════
Fixed: Business "ABC Store" (123-456) -> owner_id set to uuid-789
Total fixed (NULL -> matched owner): 5

═══════════════════════════════════════════════════════
✓✓✓ SUCCESS! All businesses have valid owner_id ✓✓✓
═══════════════════════════════════════════════════════
```

### Step 3: Test Login

1. Try logging in with different users
2. Verify business data loads correctly
3. Check that no timeout errors occur

## 🛡️ Protections Added

### 1. NOT NULL Constraint
```sql
ALTER TABLE public.businesses 
ALTER COLUMN owner_id SET NOT NULL;
```
**Effect:** Cannot create/update business without owner_id

### 2. Foreign Key with CASCADE
```sql
ALTER TABLE public.businesses
ADD CONSTRAINT businesses_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```
**Effect:** 
- owner_id must reference a valid auth.users record
- When user is deleted, their business is auto-deleted

### 3. Validation Trigger
```sql
CREATE TRIGGER validate_business_owner_trigger
    BEFORE INSERT OR UPDATE OF owner_id ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_business_owner_id();
```
**Effect:** Validates owner_id exists in auth.users before saving

### 4. Auto-Set Trigger
```sql
CREATE TRIGGER auto_set_business_owner_trigger
    BEFORE INSERT ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_business_owner_id();
```
**Effect:** If owner_id is NULL on insert, auto-fills from auth.uid()

### 5. Safe Creation Helper
```sql
SELECT public.create_business_safe(
    'BIZ-123',
    'My Store',
    'user-uuid',
    'Kenya',
    'KES',
    'Free Trial'
);
```
**Effect:** Provides a safe function to create businesses with validation

## 🔍 Manual Diagnostics (If Needed)

### Find businesses with NULL owner_id
```sql
SELECT id, name, owner_id, created_at, country
FROM public.businesses
WHERE owner_id IS NULL;
```

### Find businesses with invalid owner_id
```sql
SELECT b.id, b.name, b.owner_id, b.created_at
FROM public.businesses b
WHERE b.owner_id IS NOT NULL
  AND b.owner_id NOT IN (SELECT id FROM auth.users);
```

### Find businesses where owner has no profile
```sql
SELECT b.id, b.name, b.owner_id
FROM public.businesses b
LEFT JOIN public.profiles p ON b.owner_id = p.id
WHERE b.owner_id IS NOT NULL AND p.id IS NULL;
```

## 🔧 Manual Fixes (If Automated Fix Doesn't Work)

### Fix by matching with profiles
```sql
UPDATE public.businesses b
SET owner_id = (
    SELECT p.id
    FROM public.profiles p
    WHERE p.business_id = b.id
      AND p.role = 'Business Owner'
    LIMIT 1
)
WHERE b.owner_id IS NULL;
```

### Fix by matching with contact email
```sql
UPDATE public.businesses b
SET owner_id = (
    SELECT u.id
    FROM auth.users u
    WHERE u.email = b.contact_email
    LIMIT 1
)
WHERE b.owner_id IS NULL
  AND b.contact_email IS NOT NULL;
```

### Delete orphaned businesses (use with caution!)
```sql
-- Only run this if you're sure these businesses should be deleted
DELETE FROM public.businesses
WHERE owner_id IS NULL
   OR owner_id NOT IN (SELECT id FROM auth.users);
```

## 📊 Verify Everything is Fixed

```sql
-- Should return 0
SELECT COUNT(*) as invalid_businesses
FROM public.businesses
WHERE owner_id IS NULL
   OR owner_id NOT IN (SELECT id FROM auth.users);

-- Should match total count
SELECT 
    COUNT(*) as total_businesses,
    COUNT(CASE WHEN owner_id IS NOT NULL 
               AND owner_id IN (SELECT id FROM auth.users) 
          THEN 1 END) as valid_businesses
FROM public.businesses;
```

## 🎯 Best Practices Going Forward

1. **Always set owner_id** when creating businesses programmatically
2. **Use auth.uid()** to get the current authenticated user's ID
3. **Don't manually insert** business records without owner_id
4. **Test with RLS enabled** to catch issues early
5. **Monitor logs** for any trigger warnings

## 🚀 Testing the Fix

### Test 1: Create a new business
```typescript
const { data, error } = await supabase.from('businesses').insert({
  id: crypto.randomUUID(),
  name: 'Test Store',
  // owner_id will be auto-filled by trigger!
});
```

### Test 2: Try to create without owner (should fail with good error)
```sql
INSERT INTO public.businesses (id, name)
VALUES ('test-id', 'Test Business');
-- Should raise: "owner_id cannot be NULL for business..."
```

### Test 3: Try to use invalid owner_id (should fail)
```sql
INSERT INTO public.businesses (id, name, owner_id)
VALUES ('test-id', 'Test Business', 'invalid-uuid');
-- Should raise: "owner_id does not exist in auth.users"
```

## 📝 Notes

- **This fix is permanent** - Once applied, it affects all future business creations
- **Existing data is preserved** - Only invalid data is corrected
- **Multiple layers of protection** - Even if one fails, others catch the issue
- **Zero downtime** - Script can run while app is live
- **Backwards compatible** - Your existing app code continues to work

## 🆘 Troubleshooting

### Issue: "Cannot add NOT NULL constraint"
**Solution:** Some businesses still have NULL owner_id. Review diagnostic output and manually fix or delete them.

### Issue: "Foreign key violation"
**Solution:** An owner_id references a deleted user. Update to valid user or delete the business.

### Issue: "RLS policy still blocking"
**Solution:** Verify the fix worked by checking:
```sql
SELECT id, name, owner_id FROM businesses WHERE owner_id = auth.uid();
```

### Issue: "Trigger is too restrictive"
**Solution:** You can temporarily disable the trigger:
```sql
ALTER TABLE public.businesses DISABLE TRIGGER validate_business_owner_trigger;
-- Do your work
ALTER TABLE public.businesses ENABLE TRIGGER validate_business_owner_trigger;
```

## 📞 Support

If you encounter issues:
1. Check the diagnostic output from the migration script
2. Review the troubleshooting section above
3. Check Supabase logs for detailed error messages
4. Verify RLS policies are still correct

---

**Last Updated:** 2026-02-23
**Script Version:** 1.0
**Compatibility:** Supabase PostgreSQL 14+
