import { createClient } from '@supabase/supabase-js';

export async function resetStaffPasswordWithFallback(params: {
  userId: string;
  temporaryPassword: string;
  adminId: string;
  businessId: string;
  targetEmail: string;
  supabase: ReturnType<typeof createClient>;
}): Promise<{ success: boolean; error?: string; method?: 'function' | 'email' }> {
  const { userId, temporaryPassword, adminId, businessId, targetEmail, supabase } = params;

  console.log("🔄 Attempting password reset via database function...");

  try {
    // Try database function first
    const { data, error } = await supabase.rpc('simple_reset_staff_password', {
      p_user_id: userId,
      p_new_password: temporaryPassword,
      p_admin_id: adminId,
      p_business_id: businessId
    });

    if (error) {
      console.error("❌ Database function error:", error);

      // Check if it's the gen_salt error or function missing
      if (error.message?.includes('gen_salt') ||
          error.code === 'PGRST202' ||
          error.message?.includes('Could not find the function')) {

        console.log("⚠️ Database function not available - using email fallback...");

        // AUTOMATIC WORKAROUND: Send password reset email
        return await emailResetFallback(supabase, userId, targetEmail);
      }

      return { success: false, error: error.message || "Password reset failed on the server." };
    }

    // Parse database function response
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

    return { success: true, method: 'function' };
  } catch (err: any) {
    console.error("❌ Unexpected error during password reset:", err);
    return { success: false, error: err.message || "An unexpected error occurred during password reset." };
  }
}

async function emailResetFallback(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  targetEmail: string
): Promise<{ success: boolean; error?: string; method?: 'email' }> {
  try {
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
      targetEmail,
      {
        redirectTo: `${window.location.origin}/change-password`
      }
    );

    if (recoveryError) {
      console.error("❌ Email fallback failed:", recoveryError);
      return {
        success: false,
        error: "Password reset email failed to send. Please contact support."
      };
    }

    // Mark profile as must_change_password
    await supabase
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    console.log("✅ Password reset email sent to:", targetEmail);

    return {
      success: true,
      method: 'email'
    };
  } catch (emailError: any) {
    console.error("❌ Email workaround failed:", emailError);
    return {
      success: false,
      error: emailError.message || "Password reset email failed. Please try again."
    };
  }
}
