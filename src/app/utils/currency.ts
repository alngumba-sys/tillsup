/**
 * Currency Formatting Utility
 * 
 * Centralized currency formatting using Intl.NumberFormat
 * Supports dynamic currency codes based on business settings
 */

/**
 * Formats a number as currency
 * @param amount - The numeric amount to format
 * @param currencyCode - ISO 4217 currency code (default: "KES")
 * @returns Formatted currency string (e.g., "KES 1,250.00" or "$1,250.00")
 */
export function formatCurrency(amount: number | string, currencyCode: string = "KES"): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(0);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

/**
 * Formats a number as currency without the currency code/symbol
 * @param amount - The numeric amount to format
 * @returns Formatted number string (e.g., "1,250.00")
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}