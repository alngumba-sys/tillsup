  const resetStaffPassword = async (userId: string): Promise<{ success: boolean; error?: string; temporaryPassword?: string }> => {
     if (!user || !business) return { success: false, error: "Not authenticated" };
     
     // Handle Invites
     if (userId.startsWith('invite-')) {
        return { success: false, error: "Cannot reset password for pending invites. Please resend the invitation instead." };
     }

     // 1. Generate a simple 8-character alphanumeric password (easy to share and type)
     const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
     let temporaryPassword = "";
     for (let i = 0; i < 8; i++) {
       temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length));
     }
     
     try {
       // 2. Verify permissions
       if (!hasPermission(['Business Owner', 'Manager'])) {
         return { success: false, error: "Insufficient permissions. Only Business Owners and Managers can reset passwords." };
       }

       // 3. Get target user profile to verify they're in the same business
       const { data: targetProfile, error: profileError } = await supabase
         .from('profiles')
         .select('business_id, role, email')
         .eq('id', userId)
         .single();

       if (profileError || !targetProfile) {
         return { success: false, error: "Staff member not found" };
       }

       // Verify both users are in the same business
       if (targetProfile.business_id !== business.id) {
         return { success: false, error: "Cannot reset password for staff in different business" };
       }

       // Prevent resetting Business Owner password unless admin is also Business Owner
       if (targetProfile.role === 'Business Owner' && user.role !== 'Business Owner') {
         return { success: false, error: "Only Business Owner can reset another Business Owner's password" };
       }

       console.log("🔄 Attempting password reset...");

       // 4. Try using the database function
       const { data, error } = await supabase.rpc('simple_reset_staff_password', {
         p_user_id: userId,
         p_new_password: temporaryPassword,
         p_admin_id: user.id,
         p_business_id: business.id
       });

       if (error) {
         console.error("❌ Database function error:", error);
         
         // Check if it's the gen_salt error or function missing
         const isDatabaseSetupError = error.message?.includes('gen_salt') || 
                                       error.code === 'PGRST202' || 
                                       error.message?.includes('Could not find the function');
         
         if (isDatabaseSetupError) {
           console.log("⚠️ Database function not available - using email workaround...");
           
           // AUTOMATIC WORKAROUND: Send password reset email
           try {
             const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
               targetProfile.email,
               { redirectTo: `${window.location.origin}/change-password` }
             );

             if (!recoveryError) {
               // Mark as must change password
               await supabase
                 .from('profiles')
                 .update({ must_change_password: true })
                 .eq('id', userId);

               console.log("✅ Password reset email sent to:", targetProfile.email);
               
               return { 
                 success: true, 
                 temporaryPassword: "EMAIL_SENT"
               };
             }
           } catch (e) {
             console.log("Email fallback also failed");
           }
           
           // If everything failed, return setup required error
           return { 
             success: false, 
             error: "DATABASE SETUP REQUIRED" 
           };
         }
         
         return { success: false, error: error.message };
       }

       // Parse response
       const result = typeof data === 'string' ? JSON.parse(data) : data;
       
       if (!result.success) {
         return { success: false, error: result.error || "Password reset failed" };
       }

       console.log("✅ Password reset successful via database function");

       // Mark profile as must_change_password
       await supabase
         .from('profiles')
         .update({ must_change_password: true })
         .eq('id', userId);

       return { success: true, temporaryPassword };
     } catch (err: any) {
       console.error("Password reset error:", err);
       return { success: false, error: err.message };
     }
  };
