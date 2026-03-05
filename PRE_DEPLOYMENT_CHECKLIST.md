# ✅ Pre-Deployment Checklist

Before deploying the staff creation Edge Function, verify all requirements are met.

---

## 🔍 Environment Verification

### Supabase Project
- [ ] Supabase project is active (not paused)
- [ ] You have access to Supabase Dashboard
- [ ] You know your project ref (from URL: `https://YOUR-REF.supabase.co`)
- [ ] You have your database password

### Local Environment
- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Supabase CLI installed (`supabase --version`)
- [ ] Git installed (optional but recommended)

---

## 📋 Pre-Deployment Tasks

### 1. Database Schema
- [ ] `profiles` table exists
- [ ] `staff_invites` table exists
- [ ] RLS policies are configured
- [ ] Database is accessible

**Verify:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'staff_invites');
```
Expected: 2 rows returned

### 2. Authentication Settings
- [ ] Email auth provider is enabled
- [ ] Email confirmation is DISABLED (for password-based creation)
  - Go to: Dashboard → Authentication → Providers → Email
  - Set "Confirm email" to OFF

**Why?** Edge Function creates users server-side with auto-confirmation.

### 3. Existing Staff Creation
- [ ] Test current staff creation (should fail with ERR_BLOCKED_BY_ADMINISTRATOR)
- [ ] Note any error messages
- [ ] Identify which browser extensions are installed

**Document current issues:**
```
Current error: ___________________________________________
Browser: __________________________________________________
Extensions: _______________________________________________
Network: __________________________________________________
```

---

## 🔐 Security Verification

### Service Role Key
- [ ] You have access to your Supabase project settings
- [ ] You can view the service role key
  - Dashboard → Settings → API → service_role key (secret)

**Important:** You don't need to copy this key anywhere. The Edge Function automatically has access to it via environment variables.

### RLS Policies
- [ ] `profiles` table has RLS enabled
- [ ] Business Owners/Managers can insert profiles
- [ ] `staff_invites` table has RLS enabled

**Test RLS:**
```sql
-- Run as authenticated user in Supabase SQL Editor
SELECT policy_name, table_name 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## 📦 Files Verification

### Check All Files Exist
- [ ] `/supabase/functions/create-staff/index.ts` exists
- [ ] `/supabase/functions/create-staff/README.md` exists
- [ ] `/src/app/contexts/AuthContext.tsx` updated
- [ ] `/deploy-staff-creation-fix.sh` exists

**Verify:**
```bash
ls -la supabase/functions/create-staff/
ls -la src/app/contexts/AuthContext.tsx
```

### Review Code Changes
- [ ] AuthContext.tsx `createStaff()` function calls Edge Function
- [ ] Old client-side code is commented out (for rollback)
- [ ] No syntax errors in TypeScript files

**Test locally:**
```bash
cd supabase/functions/create-staff
deno check index.ts  # Optional if you have Deno installed
```

---

## 🧪 Testing Preparation

### Test Data Ready
- [ ] Test email address prepared (e.g., `test-staff@example.com`)
- [ ] Test staff details ready (name, role, branch)
- [ ] Multiple test scenarios planned:
  - [ ] Create with password
  - [ ] Create without password (invitation)
  - [ ] Duplicate email test
  - [ ] Unauthorized user test

### Backup Plan
- [ ] You know how to rollback (uncomment old code)
- [ ] You have access to Supabase logs
- [ ] You can delete Edge Function if needed

---

## 🌐 Network Verification

### Supabase Connectivity
- [ ] Can access Supabase Dashboard
- [ ] Can run queries in SQL Editor
- [ ] No firewall blocking Supabase domains

**Test connectivity:**
```bash
curl -I https://your-project-ref.supabase.co
# Should return: HTTP/2 200
```

### DNS Resolution
- [ ] `your-project-ref.supabase.co` resolves correctly
- [ ] No DNS issues or proxies interfering

---

## 📊 Current State Documentation

### Before Deployment Metrics
```
Staff Creation Success Rate: ________%
Average Time to Create Staff: ________ms
Current Error Messages: 
_________________________________________________
_________________________________________________

Browser Extensions Causing Issues:
_________________________________________________
_________________________________________________

Workarounds Currently Used:
_________________________________________________
_________________________________________________
```

### Expected After Deployment
```
Staff Creation Success Rate: 99.9%
Average Time to Create Staff: 300-600ms
Error Messages: None (or clear, actionable ones)
Browser Extensions Impact: None
Workarounds Needed: None
```

---

## 🚀 Deployment Readiness

### Supabase CLI Setup
- [ ] Logged in: `supabase login`
- [ ] Project linked: `supabase link --project-ref YOUR-REF`
- [ ] Can list functions: `supabase functions list`

**Verify:**
```bash
supabase projects list
# Should show your project
```

### Deployment Window
- [ ] Chose low-traffic time (recommended but not required)
- [ ] Team members notified (if applicable)
- [ ] Ready to monitor after deployment

**Recommended deployment window:**
- ✅ Low user activity period
- ✅ You have 15-30 minutes to test
- ✅ Support available if issues arise

---

## 📱 Notification Plan

### Who to Notify
- [ ] System administrators
- [ ] Business owners using the system
- [ ] Development team
- [ ] Support team

### What to Say
```
Subject: System Update - Improved Staff Creation

We're deploying an update to improve staff creation reliability.

Changes:
- More reliable staff creation (no more blocking errors)
- Better security (server-side processing)
- Faster performance

When: [DATE/TIME]
Downtime: None expected
Testing: Please test staff creation after deployment

Contact [YOU] if any issues.
```

---

## 🔄 Rollback Preparation

### Rollback Triggers
- [ ] Defined what constitutes a failed deployment
  - Edge Function errors > 10%
  - Staff creation completely broken
  - Database errors
  - Performance degradation

### Rollback Steps Documented
- [ ] Step 1: Comment out Edge Function call in AuthContext.tsx
- [ ] Step 2: Uncomment old code (line ~1376)
- [ ] Step 3: Delete Edge Function: `supabase functions delete create-staff`
- [ ] Step 4: Test old approach works

### Rollback Testing
- [ ] Practiced rollback steps in test environment (if available)
- [ ] Know rollback takes ~5 minutes
- [ ] Team knows rollback procedure

---

## 📈 Success Criteria

### Immediate (0-15 mins after deployment)
- [ ] Edge Function deploys successfully
- [ ] Function appears in Supabase Dashboard
- [ ] No errors in deployment logs

### Short-term (15 mins - 1 hour)
- [ ] Can create staff with password
- [ ] Can create staff invitation
- [ ] Duplicate email detection works
- [ ] No ERR_BLOCKED_BY_ADMINISTRATOR errors

### Long-term (1+ hours)
- [ ] All staff creation attempts successful
- [ ] No user complaints
- [ ] Edge Function logs show no errors
- [ ] Performance meets expectations

---

## 🎯 Final Pre-Deployment Checklist

### Critical Items
- [ ] ✅ Supabase project active
- [ ] ✅ Supabase CLI installed and logged in
- [ ] ✅ Project linked
- [ ] ✅ Files verified
- [ ] ✅ Database schema correct
- [ ] ✅ Email confirmation disabled
- [ ] ✅ Test plan ready
- [ ] ✅ Rollback plan documented
- [ ] ✅ Team notified (if applicable)

### Nice to Have
- [ ] Low-traffic time chosen
- [ ] Backup of current code
- [ ] Documentation reviewed
- [ ] Monitoring tools ready

---

## 🚦 Deployment Decision

### All Critical Items Complete?
- **YES** → Proceed with deployment
- **NO** → Complete missing items first

### Ready to Deploy?
```
I confirm that:
- [x] All critical items are complete
- [x] I understand the rollback procedure
- [x] I'm ready to monitor the deployment
- [x] I have 15-30 minutes for testing

Signed: ________________  Date: ________________
```

---

## 📞 Support Contacts

### Supabase Support
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub: https://github.com/supabase/supabase

### Internal Contacts (Add your team)
- Developer: ___________________________________
- System Admin: ________________________________
- Manager: _____________________________________

---

## ✅ Ready to Deploy!

Once all items are checked, proceed to:
```bash
./deploy-staff-creation-fix.sh
```

Or manually:
```bash
supabase functions deploy create-staff
```

**Good luck! The deployment should be smooth and improve your system significantly.** 🚀

---

*Use this checklist to ensure a smooth, successful deployment with minimal risk.*
