# 🚀 Edge Function Deployment Guide

## What Changed?

Staff creation has been moved from **client-side** to **server-side** using a Supabase Edge Function. This fixes the `ERR_BLOCKED_BY_ADMINISTRATOR` error you were experiencing.

### Before (Client-Side) ❌
```
Browser → Supabase Auth API → Create User
          ↑
   BLOCKED by extensions/firewall
```

### After (Server-Side) ✅
```
Browser → Edge Function → Supabase Auth API → Create User
                 ↑
         Runs on Supabase servers
         (Can't be blocked!)
```

## Deployment Steps

### 1. Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

### 2. Link Your Supabase Project

```bash
supabase link --project-ref <your-project-ref>
```

**How to find your project ref:**
- Go to your Supabase Dashboard
- Your project URL is: `https://<project-ref>.supabase.co`
- The `<project-ref>` is the part before `.supabase.co`

**You'll be asked to enter your database password** - this is the password you set when you created your Supabase project.

### 3. Deploy the Edge Function

```bash
supabase functions deploy create-staff
```

You should see output like:
```
Deploying create-staff (version xxx)
Deployed create-staff successfully
```

### 4. Verify It's Working

#### Option A: Check in Supabase Dashboard
1. Go to **Edge Functions** in your Supabase Dashboard
2. You should see `create-staff` listed
3. Click on it to see logs and details

#### Option B: Test with your app
1. Try creating a new staff member in Tillsup
2. It should now work without the `ERR_BLOCKED_BY_ADMINISTRATOR` error!

## Environment Variables

The Edge Function automatically has access to these environment variables:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (never exposed to browser!)
- `SUPABASE_ANON_KEY` - Public key

**You don't need to set these manually** - Supabase provides them automatically.

## Troubleshooting

### Error: "Project not linked"
Run:
```bash
supabase link --project-ref <your-project-ref>
```

### Error: "Unable to deploy function"
Check that you're logged in:
```bash
supabase login
```

### Error: "Database password required"
You need the database password you set when creating your Supabase project. If you forgot it:
1. Go to Supabase Dashboard → Settings → Database
2. Click "Reset Database Password"

### Function deployed but still getting errors
1. Check Edge Function logs in Supabase Dashboard
2. Make sure your Supabase project is on a paid plan (Edge Functions have limits on free tier)
3. Verify the function is deployed: `supabase functions list`

## Testing the Edge Function

### Test with Browser Console
Open your browser console on the Tillsup app and run:

```javascript
const session = await supabase.auth.getSession();
const response = await fetch(`${supabaseUrl}/functions/v1/create-staff`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.data.session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'Cashier',
    password: 'TempPass123'
  })
});
const result = await response.json();
console.log(result);
```

Expected output:
```json
{
  "success": true,
  "credentials": {
    "email": "test@example.com",
    "password": "TempPass123"
  }
}
```

## Benefits of This Approach

✅ **No more browser blocking** - Runs on Supabase's servers  
✅ **More secure** - Service role key never exposed to browsers  
✅ **Better performance** - Server-side execution is faster  
✅ **Enterprise-ready** - Industry standard for sensitive operations  
✅ **Better error handling** - Clear error messages  

## Additional Commands

### View function logs
```bash
supabase functions serve create-staff
```

### List all functions
```bash
supabase functions list
```

### Delete function (if needed)
```bash
supabase functions delete create-staff
```

## Next Steps

After successful deployment:

1. ✅ **Test staff creation** - Try adding a new staff member
2. ✅ **Remove browser extensions** - You can re-enable them now (won't affect staff creation anymore!)
3. ✅ **Check function logs** - Monitor the Edge Function in Supabase Dashboard

## Support

If you encounter any issues:

1. Check the Edge Function logs in Supabase Dashboard
2. Verify your Supabase project is active and not paused
3. Ensure you're on a Supabase plan that supports Edge Functions
4. Review the `/supabase/functions/create-staff/README.md` for detailed API documentation

---

**Created:** 2024-02-27  
**Version:** 1.0  
**Purpose:** Fix ERR_BLOCKED_BY_ADMINISTRATOR error in staff creation
