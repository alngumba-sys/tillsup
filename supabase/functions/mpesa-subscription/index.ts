import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phoneNumber, amount, businessId, planId, billingCycle } = await req.json()

    if (!phoneNumber || !amount || !businessId || !planId) {
      throw new Error('phoneNumber, amount, businessId, and planId are required')
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount < 1) {
      throw new Error('Amount must be at least 1 KES')
    }

    let formattedPhone = phoneNumber.replace(/^0/, '254').replace(/^\+/, '')
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = `254${formattedPhone}`
    }

    if (!/^254[17]\d{8}$/.test(formattedPhone)) {
      throw new Error('Invalid Kenyan phone number format')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch business M-PESA credentials from database
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('mpesa_consumer_key, mpesa_consumer_secret, mpesa_shortcode, mpesa_passkey, mpesa_environment')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      throw new Error('Business not found')
    }

    const consumerKey = business.mpesa_consumer_key ?? ''
    const consumerSecret = business.mpesa_consumer_secret ?? ''
    const shortcode = business.mpesa_shortcode ?? ''
    const passkey = business.mpesa_passkey ?? ''
    const environment = business.mpesa_environment ?? 'sandbox'
    
    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      throw new Error('M-PESA not configured for this business. Please add your M-PESA credentials in Settings.')
    }

    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'

    const authString = `${consumerKey}:${consumerSecret}`
    const encodedAuth = btoa(authString)

    const tokenResponse = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${encodedAuth}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!tokenResponse.ok) {
      throw new Error('Failed to generate M-PESA access token')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14)
    const passwordString = `${shortcode}${passkey}${timestamp}`
    const password = btoa(passwordString)

    const stkPushPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(numericAmount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: `${supabaseUrl}/functions/v1/mpesa-callback`,
      AccountReference: `SUB-${businessId.substring(0, 8)}`,
      TransactionDesc: `Subscription: ${planId} (${billingCycle || 'monthly'})`,
    }

    const stkResponse = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPushPayload),
      }
    )

    if (!stkResponse.ok) {
      const errorText = await stkResponse.text()
      throw new Error(`STK Push failed: ${stkResponse.status} - ${errorText}`)
    }

    const stkData = await stkResponse.json()

    const { error: dbError } = await supabase
      .from('mpesa_transactions')
      .insert({
        checkout_request_id: stkData.CheckoutRequestID,
        merchant_request_id: stkData.MerchantRequestID,
        business_id: businessId,
        phone_number: formattedPhone,
        amount: numericAmount,
        status: 'pending',
        description: `Subscription: ${planId} (${billingCycle || 'monthly'})`,
      })

    if (dbError) {
      console.error('Failed to store transaction:', dbError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
        responseCode: stkData.ResponseCode,
        responseDescription: stkData.ResponseDescription,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
