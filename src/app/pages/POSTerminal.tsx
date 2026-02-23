import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "../components/ui/sheet";
import { Search, ShoppingCart, AlertTriangle, Package, Building2 } from "lucide-react";
import { SuccessCard } from "../components/SuccessCard";
import { FiscalReceipt } from "../components/FiscalReceipt";
import { useKPI } from "../contexts/KPIContext";
import { useInventory } from "../contexts/InventoryContext";
import { useSales } from "../contexts/SalesContext";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useCategory } from "../contexts/CategoryContext";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useCurrency } from "../hooks/useCurrency";
import { useSubscription } from "../hooks/useSubscription";
import { CartPanel } from "../components/pos/CartPanel";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { SchemaError } from "../components/inventory/SchemaError";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  branchId: string;
  // ═══════════════════════════════════════════════════════════════════
  // PRICING EXTENSION - Multi-tier pricing support
  // ═══════════════════════════════════════════════════════════════════
  costPrice?: number;
  retailPrice?: number; // Defaults to 'price' if not set
  wholesalePrice?: number; // Optional bulk/wholesale price
}

interface CartItem extends Product {
  quantity: number;
  // ═══════════════════════════════════════════════════════════════════
  // PRICING EXTENSION - Track selected price tier
  // ══════════════════════════════════════════════════════════════════��
  selectedPrice: number; // The actual price being used for this cart item
  priceType: "retail" | "wholesale"; // Which price tier was selected
}

/**
 * POSTerminal Component
 * Main point-of-sale interface for processing transactions
 */
export function POSTerminal() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSale, setLastSale] = useState({ total: 0, itemCount: 0 });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFiscalReceiptOpen, setIsFiscalReceiptOpen] = useState(false);
  const [generateFiscalReceipt, setGenerateFiscalReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");
  
  const { updateKPIs } = useKPI();
  const { inventory, deductMultipleStock } = useInventory();
  const { recordSale } = useSales();
  const { user, business } = useAuth();
  const { formatCurrency } = useCurrency();
  const { selectedBranchId, branches, setSelectedBranchId, error: branchError } = useBranch();
  const { activeCategories, error: categoryError } = useCategory();
  const { hasFeature, plan } = useSubscription();
  const navigate = useNavigate();
  
  // ═══════════════������═════════════════════════════════════════════════
  // STEP 2.1: BRANCH CONTEXT LOADING
  // ═══════════════════════════════════════���═══════════════════════════
  // Determine active branch ID based on user role
  const getActiveBranchId = (): string | null => {
    // Staff, Manager, and Cashier: auto-locked to assigned branch
    if (user?.branchId) {
      return user.branchId;
    }
    // Business Owner: must select branch manually
    if (user?.role === "Business Owner") {
      return selectedBranchId || null;
    }
    return null;
  };

  const activeBranchId = getActiveBranchId();
  const activeBranch = branches.find(b => b.id === activeBranchId);
  
  // Check if POS is ready (branch context exists)
  const isPOSReady = !!activeBranchId;
  
  // Check if user can change branch (only Business Owner can change)
  const canChangeBranch = user?.role === "Business Owner";

  const isFullPOS = hasFeature("fullPOS");

  // ═══════════════════════════════════════════════════════════════════
  // STRICT POS INVENTORY FILTERING BY ACTIVE BRANCH
  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: STRICT INVENTORY FILTER RULE
  // 
  // Rule: LOAD products ONLY WHERE inventory.branchId === activeBranchId
  // NO EXCEPTIONS. NO FALLBACKS. NO MERGING.
  // 
  // - If branch has NO inventory → Show EMPTY state
  // - If branch has inventory → Show ONLY that branch's products
  // - Main branch products NEVER leak to other branches
  // - Each branch is completely isolated
  // ═══════════════════════════════════════════════════════════════════
  const products: Product[] = inventory
    .filter(item => {
      // CRITICAL: Only show products from the active branch
      // If no active branch, show nothing
      if (!activeBranchId) return false;
      
      // STRICT FILTER: Product must belong to active branch
      // This ensures zero cross-branch inventory leakage
      return item.branchId === activeBranchId;
    })
    .map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      stock: item.stock,
      branchId: item.branchId,
      image: item.image,
      // PRICING EXTENSION: Include new pricing fields
      costPrice: item.costPrice,
      retailPrice: item.retailPrice || item.price, // Default to legacy price
      wholesalePrice: item.wholesalePrice
    }));
  
  console.log('📦 Filtered products count:', products.length);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    // Fix: selectedCategory now stores the Category ID (or "All"), and product.category is the Category ID.
    // This allows direct comparison.
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    // ═══════════════════════════════════════════════════════════════════
    // PLAN LIMITS CHECK
    // ═══════════════════════════════════════════════════════════════════
    // "Free Trial" users have basic POS (limited features)
    // "Basic" and up have full POS
    // Here we can limit advanced features like wholesale pricing or customer assignment if needed
    // For now, if fullPOS is false, we might restrict adding items or showing advanced pricing
    // But since basicPOS is true for everyone, we allow adding items.
    
    // Example: Only Full POS can use wholesale pricing
    
    // ═══════════════════════════════════════════════════════════════════
    // STEP 2.6: PREVENT ACTIONS WITHOUT BRANCH CONTEXT
    // ═══════════════════════════════════════════════════════════════════
    if (!isPOSReady) {
      return; // Silently prevent adding to cart
    }

    // ═══════════════════════════════════════════════════════════════════
    // BRANCH STATUS VALIDATION - Prevent cart operations on deactivated branches
    // ═══════════════════════════════════════════════════════════════════
    if (isBranchDeactivated) {
      return; // Silently prevent adding to cart for deactivated branches
    }
    
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        )
      );
    } else {
      // ═══════════════════════════════════════════════════════════════════
      // PRICING EXTENSION: Determine default price and type
      // ═══════════════════════════════════════════════════════════════════
      // Default to retail price (always the default selection)
      const retailPrice = product.retailPrice || product.price;
      const selectedPrice = retailPrice;
      const priceType = "retail" as const;
      
      setCart([...cart, { 
        ...product, 
        quantity: 1,
        selectedPrice,
        priceType
      }]);
    }
  };

  const updateQuantity = useCallback((productId: string, change: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === productId) {
            const newQuantity = item.quantity + change;
            return { ...item, quantity: Math.max(0, Math.min(newQuantity, item.stock)) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // PRICING EXTENSION: Handle price tier change for cart item
  // ═══════════════════════════════════════════════════════════════════
  const updatePriceTier = useCallback((productId: string, newPriceType: "retail" | "wholesale") => {
    // Check if fullPOS feature is enabled for wholesale pricing
    if (newPriceType === "wholesale" && !isFullPOS) {
      toast.error("Feature Locked", {
        description: `Wholesale pricing is not available on your ${plan.name} plan.`,
        action: {
          label: "Upgrade",
          onClick: () => navigate("/app/subscription")
        }
      });
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId) {
          const selectedPrice = newPriceType === "retail" 
            ? (item.retailPrice || item.price)
            : (item.wholesalePrice || item.retailPrice || item.price);
          
          return {
            ...item,
            selectedPrice,
            priceType: newPriceType
          };
        }
        return item;
      })
    );
  }, [isFullPOS, plan, navigate]);

  const handleGenerateFiscalReceiptChange = useCallback((checked: boolean) => {
    // Only available on Basic plan and up (Full POS) - debatable, maybe receipt is basic?
    // Let's assume fiscal receipt generation is advanced.
    if (checked && !isFullPOS) {
       // Allow it for now, as receipt is basic functionality usually
    }
    setGenerateFiscalReceipt(checked);
  }, [isFullPOS]);

  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + item.selectedPrice * item.quantity, 0),
    [cart]
  );
  const tax = useMemo(() => subtotal * 0.16, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const handleCheckout = useCallback(async () => {
    // Clear any previous validation errors
    setValidationError(null);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2.3 & 2.6: STRICT BRANCH VALIDATION
    // ══════════════════════════════════════════════════════════════════
    // CRITICAL: Prevent any sale without branch context
    if (!activeBranchId) {
      setValidationError("Cannot process sale: Branch context is missing. Please select a branch.");
      return;
    }

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // STEP 1: Prepare inventory deduction data
    const stockDeductions = cart.map(item => ({
      productId: item.id,
      quantity: item.quantity
    }));

    // STEP 2: Attempt to deduct inventory (with validation)
    const result = await deductMultipleStock(stockDeductions);

    // STEP 3: Handle validation failures
    if (!result.success) {
      setValidationError(result.errors ? result.errors.join(", ") : "Unknown error occurred");
      return; // Block checkout if validation fails
    }

    // STEP 4: Inventory deduction succeeded - proceed with checkout
    // Capture cart data before clearing (for fiscal receipt)
    // ══════════════════════════════════════════════════════════════════
    // PRICING EXTENSION: Use selectedPrice and include priceType
    // ════════════════════════════════════════���══════════════════════════
    const saleItems = cart.map(item => ({
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.selectedPrice, // Use the selected price tier
      totalPrice: item.selectedPrice * item.quantity,
      priceType: item.priceType, // Track which price tier was used
      costPrice: item.costPrice // Track purchase price for COGS calculation
    }));

    // Record the sale with complete details
    const saleResult = await recordSale({
      items: saleItems,
      subtotal,
      tax,
      total,
      customerCount: 1, // Each transaction counts as 1 customer
      businessId: business!.id,
      branchId: activeBranchId, // MANDATORY branch ID
      staffId: user!.id,
      staffRole: user!.role,
      staffName: `${user!.firstName} ${user!.lastName}`,
      // ═══════════════════════════════════════════════════════════════════
      // CUSTOMER NAME - Propagate to frontend state for visibility
      // ═══════════════════════════════════════════════════════════════════
      customerName: customerName.trim() || undefined
    });
    
    // Update KPIs (will be auto-synced by KPISynchronizer)
    updateKPIs(1, total);
    
    // STEP 5: Generate fiscal receipt data if enabled
    if (generateFiscalReceipt) {
      // Use sequential readableId if available, otherwise generate a fallback
      const receiptNumber = saleResult.readableId 
        ? `#${saleResult.readableId.toString().padStart(5, '0')}`
        : `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
      setReceiptData({
        receiptNumber,
        date: new Date(),
        items: saleItems,
        subtotal,
        tax,
        total,
        cashierName: `${user!.firstName} ${user!.lastName}`,
        businessName: business!.name,
        businessAddress: business!.address || undefined,
        paymentMethod: "Cash", // Can be extended later
        customerName: customerName.trim() || undefined, // Include customer name if provided
      });
      // Show fiscal receipt modal after checkout success
      setIsFiscalReceiptOpen(true);
      // Reset the toggle for next transaction
      setGenerateFiscalReceipt(false);
    }
    
    // Save sale details and show success
    setLastSale({ total, itemCount });
    setShowSuccess(true);
    
    // Clear cart AND customer name ONLY AFTER inventory update completes
    setCart([]);
    setCustomerName("");
    setIsCartOpen(false);
  }, [activeBranchId, cart, customerName, deductMultipleStock, recordSale, subtotal, tax, total, business, user, updateKPIs, generateFiscalReceipt]);

  // CartPanel logic moved to components/pos/CartPanel.tsx

  // ═══════════════════════════════════════════════════════════════════
  // BRANCH STATUS VALIDATION - POS SALES HARD BLOCK
  // ═══════════════════════════════════════════════════════════════════
  // Check if current branch is deactivated
  const isBranchDeactivated = useMemo(() => {
    if (!activeBranchId || !activeBranch) return false;
    return activeBranch.status === "inactive";
  }, [activeBranchId, activeBranch]);

  return (
    <div className="flex min-h-full relative">
      {/* ═══════════════════════════════════════════════════════════════════
          BRANCH DEACTIVATED OVERLAY - ROLE-AWARE BLOCKING
          ═══════════════════════════════════════════════════════════════════
          
          CRITICAL DIFFERENTIATION:
          - Business Owner: Non-blocking warning (can switch branches)
          - Staff/Manager: Full screen block (should never reach here due to login blocking)
          
          ═════════════��═════════════════════════════════════════════════════ */}
      {isBranchDeactivated && user?.role !== "Business Owner" && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl border-red-200">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-900 mb-2">
                  Sales Disabled
                </h2>
                <p className="text-red-700 font-medium">
                  Branch Deactivated
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-900">
                  This branch has been deactivated by the business owner.
                  All sales operations are disabled.
                </p>
              </div>
              <div className="text-xs text-red-600">
                Contact the business owner to reactivate this branch.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        {/* Schema Error Display */}
        {(categoryError || branchError) && <div className="p-4 bg-white border-b"><SchemaError error={categoryError || branchError} /></div>}

        <div className="p-4 lg:p-6 border-b border-border bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl">POS Terminal</h1>
            
            {/* ═══════════════════════════════════════════════════════════════════
                STEP 2.2: OWNER BRANCH SELECTION
                ═══════════════════════════════════════════════════════════════════ */}
            {/* Branch Selector for Business Owner */}
            {user?.role === "Business Owner" && branches.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <Select
                  value={selectedBranchId || ""}
                  onValueChange={(value) => {
                    // ═══════════════════════════════════════════════════════════════════
                    // STEP 2.5: ROLE-BASED POS RESTRICTIONS
                    // ═══════════════════════════════════════════════════════════════════
                    // Owner can change branch, but cart must be cleared first
                    setSelectedBranchId(value);
                    // Clear cart when switching branches to prevent cross-branch sales
                    setCart([]);
                    setValidationError(null);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          {branch.name}
                          {branch.status === "inactive" && (
                            <Badge variant="destructive" className="text-xs">
                              Deactivated
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* ═══════════════════════════════════════════════════════════════════
                STEP 2.5: BRANCH LOCKED FOR NON-OWNERS
                ══════════════════════════════════════════════════════════════════ */}
            {/* Branch Indicator for Staff/Manager/Cashier (LOCKED) */}
            {(user?.role === "Manager" || user?.role === "Staff" || user?.role === "Cashier") && user?.branchId && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {branches.find(b => b.id === user.branchId)?.name || "Your Branch"}
                </span>
                <Badge variant="outline" className="text-xs">
                  Locked
                </Badge>
              </div>
            )}
          </div>

          {/* Search and Categories */}
          <div className="space-y-4">
            {/* ═══════════════════════════════════════════════════════════════════
                BUSINESS OWNER WARNING - DEACTIVATED BRANCH (NON-BLOCKING)
                ═══════════════════════════════════════════════════════════════════ */}
            {isBranchDeactivated && user?.role === "Business Owner" && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Branch Deactivated</AlertTitle>
                <AlertDescription className="text-amber-800">
                  Sales are disabled for this branch. You may switch to another active branch using the dropdown above.
                </AlertDescription>
              </Alert>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                DYNAMIC CATEGORY FILTERS - DATA-DRIVEN FROM CATEGORY MANAGEMENT
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {/* Always show "All" first */}
              <Badge
                variant={selectedCategory === "All" ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedCategory("All")}
              >
                All
              </Badge>
              
              {/* Render active categories from Category Management */}
              {activeCategories.map((category) => (
                <Badge
                  key={category.id}
                  // Fix: Use category.id for comparison and selection, not category.name
                  // product.category stores the Category ID (UUID), so filtering must match UUIDs.
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-6">
          {/* ══════════════════════════════════════════════════════════════════
              STEP 4: UI CONFIRMATION - Active Branch Badge Near Product Grid
              ══════════════════════════════════════════════════════════════════ */}
          {isPOSReady && activeBranch && (
            <div className="mb-4 flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Showing Inventory For</p>
                  <p className="text-base font-bold text-blue-900">{activeBranch.name}</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                {products.length} {products.length === 1 ? 'product' : 'products'}
              </Badge>
            </div>
          )}
          
          {/* Branch Selection Required Alert for Business Owner */}
          {user?.role === "Business Owner" && !selectedBranchId && (
            <Alert className="mb-4">
              <Building2 className="h-4 w-4" />
              <AlertTitle>Branch Selection Required</AlertTitle>
              <AlertDescription>
                Please select a branch from the dropdown above to view and sell products.
              </AlertDescription>
            </Alert>
          )}
          
          {/* ═══════════════════════════════════════════════════════════════════
              STEP 2: EMPTY BRANCH HANDLING
              ═══════════════════════════════════════════════════════════════════ */}
          {/* Product Grid */}
          {filteredProducts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4">
                    <div className="relative aspect-square bg-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-12 h-12 text-slate-400" />
                      )}
                      <Badge 
                        variant={product.stock > 10 ? "secondary" : "destructive"} 
                        className={`absolute top-2 right-2 text-[10px] shadow-sm backdrop-blur-sm ${product.stock > 10 ? "bg-white/90 hover:bg-white text-slate-700" : ""}`}
                      >
                        {product.stock} left
                      </Badge>
                    </div>
                    <h4 className="font-medium mb-1 line-clamp-1 text-[14px]">{product.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[16px]">{formatCurrency(product.price)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Empty State: No Products in Selected Branch */}
          {filteredProducts.length === 0 && isPOSReady && activeBranch && (
            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Package className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No Products Available
                </h3>
                <p className="text-slate-600 mb-1">
                  The <span className="font-semibold text-slate-900">"{activeBranch.name}"</span> branch has no inventory yet.
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  Add products to this branch from the Inventory page to start selling.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-medium text-amber-900">
                    Products from other branches will NOT appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mobile Cart Button */}
        <div className="lg:hidden p-4 border-t border-border bg-white sticky bottom-0">
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button className="w-full" size="lg">
                <ShoppingCart className="w-5 h-5 mr-2" />
                View Cart ({cart.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Shopping Cart</SheetTitle>
                <SheetDescription>Review your current order items</SheetDescription>
              </SheetHeader>
              <CartPanel
                isPOSReady={isPOSReady}
                activeBranch={activeBranch}
                canChangeBranch={canChangeBranch}
                validationError={validationError}
                cart={cart}
                removeFromCart={removeFromCart}
                updatePriceTier={updatePriceTier}
                updateQuantity={updateQuantity}
                subtotal={subtotal}
                tax={tax}
                total={total}
                customerName={customerName}
                setCustomerName={setCustomerName}
                generateFiscalReceipt={generateFiscalReceipt}
                handleGenerateFiscalReceiptChange={handleGenerateFiscalReceiptChange}
                handleCheckout={handleCheckout}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Cart Panel */}
      <div className="hidden lg:block w-96 border-l border-border bg-white sticky top-0 h-[calc(100vh-4rem)]">
        <CartPanel
          isPOSReady={isPOSReady}
          activeBranch={activeBranch}
          canChangeBranch={canChangeBranch}
          validationError={validationError}
          cart={cart}
          removeFromCart={removeFromCart}
          updatePriceTier={updatePriceTier}
          updateQuantity={updateQuantity}
          subtotal={subtotal}
          tax={tax}
          total={total}
          customerName={customerName}
          setCustomerName={setCustomerName}
          generateFiscalReceipt={generateFiscalReceipt}
          handleGenerateFiscalReceiptChange={handleGenerateFiscalReceiptChange}
          handleCheckout={handleCheckout}
        />
      </div>

      {/* Success Card */}
      {showSuccess && (
        <SuccessCard
          total={lastSale.total}
          itemCount={lastSale.itemCount}
          onDismiss={() => setShowSuccess(false)}
        />
      )}

      {/* Fiscal Receipt */}
      {isFiscalReceiptOpen && receiptData && (
        <FiscalReceipt
          isOpen={isFiscalReceiptOpen}
          onClose={() => setIsFiscalReceiptOpen(false)}
          receiptData={receiptData}
        />
      )}
    </div>
  );
}