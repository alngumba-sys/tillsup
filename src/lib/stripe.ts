import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Replace with your Stripe publishable key
// This is a test key, so it's safe to expose in client-side code for development
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Sh8LJI6WxkLq2cecJMD2D6fXelCGhVrkO2bSBWPskEbEgBrSLkSaTo5VWBZrcd48sTFqTSbs9jaXluihQ7iveK100sW72eK4N'; 

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

export const createCheckoutSession = async (priceId: string, customerId?: string) => {
  // In a full-stack environment with Supabase Edge Functions deployed:
  /*
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId, customerId },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("Edge Function not deployed, falling back to mock.");
  }
  */

  // For this frontend-only demo, we immediately return a mock session
  // This prevents "FunctionsFetchError" from appearing in the console
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ sessionId: 'cs_test_mock_session_id' });
    }, 1000);
  });
};
