import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Stripe Webhook Handler - The 'Status Flipper'
 * 
 * Handles these events:
 * - checkout.session.completed: User completed payment via Stripe Checkout
 * - invoice.paid: Recurring subscription payment succeeded
 * - customer.subscription.updated: Subscription plan changed
 * - customer.subscription.deleted: Subscription cancelled
 * 
 * When a payment succeeds, updates the business record:
 *   - subscription_status = 'active'
 *   - subscription_end_date = calculated based on plan
 *   - trial_ends_at = null (no longer in trial)
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') ?? ''

    let event: Stripe.Event

    // Verify webhook signature (required in production)
    if (stripeWebhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          stripeWebhookSecret
        )
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message)
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    } else {
      // In development without webhook secret, parse directly
      event = JSON.parse(body)
    }

    console.log('Received Stripe event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const businessId = session.metadata?.business_id
  const planId = session.metadata?.plan_id
  const billingCycle = session.metadata?.billing_cycle || 'monthly'

  if (!businessId) {
    console.error('No business_id in session metadata')
    return
  }

  // Calculate subscription end date based on billing cycle
  const now = new Date()
  let endDate: Date
  if (billingCycle === 'yearly' || billingCycle === 'annual') {
    endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
  } else if (billingCycle === 'quarterly') {
    endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  } else {
    endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  }

  const endDateISO = endDate.toISOString()

  // Update the business record
  const { data, error } = await supabase
    .from('businesses')
    .update({
      subscription_status: 'active',
      subscription_end_date: endDateISO,
      subscription_plan: planId || 'Basic',
      trial_ends_at: null, // No longer in trial
      requires_extension_notice: false, // Clear extension notice
    })
    .eq('id', businessId)
    .select()

  if (error) {
    console.error('Failed to update business after checkout:', error)
    throw error
  }

  console.log('Business subscription activated:', {
    businessId,
    planId,
    endDate: endDateISO,
    updated: data
  })
}

/**
 * Handle successful recurring invoice payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  
  // Fetch the subscription to get metadata
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const businessId = subscription.metadata?.business_id

    if (!businessId) {
      console.error('No business_id in subscription metadata')
      return
    }

    // Calculate next billing date
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
    
    // Update business with extended subscription
    const { error } = await supabase
      .from('businesses')
      .update({
        subscription_status: 'active',
        subscription_end_date: currentPeriodEnd.toISOString(),
      })
      .eq('id', businessId)

    if (error) {
      console.error('Failed to update business after invoice paid:', error)
      throw error
    }

    console.log('Business subscription renewed via invoice:', {
      businessId,
      nextBillingDate: currentPeriodEnd.toISOString()
    })
  } catch (err) {
    console.error('Error processing invoice.paid:', err)
    throw err
  }
}

/**
 * Handle subscription update (plan change)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata?.business_id

  if (!businessId) {
    console.error('No business_id in subscription metadata')
    return
  }

  // Determine the plan from the price
  let planName = 'Basic'
  if (subscription.items?.data?.[0]?.price?.id) {
    const priceId = subscription.items.data[0].price.id
    // Map price IDs to plan names (configure these in Stripe Dashboard)
    if (priceId.includes('pro') || priceId.includes('professional')) {
      planName = 'Professional'
    } else if (priceId.includes('ultra') || priceId.includes('enterprise')) {
      planName = 'Ultra'
    }
  }

  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

  const { error } = await supabase
    .from('businesses')
    .update({
      subscription_plan: planName,
      subscription_end_date: currentPeriodEnd.toISOString(),
      subscription_status: subscription.status === 'active' ? 'active' : 
                         subscription.status === 'past_due' ? 'past_due' : 
                         subscription.status === 'canceled' ? 'cancelled' : 'active',
    })
    .eq('id', businessId)

  if (error) {
    console.error('Failed to update business subscription:', error)
    throw error
  }

  console.log('Business subscription updated:', { businessId, planName, status: subscription.status })
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata?.business_id

  if (!businessId) {
    console.error('No business_id in subscription metadata')
    return
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      subscription_status: 'cancelled',
    })
    .eq('id', businessId)

  if (error) {
    console.error('Failed to update business after cancellation:', error)
    throw error
  }

  console.log('Business subscription cancelled:', { businessId })
}
