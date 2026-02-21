import { useAuth } from "../contexts/AuthContext";
import { formatCurrency as format } from "../utils/currency";

export function useCurrency() {
  const { business } = useAuth();
  
  const currencyCode = business?.currency || "KES";

  const formatCurrency = (amount: number | string) => {
    return format(amount, currencyCode);
  };

  const getCurrencySymbol = () => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).formatToParts(0).find(part => part.type === 'currency')?.value || currencyCode;
    } catch (e) {
      return currencyCode;
    }
  };

  return {
    formatCurrency,
    currencyCode,
    currencySymbol: getCurrencySymbol(),
  };
}
