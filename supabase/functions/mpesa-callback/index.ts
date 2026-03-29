import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * M-PESA Callback Handler
 * Receives payment confirmation from M-PESA
 * 
 * Called by Safaricom after customer enters M-PESA PIN
 * Updates transaction status and triggers business logic
 */
serve(async (req) => {
  // M-PESA callbacks don't use CORS, but we include headers for safety
  try {
    const body = await req.json()
    console.log('M-PESA Callback received:', JSON.stringify(body))

    const { Body } = body
    
    if (!Body || !Body.stkCallback) {
      console.error('Invalid callback format')
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: 'Invalid callback format' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { CheckoutRequestID, MerchantRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find the transaction by CheckoutRequestID
    const { data: transaction, error: fetchError } = await supabase
      .from('mpesa_transactions')
      .select('*')
      .eq('checkout_request_id', CheckoutRequestID)
      .single()

    if (fetchError || !transaction) {
      console.error('Transaction not found:', CheckoutRequestID, fetchError)
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: 'Transaction not found' }),
        { headers: { 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Parse callback metadata
    let mpesaReceiptNumber = null
    let transactionDate = null
    let phoneNumber = null

    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value
            break
          case 'TransactionDate':
            transactionDate = item.Value
            break
          case 'PhoneNumber':
            phoneNumber = item.Value
            break
        }
      }
    }

    // Determine transaction status
    const isSuccess = ResultCode === 0
    const status = isSuccess ? 'completed' : 'failed'

    // Update transaction record
    const { error: updateError } = await supabase
      .from('mpesa_transactions')
      .update({
        status,
        result_code: ResultCode,
        result_description: ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
        transaction_date: transactionDate ? new Date(transactionDate.toString()).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('checkout_request_id', CheckoutRequestID)

    if (updateError) {
      console.error('Failed to update transaction:', updateError)
    }

    // If payment successful, update the sale record
    if (isSuccess && transaction.sale_id) {
      const { error: saleError } = await supabase
        .from('sales')
        .update({
          payment_status: 'paid',
          mpesa_receipt_number: mpesaReceiptNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.sale_id)

      if (saleError) {
        console.error('Failed to update sale:', saleError)
      }
    }

    // Return success response to M-PESA
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: 'Accepted',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Callback processing error:', error)
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
