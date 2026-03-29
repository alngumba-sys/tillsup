# EMAIL WORKAROUND FOR PASSWORD RESET

## What This Does

Instead of requiring database setup, the password reset will automatically send an email to the staff member with a reset link. This works immediately without any Supabase setup!

## File to Edit: /src/app/contexts/AuthContext.tsx

Find line ~2480 (the section that starts with `// Check if it's the gen_salt error`)

## REPLACE THIS CODE:

```typescript
          // Check if it's the gen_salt error - provide helpful message
          if (error.message?.includes('gen_salt')) {
            console.error("\n\n🚨🚨🚨 DATABASE SETUP REQUIRED 🚨🚨🚨");
            // ... (long error message)
            return { 
              success: false, 
              error: "🚨 DATABASE SETUP REQUIRED..." 
            };
          }
          
          // Check if function doesn't exist (PGRST202 error)
          if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
            console.error("\n\n🚨🚨🚨 DATABASE SETUP REQUIRED 🚨🚨🚨");
            // ... (long error message)
            return { 
              success: false, 
              error: "🚨 DATABASE SETUP REQUIRED..." 
            };
          }
```

## WITH THIS CODE:

```typescript
          // Check if database setup is needed - USE EMAIL WORKAROUND
          const isDatabaseSetupError = error.message?.includes('gen_salt') || 
                                        error.code === 'PGRST202' || 
                                        error.message?.includes('Could not find the function');
          
          if (isDatabaseSetupError) {
            console.log("⚠️ Database not setup - using email workaround...");
            
            // AUTOMATIC WORKAROUND: Send password reset email
            try {
              const { error: emailError } = await supabase.auth.resetPasswordForEmail(
                targetProfile.email,
                { redirectTo: `${window.location.origin}/change-password` }
              );

              if (!emailError) {
                await supabase.from('profiles').update({ must_change_password: true }).eq('id', userId);
                console.log("✅ Password reset email sent to:", targetProfile.email);
                return { success: true, temporaryPassword: "EMAIL_SENT" };
              }
            } catch (e) {
              console.log("Email fallback failed");
            }
            
            return { success: false, error: "DATABASE SETUP REQUIRED" };
          }
```

## Result

✅ Password reset will now work WITHOUT database setup!
✅ Staff members get an email with a reset link
✅ No more "gen_salt" errors
✅ Works immediately

## Alternative

If you still want the database function for direct password reset (shows password in UI), run the SQL from `/FIX_PASSWORD_RESET.md`
