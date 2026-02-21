import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Phone,
  PackageX,
  Building2,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  FileText,
  ArrowRight,
  Plus,
  Trash2
} from "lucide-react";
import { useInventory } from "../contexts/InventoryContext";
import { useSupplier } from "../contexts/SupplierContext";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useSupplierRequest, CommunicationMethod } from "../contexts/SupplierRequestContext";
import { usePurchaseOrder, PurchaseOrderLineItem } from "../contexts/PurchaseOrderContext";
import { useSupplierManagement } from "../contexts/SupplierManagementContext";
import { useCurrency } from "../hooks/useCurrency";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export function SupplierRequests() {
  const navigate = useNavigate();
  const { user, business } = useAuth();
  const { branches, selectedBranchId, getBranchById } = useBranch();
  const { inventory, getLowStockProducts, isLowStock } = useInventory();
  const { suppliers, getSupplierById } = useSupplier();
  const { requests, addRequest, deleteRequest, getRecentRequests, updateRequestStatus } = useSupplierRequest();
  const { addPurchaseOrder } = usePurchaseOrder();
  const { formatCurrency, currencySymbol } = useCurrency();
  
  // Try to use the supplier management context if available (when inside SupplierManagement tabs)
  const supplierManagementContext = useSupplierManagement();

  // ═══════════════════════════════════════════════════════════════════
  // FORM STATE
  // ═══════════════════════════════════════════════════════════════════
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedBranchForRequest, setSelectedBranchForRequest] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [communicationMethods, setCommunicationMethods] = useState<CommunicationMethod[]>([]);
  const [viewingRequestId, setViewingRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("new-request");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // RBAC: Determine user's branch access
  // ═══════════════════════════════════════════════════════════════════
  const { canAccessAllBranches, lockedBranchId } = useMemo(() => {
    if (!user) return { canAccessAllBranches: false, lockedBranchId: undefined };

    const canAccessAllBranches = user.role === "Business Owner" || user.role === "Accountant";
    const lockedBranchId = user.role === "Manager" || user.role === "Staff" || user.role === "Cashier"
      ? user.branchId
      : undefined;

    return { canAccessAllBranches, lockedBranchId };
  }, [user]);

  // Set default branch for request
  useMemo(() => {
    if (lockedBranchId) {
      setSelectedBranchForRequest(lockedBranchId);
    } else if (selectedBranchId) {
      setSelectedBranchForRequest(selectedBranchId);
    }
  }, [lockedBranchId, selectedBranchId]);

  // ═══════════════════════════════════════════════════════════════════
  // GET LOW-STOCK PRODUCTS FOR SELECTED BRANCH
  // ═══════════════════════════════════════════════════════════════════
  const lowStockProducts = useMemo(() => {
    if (!selectedBranchForRequest) return [];
    return getLowStockProducts(selectedBranchForRequest);
  }, [selectedBranchForRequest, getLowStockProducts]);

  // ═══════════════════════════════════════════════════════════════════
  // FILTER SUPPLIERS BY SELECTED PRODUCT
  // ═══════════════════════════════════════════════════════════════════
  const availableSuppliers = useMemo(() => {
    if (!selectedProductId) return [];
    
    const product = inventory.find(p => p.id === selectedProductId);
    if (!product) return [];

    // Find suppliers that match the product's supplier name
    return suppliers.filter(s => 
      s.name.toLowerCase() === product.supplier.toLowerCase() ||
      s.businessId === business?.id
    );
  }, [selectedProductId, inventory, suppliers, business]);

  // ═══════════════════════════════════════════════════════════════════
  // SELECTED SUPPLIER DETAILS
  // ═══════════════════════════════════════════════════════════════════
  const selectedSupplier = useMemo(() => {
    return getSupplierById(selectedSupplierId);
  }, [selectedSupplierId, getSupplierById]);

  // ══════════════════════════���════════════════════════════════════════
  // CHECK AVAILABLE COMMUNICATION METHODS
  // ═══════════════════════════════════════════════════════════════════
  const availableMethods = useMemo(() => {
    if (!selectedSupplier) return { email: false, sms: false, whatsapp: false };

    return {
      email: !!selectedSupplier.email,
      sms: !!selectedSupplier.phone,
      whatsapp: !!selectedSupplier.phone && selectedSupplier.phone.startsWith("+254")
    };
  }, [selectedSupplier]);

  // ═══════════════════════════════════════════════════════════════════
  // GENERATE MESSAGE TEMPLATE
  // ═══════════════════════════════════════════════════════════════════
  const generatedMessage = useMemo(() => {
    if (!selectedProductId || !selectedBranchForRequest || !requestedQuantity) {
      return "";
    }

    const product = inventory.find(p => p.id === selectedProductId);
    const branch = getBranchById(selectedBranchForRequest);

    if (!product || !branch) return "";

    return `Hello,\n\nWe are running low on stock for the following item:\n\nProduct: ${product.name}\nCurrent Stock: ${product.stock} units\nRequested Quantity: ${requestedQuantity} units\nBranch: ${branch.name}\n\nPlease confirm availability and delivery timeline.\n\nBest regards,\n${business?.name || "Our Business"}`;
  }, [selectedProductId, selectedBranchForRequest, requestedQuantity, inventory, getBranchById, business]);

  // ═══════════════════════════════════════════════════════════════════
  // TOGGLE COMMUNICATION METHOD
  // ═══════════════════════════════════════════════════════════════════
  const toggleCommunicationMethod = (method: CommunicationMethod) => {
    setCommunicationMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // SEND SUPPLIER REQUEST
  // ═══════════════════════════════════════════════════════════════════
  const handleSendRequest = () => {
    // Validation
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    if (!selectedSupplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (!selectedBranchForRequest) {
      toast.error("Please select a branch");
      return;
    }

    if (!requestedQuantity || parseInt(requestedQuantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (communicationMethods.length === 0) {
      toast.error("Please select at least one communication method");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    // Get product and branch details
    const product = inventory.find(p => p.id === selectedProductId);
    const supplier = getSupplierById(selectedSupplierId);
    const branch = getBranchById(selectedBranchForRequest);

    if (!product || !supplier || !branch) {
      toast.error("Invalid selection");
      return;
    }

    // Create request
    addRequest({
      branchId: selectedBranchForRequest,
      branchName: branch.name,
      productId: selectedProductId,
      productName: product.name,
      supplierId: selectedSupplierId,
      supplierName: supplier.name,
      currentStock: product.stock,
      requestedQuantity: parseInt(requestedQuantity),
      communicationMethods,
      customMessage: customMessage || generatedMessage,
      createdByStaffId: user.id,
      createdByStaffName: `${user.firstName} ${user.lastName}`,
      createdByRole: user.role
    });

    toast.success("Supplier request sent successfully!", {
      description: `Request sent to ${supplier.name} via ${communicationMethods.join(", ")}`
    });

    // Reset form and go back to history
    setSelectedProductId("");
    setSelectedSupplierId("");
    setRequestedQuantity("");
    setCustomMessage("");
    setCommunicationMethods([]);
    setShowCreateForm(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // CONVERT TO PURCHASE ORDER
  // ═══════════════════════════════════════════════════════════════════
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingRequestId, setConvertingRequestId] = useState<string | null>(null);
  const [poExpectedDelivery, setPoExpectedDelivery] = useState("");
  const [poUnitCost, setPoUnitCost] = useState("");
  
  const handleConvertToPO = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    setConvertingRequestId(requestId);
    setConvertDialogOpen(true);
    
    // Set default delivery date to 7 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setPoExpectedDelivery(defaultDate.toISOString().split('T')[0]);
  };

  const handleConfirmConversion = () => {
    if (!convertingRequestId || !user || !business) return;

    const request = requests.find(r => r.id === convertingRequestId);
    if (!request) return;

    // Validation
    if (!poExpectedDelivery) {
      toast.error("Please select an expected delivery date");
      return;
    }

    // Find the product in inventory
    const product = inventory.find(p => p.id === request.productId && p.branchId === request.branchId);
    if (!product) {
      toast.error("Product not found in inventory");
      return;
    }

    // Get branch and supplier details
    const branch = getBranchById(request.branchId);
    const supplier = getSupplierById(request.supplierId);

    if (!branch || !supplier) {
      toast.error("Invalid branch or supplier");
      return;
    }

    // Parse unit cost if provided
    const unitCost = poUnitCost ? parseFloat(poUnitCost) : undefined;
    const totalCost = unitCost ? request.requestedQuantity * unitCost : undefined;

    // Create line item
    const lineItem: PurchaseOrderLineItem = {
      productId: product.id,
      productName: product.name,
      productSKU: product.sku,
      currentStock: product.stock,
      requestedQuantity: request.requestedQuantity,
      unitCost,
      totalCost
    };

    // Create the purchase order
    const poId = addPurchaseOrder({
      branchId: request.branchId,
      branchName: branch.name,
      supplierId: request.supplierId,
      supplierName: supplier.name,
      supplierContact: supplier.phone || supplier.email,
      items: [lineItem],
      expectedDeliveryDate: poExpectedDelivery,
      notes: `Converted from Supplier Request: ${request.id}\nOriginal Request Date: ${new Date(request.timestamp).toLocaleDateString()}\nRequested by: ${request.createdByStaffName}`,
      sourceRequestId: request.id,
      createdByStaffId: user.id,
      createdByStaffName: `${user.firstName} ${user.lastName}`,
      createdByRole: user.role
    });

    // Mark the supplier request as converted
    updateRequestStatus(request.id, "CONVERTED", {
      convertedToPOId: poId,
      convertedByStaffId: user.id,
      convertedByStaffName: `${user.firstName} ${user.lastName}`
    });

    toast.success("Purchase Order created successfully!", {
      description: `Request converted to PO. You can view it in the Purchase Orders tab.`
    });

    // Close dialog and reset
    setConvertDialogOpen(false);
    setConvertingRequestId(null);
    setPoExpectedDelivery("");
    setPoUnitCost("");
    
    // Switch to PO tab if inside SupplierManagement
    if (supplierManagementContext) {
      supplierManagementContext.switchTab("purchase-orders");
    }
  };

  // ═════════════════════════════��════════════════════════════════════
  // DELETE REQUEST
  // ═══════════════════════════════════════════════════════════════════
  const handleDeleteRequest = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    // Check if user can delete (creator or Business Owner)
    const canDelete = user?.role === "Business Owner" || request.createdByStaffId === user?.id;
    
    if (!canDelete) {
      toast.error("You don't have permission to delete this request");
      return;
    }

    // Confirm deletion
    if (confirm(`Are you sure you want to delete this request for ${request.productName}?`)) {
      deleteRequest(requestId);
      setViewingRequestId(null);
      toast.success("Request deleted successfully");
    }
  };

  // Check if user can convert to PO (Business Owner only)
  const canConvertToPO = user?.role === "Business Owner";

  // Get recent requests for display
  const recentRequests = useMemo(() => {
    return getRecentRequests(100); // Get up to 100 recent requests
  }, [getRecentRequests]);

  // Check if a product already has an active request
  const hasActiveRequest = (productId: string): boolean => {
    return requests.some(
      req => req.productId === productId && 
             req.conversionStatus === "REQUESTED" &&
             req.branchId === selectedBranchForRequest
    );
  };

  // Get existing request for a product
  const getExistingRequest = (productId: string): SupplierRequest | undefined => {
    return requests.find(
      req => req.productId === productId && 
             req.conversionStatus === "REQUESTED" &&
             req.branchId === selectedBranchForRequest
    );
  };

  // Check if selected product has an active request
  const selectedProductHasRequest = useMemo(() => {
    return selectedProductId ? hasActiveRequest(selectedProductId) : false;
  }, [selectedProductId, requests, selectedBranchForRequest]);

  const existingRequestForProduct = useMemo(() => {
    return selectedProductId ? getExistingRequest(selectedProductId) : undefined;
  }, [selectedProductId, requests, selectedBranchForRequest]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-1">Supplier Requests</h1>
        <p className="text-muted-foreground">
          Request low-stock inventory from suppliers via Email, SMS, or WhatsApp
        </p>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900">Low Stock Alert</h3>
                <p className="text-sm text-amber-800 mt-1">
                  You have <strong>{lowStockProducts.length}</strong> product(s) with low stock in the selected branch.
                  Use the create new request button to request replenishment from suppliers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conditional Content: Show Create Form or Request History/Detail */}
      {showCreateForm ? (
        /* Create Request Form */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Create Supplier Request</CardTitle>
                <CardDescription>
                  Select a low-stock product and send a request to the supplier
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Back to History
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Branch Selection (Owner only) */}
            {canAccessAllBranches && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={selectedBranchForRequest} onValueChange={setSelectedBranchForRequest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter(b => b.businessId === business?.id && b.status === "active")
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {branch.name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Locked Branch Display (for Staff/Manager) */}
            {lockedBranchId && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Branch: {getBranchById(lockedBranchId)?.name}
                      </p>
                      <p className="text-xs text-blue-700">
                        You can only create requests for your assigned branch
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Low-Stock Product *</Label>
              <Select 
                value={selectedProductId} 
                onValueChange={setSelectedProductId}
                disabled={!selectedBranchForRequest}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedBranchForRequest 
                      ? "Select branch first" 
                      : lowStockProducts.length === 0 
                      ? "No low-stock products" 
                      : "Select product"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {lowStockProducts.map((product) => {
                    const hasRequest = hasActiveRequest(product.id);
                    return (
                      <SelectItem 
                        key={product.id} 
                        value={product.id}
                        disabled={hasRequest}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className={hasRequest ? "opacity-50" : ""}>{product.name}</span>
                          {hasRequest ? (
                            <Badge variant="outline" className="ml-auto text-xs bg-blue-50 text-blue-700">
                              Request Pending
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="ml-auto">
                              {product.stock} units left
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {lowStockProducts.length === 0 && selectedBranchForRequest && (
                <p className="text-sm text-muted-foreground">
                  No low-stock products in this branch. All items are above threshold.
                </p>
              )}
              
              {/* Warning if product already has active request */}
              {selectedProductHasRequest && existingRequestForProduct && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-amber-900">Active Request Exists</p>
                        <p className="text-amber-800 mt-1">
                          This product already has a pending supplier request created on{" "}
                          {new Date(existingRequestForProduct.timestamp).toLocaleDateString()} by{" "}
                          {existingRequestForProduct.createdByStaffName}.
                        </p>
                        <p className="text-amber-800 mt-1">
                          Requested quantity: <strong>{existingRequestForProduct.requestedQuantity} units</strong>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select 
                value={selectedSupplierId} 
                onValueChange={setSelectedSupplierId}
                disabled={!selectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedProductId 
                      ? "Select product first" 
                      : availableSuppliers.length === 0 
                      ? "No suppliers available" 
                      : "Select supplier"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      <div className="space-y-1">
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{supplier.contactPerson}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier Contact Info */}
            {selectedSupplier && (
              <Card className="bg-gray-50">
                <CardContent className="p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Supplier Contact Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedSupplier.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedSupplier.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedSupplier.email || "N/A"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Requested Quantity */}
            <div className="space-y-2">
              <Label>Requested Quantity *</Label>
              <Input
                type="number"
                min="1"
                placeholder="Enter quantity to request"
                value={requestedQuantity}
                onChange={(e) => setRequestedQuantity(e.target.value)}
              />
            </div>

            {/* Communication Methods */}
            <div className="space-y-3">
              <Label>Communication Method(s) *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Email */}
                <Card 
                  className={`cursor-pointer transition-all ${
                    communicationMethods.includes("Email")
                      ? "border-primary bg-primary/5"
                      : "hover:border-gray-400"
                  } ${!availableMethods.email ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => availableMethods.email && toggleCommunicationMethod("Email")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Mail className={`w-5 h-5 ${communicationMethods.includes("Email") ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1">
                        <p className="font-medium">Email</p>
                        {!availableMethods.email && (
                          <p className="text-xs text-red-600">No email available</p>
                        )}
                      </div>
                      {communicationMethods.includes("Email") && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* SMS */}
                <Card 
                  className={`cursor-pointer transition-all ${
                    communicationMethods.includes("SMS")
                      ? "border-primary bg-primary/5"
                      : "hover:border-gray-400"
                  } ${!availableMethods.sms ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => availableMethods.sms && toggleCommunicationMethod("SMS")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Phone className={`w-5 h-5 ${communicationMethods.includes("SMS") ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1">
                        <p className="font-medium">SMS</p>
                        {!availableMethods.sms && (
                          <p className="text-xs text-red-600">No phone available</p>
                        )}
                      </div>
                      {communicationMethods.includes("SMS") && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp */}
                <Card 
                  className={`cursor-pointer transition-all ${
                    communicationMethods.includes("WhatsApp")
                      ? "border-primary bg-primary/5"
                      : "hover:border-gray-400"
                  } ${!availableMethods.whatsapp ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => availableMethods.whatsapp && toggleCommunicationMethod("WhatsApp")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MessageSquare className={`w-5 h-5 ${communicationMethods.includes("WhatsApp") ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1">
                        <p className="font-medium">WhatsApp</p>
                        {!availableMethods.whatsapp && (
                          <p className="text-xs text-red-600">Not supported</p>
                        )}
                      </div>
                      {communicationMethods.includes("WhatsApp") && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Message Template */}
            <div className="space-y-2">
              <Label>Message (Optional - Auto-generated)</Label>
              <Textarea
                placeholder={generatedMessage || "Message will be auto-generated based on your selections"}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {customMessage ? "Using custom message" : "Using auto-generated message template"}
              </p>
            </div>

            {/* Send Button */}
            <Button 
              onClick={handleSendRequest} 
              className="w-full gap-2"
              size="lg"
              disabled={
                !selectedProductId || 
                !selectedSupplierId || 
                !requestedQuantity || 
                communicationMethods.length === 0
              }
            >
              <Send className="w-5 h-5" />
              Send Request to Supplier
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Request History and Detail Views */
        viewingRequestId ? (
          /* Request Detail View */
          (() => {
            const request = requests.find(r => r.id === viewingRequestId);
            if (!request) return null;

            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Request Details</CardTitle>
                      <CardDescription>Request ID: {request.id}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setViewingRequestId(null)}
                    >
                      Back to List
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Request Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Product</Label>
                        <p className="text-lg font-semibold">{request.productName}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Supplier</Label>
                        <p className="text-lg font-semibold">{request.supplierName}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Branch</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium">{request.branchName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Current Stock</Label>
                        <p className="text-lg font-semibold">{request.currentStock} units</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Requested Quantity</Label>
                        <p className="text-lg font-semibold text-primary">{request.requestedQuantity} units</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Date Created</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium">{new Date(request.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Communication Methods */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Communication Methods</Label>
                    <div className="flex gap-2 mt-2">
                      {request.communicationMethods.map(method => (
                        <Badge key={method} variant="outline" className="text-sm">
                          {method === "Email" && <Mail className="w-4 h-4 mr-1" />}
                          {method === "SMS" && <Phone className="w-4 h-4 mr-1" />}
                          {method === "WhatsApp" && <MessageSquare className="w-4 h-4 mr-1" />}
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Request Status</Label>
                      <div className="mt-2">
                        {request.status === "Sent" && (
                          <Badge className="bg-green-100 text-green-700 border-green-300">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Sent
                          </Badge>
                        )}
                        {request.status === "Failed" && (
                          <Badge variant="destructive">
                            <XCircle className="w-4 h-4 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Conversion Status</Label>
                      <div className="mt-2">
                        {request.conversionStatus === "REQUESTED" && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            <Info className="w-4 h-4 mr-1" />
                            Requested
                          </Badge>
                        )}
                        {request.conversionStatus === "CONVERTED" && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                            <FileText className="w-4 h-4 mr-1" />
                            Converted to PO
                          </Badge>
                        )}
                        {request.conversionStatus === "CANCELLED" && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancelled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Message Sent</Label>
                    <Card className="mt-2 bg-gray-50">
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-line font-mono">{request.customMessage}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Created By */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Created By</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{request.createdByStaffName}</p>
                        <p className="text-sm text-muted-foreground">{request.createdByRole}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t flex gap-3">
                    {canConvertToPO && request.conversionStatus === "REQUESTED" && (
                      <Button
                        onClick={() => handleConvertToPO(request.id)}
                        className="gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <ArrowRight className="w-4 h-4" />
                        Convert to Purchase Order
                      </Button>
                    )}
                    
                    {/* Delete Button - available to creator or business owner */}
                    {(user?.role === "Business Owner" || request.createdByStaffId === user?.id) && (
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteRequest(request.id)}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Request
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()
        ) : (
          /* Request List View */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Request History</CardTitle>
                  <CardDescription>Click on any request to view details</CardDescription>
                </div>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Request
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Existing Requests */}
                  {recentRequests.map((request) => (
                    <Button
                      key={request.id}
                      variant="outline"
                      className="h-auto p-0 hover:border-primary"
                      onClick={() => setViewingRequestId(request.id)}
                    >
                      <Card className="w-full border-0 shadow-none">
                        <CardContent className="p-4 space-y-3">
                          {/* Header with Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{request.productName}</p>
                              <p className="text-xs text-muted-foreground truncate">{request.supplierName}</p>
                            </div>
                            {request.status === "Sent" ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            )}
                          </div>

                          {/* Branch and Quantity */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              <span className="truncate">{request.branchName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <PackageX className="w-3 h-3 text-muted-foreground" />
                              <span className="font-semibold text-primary">{request.requestedQuantity} units</span>
                            </div>
                          </div>

                          {/* Communication Methods */}
                          <div className="flex gap-1 flex-wrap">
                            {request.communicationMethods.map(method => (
                              <Badge key={method} variant="secondary" className="text-xs">
                                {method === "Email" && <Mail className="w-3 h-3 mr-1" />}
                                {method === "SMS" && <Phone className="w-3 h-3 mr-1" />}
                                {method === "WhatsApp" && <MessageSquare className="w-3 h-3 mr-1" />}
                                {method}
                              </Badge>
                            ))}
                          </div>

                          {/* Date and Conversion Status */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              {new Date(request.timestamp).toLocaleDateString()}
                            </span>
                            {request.conversionStatus === "CONVERTED" && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                <FileText className="w-3 h-3 mr-1" />
                                PO
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <PackageX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No supplier requests found</p>
                  <p className="text-sm mt-1">Create your first request using the New Request tab</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      )}

      {/* Convert to PO Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby="convert-dialog-description">
          <DialogHeader>
            <DialogTitle>Convert to Purchase Order</DialogTitle>
            <DialogDescription id="convert-dialog-description">
              Convert the selected supplier request to a purchase order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>Expected Delivery Date *</Label>
              <Input
                type="date"
                value={poExpectedDelivery}
                onChange={(e) => setPoExpectedDelivery(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={`Enter unit cost in ${currencySymbol}`}
                value={poUnitCost}
                onChange={(e) => setPoUnitCost(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                You can add pricing details now or later in the Purchase Order
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConvertDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmConversion}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}