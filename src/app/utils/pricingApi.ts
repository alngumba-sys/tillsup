/**
 * Pricing API - Single Source of Truth
 * 
 * Fetches subscription pricing from the platform_settings table in Supabase.
 * This is the ONLY place pricing data should be fetched from.
 * Super Admin Dashboard writes to this table; all frontend pages read from it.
 */

import { supabase } from "../../lib/supabase";
import { isPreviewMode } from "./previewMode";

export interface CountryPricing {
  basic_monthly: number;
  basic_quarterly: number;
  basic_annual: number;
  professional_monthly: number;
  professional_quarterly: number;
  professional_annual: number;
  ultra_monthly: number;
  ultra_quarterly: number;
  ultra_annual: number;
  quarterly_discount: number;
  annual_discount: number;
}

export type PricingData = Record<string, CountryPricing>;

const DEFAULT_PRICING: PricingData = {
  KE: {
    basic_monthly: 999,
    basic_quarterly: 2697,
    basic_annual: 9588,
    professional_monthly: 2499,
    professional_quarterly: 6747,
    professional_annual: 23988,
    ultra_monthly: 4999,
    ultra_quarterly: 13497,
    ultra_annual: 47988,
    quarterly_discount: 10,
    annual_discount: 20,
  },
  GH: {
    basic_monthly: 150,
    basic_quarterly: 405,
    basic_annual: 1440,
    professional_monthly: 350,
    professional_quarterly: 945,
    professional_annual: 3360,
    ultra_monthly: 700,
    ultra_quarterly: 1890,
    ultra_annual: 6720,
    quarterly_discount: 10,
    annual_discount: 20,
  },
  ET: {
    basic_monthly: 500,
    basic_quarterly: 1350,
    basic_annual: 4800,
    professional_monthly: 1200,
    professional_quarterly: 3240,
    professional_annual: 11520,
    ultra_monthly: 2500,
    ultra_quarterly: 6750,
    ultra_annual: 24000,
    quarterly_discount: 10,
    annual_discount: 20,
  },
};

/**
 * Fetch pricing data from the platform_settings table.
 * Returns the full pricing object for all countries.
 * Falls back to defaults if the table is empty or an error occurs.
 */
export async function fetchPricing(): Promise<PricingData> {
  // In preview mode, return defaults immediately
  if (isPreviewMode()) {
    return DEFAULT_PRICING;
  }

  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "subscription_pricing")
      .single();

    if (error) {
      console.warn("pricingApi: Failed to fetch pricing from Supabase, using defaults:", error.message);
      return DEFAULT_PRICING;
    }

    if (data?.value) {
      const parsed = JSON.parse(data.value) as PricingData;
      // Validate that KE data exists
      if (parsed.KE && parsed.KE.basic_monthly > 0) {
        return parsed;
      }
    }

    return DEFAULT_PRICING;
  } catch (err) {
    console.warn("pricingApi: Error fetching pricing, using defaults:", err);
    return DEFAULT_PRICING;
  }
}

/**
 * Get pricing for a specific country, with computed quarterly/annual from monthly.
 * This ensures consistency even if stored quarterly/annual values are stale.
 */
export function getCountryPricing(
  pricingData: PricingData,
  country: string
): CountryPricing {
  const data = pricingData[country] || pricingData["KE"] || DEFAULT_PRICING["KE"];
  const qDiscount = (data.quarterly_discount || 10) / 100;
  const aDiscount = (data.annual_discount || 20) / 100;

  return {
    basic_monthly: data.basic_monthly,
    basic_quarterly: Math.round(data.basic_monthly * 3 * (1 - qDiscount)),
    basic_annual: Math.round(data.basic_monthly * 12 * (1 - aDiscount)),
    professional_monthly: data.professional_monthly,
    professional_quarterly: Math.round(data.professional_monthly * 3 * (1 - qDiscount)),
    professional_annual: Math.round(data.professional_monthly * 12 * (1 - aDiscount)),
    ultra_monthly: data.ultra_monthly,
    ultra_quarterly: Math.round(data.ultra_monthly * 3 * (1 - qDiscount)),
    ultra_annual: Math.round(data.ultra_monthly * 12 * (1 - aDiscount)),
    quarterly_discount: data.quarterly_discount || 10,
    annual_discount: data.annual_discount || 20,
  };
}

/**
 * Get the monthly price for a given plan key (basic/professional/ultra) and country.
 */
export function getMonthlyPrice(
  pricingData: PricingData,
  country: string,
  planKey: "basic" | "professional" | "ultra"
): number {
  const countryPricing = getCountryPricing(pricingData, country);
  return countryPricing[`${planKey}_monthly`] || 0;
}

/**
 * Get the display price for a given plan, country, and billing cycle.
 */
export function getDisplayPrice(
  pricingData: PricingData,
  country: string,
  planKey: "basic" | "professional" | "ultra",
  billingCycle: "monthly" | "quarterly" | "annual"
): number {
  const countryPricing = getCountryPricing(pricingData, country);
  return countryPricing[`${planKey}_${billingCycle}`] || 0;
}

/**
 * Currency configuration per country
 */
export const COUNTRY_CONFIG: Record<string, { name: string; currency: string; symbol: string }> = {
  KE: { name: "Kenya", currency: "KES", symbol: "Kshs" },
  GH: { name: "Ghana", currency: "GHS", symbol: "GH₵" },
  ET: { name: "Ethiopia", currency: "ETB", symbol: "ETB" },
};

/**
 * Map from SubscriptionPlan key to internal pricing key
 */
export const PLAN_KEY_MAP: Record<string, "basic" | "professional" | "ultra"> = {
  Basic: "basic",
  Pro: "professional",
  Enterprise: "ultra",
};
