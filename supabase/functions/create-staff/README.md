# Create Staff Edge Function

## Purpose

This Edge Function securely creates staff members server-side, preventing browser extension/firewall blocking issues that occur when creating users directly from the client.

## Why This Approach?

### Problem
When creating staff members from the browser using `supabase.auth.signUp()` or admin API calls:
- **Browser extensions** (ad blockers, privacy tools) block the requests
- **Network firewalls** flag authentication endpoints as suspicious  
- **ERR_BLOCKED_BY_ADMINISTRATOR** errors prevent staff creation
- Service role keys would be exposed to the browser (security risk)

### Solution
By moving staff creation to an Edge Function:
- ✅ Runs server-side with secure service role access
- ✅ Bypasses browser extensions and firewalls
- ✅ Never exposes service role keys to clients
- ✅ Implements proper authentication and authorization
- ✅ Maintains full audit trail

## Features

1. **Dual Creation Modes**
   - **Password Mode**: Creates user with auto-generated or provided password
   - **Invitation Mode**: Creates pending invitation in `staff_invites` table

2. **Security**
   - Validates caller is authenticated (Business Owner or Manager only)
   - Uses service role key securely on server-side only
   - Enforces business isolation (multi-tenant)
   - Checks for duplicate users across businesses

3. **Error Handling**
   - Comprehensive error messages
   - Handles duplicate users gracefully
   - Returns structured error responses

## API

### Endpoint
```
POST https://<project-ref>.supabase.co/functions/v1/create-staff
```

### Headers
```
Authorization: Bearer <user-jwt-token>
Content-Type: application/json
```

### Request Body
```json
{
  "email": "staff@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Cashier",
  "roleId": "uuid-of-role",  // Optional
  "branchId": "uuid-of-branch",  // Optional
  "password": "TempPass123"  // Optional - if omitted, creates invitation
}
```

### Response

**Success (with password):**
```json
{
  "success": true,
  "credentials": {
    "email": "staff@example.com",
    "password": "TempPass123"
  }
}
```

**Success (invitation):**
```json
{
  "success": true
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "errorCode": "ERROR_CODE"  // Optional
}
```

## Deployment

### Prerequisites
1. Supabase CLI installed: `npm install -g supabase`
2. Supabase project linked: `supabase link --project-ref <your-project-ref>`

### Deploy Edge Function
```bash
# Deploy the function
supabase functions deploy create-staff

# Set environment variables (if not already set)
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Verify Deployment
```bash
# Check function logs
supabase functions serve create-staff
```

## Testing

### Test with cURL
```bash
# Get your user JWT token first (from browser localStorage: sb-<project-ref>-auth-token)
export USER_TOKEN="your-jwt-token"
export SUPABASE_URL="https://<project-ref>.supabase.co"

# Create staff with password
curl -X POST \
  "$SUPABASE_URL/functions/v1/create-staff" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newstaff@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "Cashier",
    "password": "TempPass123"
  }'
```

## Environment Variables

The function uses these Supabase-provided environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (has admin privileges)
- `SUPABASE_ANON_KEY` - Anon/public key (for user verification)

These are automatically available in deployed Edge Functions.

## Security Notes

1. **Never expose service role key** - It stays securely on the server
2. **Authorization check** - Only Business Owner and Manager can create staff
3. **Business isolation** - Staff can only be created for caller's business
4. **Email uniqueness** - Enforced across the entire system

## Troubleshooting

### Function not deployed
```bash
supabase functions list
```

### Function errors
Check logs in Supabase Dashboard → Edge Functions → create-staff → Logs

### Authentication errors
Ensure the Authorization header contains a valid JWT token from an authenticated user.

### Permission errors
Verify the caller has role "Business Owner" or "Manager" in their profile.

## Related Files

- **Client code**: `/src/app/contexts/AuthContext.tsx` - `createStaff()` function
- **Database schema**: `/supabase/schema.sql` - `profiles` and `staff_invites` tables
- **RLS policies**: `/supabase/rls_policies.sql` - Row-level security

## Version History

- **v1.0** (2024-02-27) - Initial implementation with dual-mode creation
