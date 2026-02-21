export interface Country {
  name: string;
  code: string;
  currency: string;
  symbol: string;
}

export const COUNTRIES: Country[] = [
  { name: "Kenya", code: "KE", currency: "KES", symbol: "KSh" },
  { name: "United States", code: "US", currency: "USD", symbol: "$" },
  { name: "United Kingdom", code: "GB", currency: "GBP", symbol: "£" },
  { name: "Europe", code: "EU", currency: "EUR", symbol: "€" },
  { name: "South Africa", code: "ZA", currency: "ZAR", symbol: "R" },
  { name: "Nigeria", code: "NG", currency: "NGN", symbol: "₦" },
  { name: "India", code: "IN", currency: "INR", symbol: "₹" },
  { name: "Canada", code: "CA", currency: "CAD", symbol: "$" },
  { name: "Australia", code: "AU", currency: "AUD", symbol: "$" },
  { name: "Japan", code: "JP", currency: "JPY", symbol: "¥" },
  { name: "China", code: "CN", currency: "CNY", symbol: "¥" },
  { name: "Brazil", code: "BR", currency: "BRL", symbol: "R$" },
  { name: "Mexico", code: "MX", currency: "MXN", symbol: "$" },
  { name: "Russia", code: "RU", currency: "RUB", symbol: "₽" },
  { name: "South Korea", code: "KR", currency: "KRW", symbol: "₩" },
  { name: "Saudi Arabia", code: "SA", currency: "SAR", symbol: "﷼" },
  { name: "United Arab Emirates", code: "AE", currency: "AED", symbol: "د.إ" },
  { name: "Turkey", code: "TR", currency: "TRY", symbol: "₺" },
  { name: "Indonesia", code: "ID", currency: "IDR", symbol: "Rp" },
  { name: "Malaysia", code: "MY", currency: "MYR", symbol: "RM" },
  { name: "Singapore", code: "SG", currency: "SGD", symbol: "$" },
  { name: "Thailand", code: "TH", currency: "THB", symbol: "฿" },
  { name: "Vietnam", code: "VN", currency: "VND", symbol: "₫" },
  { name: "Philippines", code: "PH", currency: "PHP", symbol: "₱" },
  { name: "Egypt", code: "EG", currency: "EGP", symbol: "E£" },
  { name: "Pakistan", code: "PK", currency: "PKR", symbol: "₨" },
  { name: "Bangladesh", code: "BD", currency: "BDT", symbol: "৳" },
  { name: "New Zealand", code: "NZ", currency: "NZD", symbol: "$" },
  { name: "Switzerland", code: "CH", currency: "CHF", symbol: "Fr" },
  { name: "Sweden", code: "SE", currency: "SEK", symbol: "kr" },
  { name: "Norway", code: "NO", currency: "NOK", symbol: "kr" },
  { name: "Denmark", code: "DK", currency: "DKK", symbol: "kr" },
  { name: "Poland", code: "PL", currency: "PLN", symbol: "zł" },
  { name: "Argentina", code: "AR", currency: "ARS", symbol: "$" },
  { name: "Chile", code: "CL", currency: "CLP", symbol: "$" },
  { name: "Colombia", code: "CO", currency: "COP", symbol: "$" },
  { name: "Peru", code: "PE", currency: "PEN", symbol: "S/" },
  { name: "Israel", code: "IL", currency: "ILS", symbol: "₪" },
  { name: "Ghana", code: "GH", currency: "GHS", symbol: "₵" },
  { name: "Ethiopia", code: "ET", currency: "ETB", symbol: "Br" },
  { name: "Tanzania", code: "TZ", currency: "TZS", symbol: "TSh" },
  { name: "Uganda", code: "UG", currency: "UGX", symbol: "USh" },
  { name: "Rwanda", code: "RW", currency: "RWF", symbol: "FRw" }
].sort((a, b) => a.name.localeCompare(b.name));
