import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Replace with your Stripe publishable key
// This is a test key, so it's safe to expose in client-side code for development
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Sh8LJI6WxkLq2cecJMD2D6fXelCGhVrkO2bSBWPskEbEgBrSLkSaTo5VWBZrcd48sTFqTSbs9jaXluihQ7iveK100sW72eK4N'; 

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

/**
 * Stripe Price IDs - Map these to your actual Stripe Dashboard price IDs
 * Create these at https://dashboard.stripe.com/prices
 */
export const STRIPE_PRICE_IDS: Record<string, Record<string, string>> = {
  KE: {
    basic_monthly: 'price_ke_basic_monthly',
    basic_annual: 'price_ke_basic_annual',
    professional_monthly: 'price_ke_pro_monthly',
    professional_annual: 'price_ke_pro_annual',
    ultra_monthly: 'price_ke_ultra_monthly',
    ultra_annual: 'price_ke_ultra_annual',
  },
  GH: {
    basic_monthly: 'price_gh_basic_monthly',
    basic_annual: 'price_gh_basic_annual',
    professional_monthly: 'price_gh_pro_monthly',
    professional_annual: 'price_gh_pro_annual',
    ultra_monthly: 'price_gh_ultra_monthly',
    ultra_annual: 'price_gh_ultra_annual',
  },
  ET: {
    basic_monthly: 'price_et_basic_monthly',
    basic_annual: 'price_et_basic_annual',
    professional_monthly: 'price_et_pro_monthly',
    professional_annual: 'price_et_pro_annual',
    ultra_monthly: 'price_et_ultra_monthly',
    ultra_annual: 'price_et_ultra_annual',
  },
};

export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

/**
 * Create a Stripe Checkout Session via Supabase Edge Function
 * 
 * The Edge Function will:
 * 1. Create a Stripe Checkout Session with the correct price
 * 2. Include business_id and plan metadata
 * 3. Return the session URL for redirect
 */
export const createCheckoutSession = async (
  priceId: string,
  businessId: string,
  planId: string,
  billingCycle: BillingCycle = 'monthly',
  country: string = 'KE'
) => {
  try {
    // Build success and cancel URLs
    const origin = window.location.origin;
    const successUrl = `${origin}/app/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/app/subscription?canceled=true`;

    // Call Supabase Edge Function to create checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        priceId,
        businessId,
        planId,
        billingCycle,
        country,
        successUrl,
        cancelUrl,
      },
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(error.message || 'Failed to create checkout session');
    }

    if (!data?.url && !data?.sessionId) {
      throw new Error('No checkout session URL returned');
    }

    return {
      sessionId: data.sessionId,
      url: data.url,
    };
  } catch (error) {
    console.warn('Edge Function not available, using mock flow:', error);
    // Fallback to mock for demo/development
    return new Promise<{ sessionId: string; url?: string }>((resolve) => {
      setTimeout(() => {
        resolve({ sessionId: 'cs_test_mock_session_id' });
      }, 1000);
    });
  }
};

/**
 * Get the Stripe Price ID for a given plan and billing cycle
 */
export const getStripePriceId = (
  planKey: string,
  billingCycle: BillingCycle,
  country: string = 'KE'
): string => {
  const countryPrices = STRIPE_PRICE_IDS[country] || STRIPE_PRICE_IDS['KE'];
  const cycleKey = billingCycle === 'annual' ? 'annual' : 'monthly';
  const key = `${planKey.toLowerCase()}_${cycleKey}`;
  return countryPrices[key] || `price_${key}`;
};

/**
 * Redirect to Stripe Checkout
 */
export const redirectToCheckout = async (sessionId: string) => {
  const stripe = await stripePromise;
  if (!stripe) {
    throw new Error('Stripe failed to initialize');
  }

  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) {
    throw error;
  }
};
