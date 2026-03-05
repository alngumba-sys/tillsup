// ═══════════════════════════════════════════════════════════════════
// TILLSUP - SECURE STAFF CREATION EDGE FUNCTION
// ═══════════════════════════════════════════════════════════════════
// This Edge Function creates staff members securely server-side,
// preventing browser extension/firewall blocking issues.
// ═══════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateStaffRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId?: string;
  branchId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. AUTHENTICATION - Verify the caller is authorized
    // ═══════════════════════════════════════════════════════════════════
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with the user's JWT token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    // Get the caller's profile to check business_id and permissions
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile) {
      throw new Error('Unauthorized: Profile not found');
    }

    // Only Business Owner and Manager can create staff
    if (!['Business Owner', 'Manager'].includes(callerProfile.role)) {
      throw new Error('Unauthorized: Only Business Owner and Manager can create staff');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. PARSE REQUEST BODY
    // ═══════════════════════════════════════════════════════════════════
    const body: CreateStaffRequest = await req.json();
    const { email, password, firstName, lastName, role, roleId, branchId } = body;

    if (!email || !firstName || !lastName || !role) {
      throw new Error('Missing required fields: email, firstName, lastName, role');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. CHECK FOR EXISTING USER
    // ═══════════════════════════════════════════════════════════════════
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, role, business_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      if (existingProfile.business_id === callerProfile.business_id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `This email is already used by ${existingProfile.first_name} ${existingProfile.last_name} (${existingProfile.role}) in your business. Please use a different email address or update the existing staff member.`,
            errorCode: 'USER_EXISTS_SAME_BUSINESS'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: `This email is already registered with another business in Tillsup. Each email can only belong to one business. Please use a different email address.`,
            errorCode: 'USER_EXISTS_OTHER_BUSINESS'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. CREATE USER WITH SERVICE ROLE (SERVER-SIDE ONLY)
    // ═══════════════════════════════════════════════════════════════════
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // CASE A: Password Provided - Create user directly
    if (password) {
      console.log('Creating staff with password (direct signup)');
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: role
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        
        if (authError.message && authError.message.includes('User already registered')) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'This email is already registered in the system. Please use a different email address.'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }
        
        throw new Error(`Auth error: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('User creation failed: No user data returned');
      }

      console.log('✅ Auth user created:', authData.user.id);

      // ═══════════════════════════════════════════════════════════════════
      // 5. CREATE PROFILE RECORD
      // ═══════════════════════════════════════════════════════════════════
      const newProfile = {
        id: authData.user.id,
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        role: role,
        role_id: roleId || null,
        business_id: callerProfile.business_id,
        branch_id: branchId || null,
        can_create_expense: false,
        must_change_password: true,
        created_at: new Date().toISOString()
      };

      const { data: insertedProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        
        // If profile already exists (e.g. via trigger), try update
        if (profileError.code === '23505') {
          console.log('Profile exists, updating instead...');
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(newProfile)
            .eq('id', authData.user.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }
          
          console.log('✅ Profile updated successfully');
          return new Response(
            JSON.stringify({
              success: true,
              credentials: { email: email.toLowerCase(), password }
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
        
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      console.log('✅ Profile created successfully');
      return new Response(
        JSON.stringify({
          success: true,
          credentials: { email: email.toLowerCase(), password }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // CASE B: No Password - Create Invitation
    console.log('Creating staff invitation (email flow)');
    
    const invitation = {
      business_id: callerProfile.business_id,
      branch_id: branchId || null,
      email: email.toLowerCase(),
      role: role,
      first_name: firstName,
      last_name: lastName,
      status: 'pending',
      invited_by: user.id,
      created_at: new Date().toISOString()
    };

    const { error: inviteError } = await supabaseClient
      .from('staff_invites')
      .insert(invitation);

    if (inviteError) {
      console.error('Invitation creation error:', inviteError);
      
      if (inviteError.code === '23505') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'A staff member with this email already exists.',
            errorCode: inviteError.code
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
      
      throw new Error(`Invitation failed: ${inviteError.message}`);
    }

    console.log('✅ Staff invitation created successfully');
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in create-staff function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500
      }
    );
  }
});
