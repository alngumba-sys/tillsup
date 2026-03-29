import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { priceId, businessId, planId, billingCycle, country, successUrl, cancelUrl } = await req.json()

    if (!priceId) {
      throw new Error('priceId is required')
    }

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin')}/app/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/app/subscription?canceled=true`,
      // Include business metadata so the webhook knows which business to update
      metadata: {
        business_id: businessId ?? '',
        plan_id: planId ?? 'Basic',
        billing_cycle: billingCycle ?? 'monthly',
        country: country ?? 'KE',
      },
      // Also attach to the subscription for invoice.paid events
      subscription_data: {
        metadata: {
          business_id: businessId ?? '',
          plan_id: planId ?? 'Basic',
          billing_cycle: billingCycle ?? 'monthly',
        },
      },
    })

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
