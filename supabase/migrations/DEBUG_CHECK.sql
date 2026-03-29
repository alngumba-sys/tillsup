-- Check what profiles exist and their emails
SELECT id, email, role, first_name, last_name, business_id, is_super_admin 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 20;

-- Also check the auth.users table for the admin
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
WHERE email LIKE '%admin%' OR email LIKE '%tillsup%'
ORDER BY created_at DESC;
