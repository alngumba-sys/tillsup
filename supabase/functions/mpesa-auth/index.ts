import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * M-PESA OAuth Token Generator
 * Generates access token for M-PESA API calls
 * 
 * Endpoint: GET /oauth/v1/generate?grant_type=client_credentials
 * Auth: Basic Auth (Consumer Key:Consumer Secret encoded in Base64)
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get M-PESA credentials from environment variables
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY') ?? ''
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET') ?? ''
    
    if (!consumerKey || !consumerSecret) {
      throw new Error('M-PESA credentials not configured. Set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET.')
    }

    // Create Basic Auth header
    const authString = `${consumerKey}:${consumerSecret}`
    const encodedAuth = btoa(authString)

    // Determine environment (sandbox vs production)
    const environment = Deno.env.get('MPESA_ENVIRONMENT') ?? 'sandbox'
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'

    // Request access token
    const response = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${encodedAuth}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`M-PESA OAuth failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify({
        access_token: data.access_token,
        expires_in: data.expires_in,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
