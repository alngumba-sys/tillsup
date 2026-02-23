import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MessageSquare,
  Building2,
  User,
  Calendar,
  Package,
  DollarSign,
  Trash2,
  Eye,
  AlertCircle,
  Truck,
  ClipboardCheck,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useInventory } from "../contexts/InventoryContext";
import { useSupplier } from "../contexts/SupplierContext";
import { usePurchaseOrder, PurchaseOrderLineItem, POStatus, CommunicationMethod } from "../contexts/PurchaseOrderContext";
import { useSupplierRequest, SupplierRequest } from "../contexts/SupplierRequestContext";
import { useSupplierManagement } from "../contexts/SupplierManagementContext";
import { useCurrency } from "../hooks/useCurrency";
import { toast } from "sonner";

export function PurchaseOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, business } = useAuth();
  const { branches, selectedBranchId, getBranchById } = useBranch();
  const { inventory } = useInventory();
  const { suppliers, getSupplierById } = useSupplier();
  const {
    purchaseOrders,
    addPurchaseOrder,
    sendPurchaseOrder,
    approvePurchaseOrder,
    cancelPurchaseOrder,
    getNextPONumber
  } = usePurchaseOrder();
  const { updateRequestStatus } = useSupplierRequest();
  const { formatCurrency, currencySymbol } = useCurrency();
  
  // Try to use the supplier management context if available (when inside SupplierManagement tabs)
  const supplierManagementContext = useSupplierManagement();

  // ════════════════════════════════════════════════════════���══════════
  // VIEW STATE
  // ═══════════════════════════════════════════════════════════════════
  const [activeTab, setActiveTab] = useState("list");
  const [selectedPO, setSelectedPO] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // FORM STATE
  // ═══════════════════════════════════════════════════════════════════
  const [formBranchId, setFormBranchId] = useState("");
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formExpectedDelivery, setFormExpectedDelivery] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [lineItems, setLineItems] = useState<PurchaseOrderLineItem[]>([]);

  // Current line item being added
  const [currentProductId, setCurrentProductId] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [currentUnitCost, setCurrentUnitCost] = useState("");

  // Send dialog state
  const [sendMethods, setSendMethods] = useState<CommunicationMethod[]>([]);

  // Cancel dialog state
  const [cancelReason, setCancelReason] = useState("");

  // Filters
  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState<POStatus | "ALL">("ALL");
  const [filterSupplier, setFilterSupplier] = useState("ALL");

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

  // Set default branch
  useMemo(() => {
    if (lockedBranchId) {
      setFormBranchId(lockedBranchId);
      setFilterBranch(lockedBranchId);
    } else if (selectedBranchId && !formBranchId) {
      setFormBranchId(selectedBranchId);
    }
  }, [lockedBranchId, selectedBranchId, formBranchId]);

  // ═══════════════════════════════════════════════════════════════════
  // AVAILABLE PRODUCTS FOR SELECTED BRANCH
  // ═══════════════════════════════════════════════════════════════════
  const availableProducts = useMemo(() => {
    if (!formBranchId) return [];
    return inventory.filter(p => p.branchId === formBranchId);
  }, [formBranchId, inventory]);

  // ═══════════════════════════════════════════════════════════════════
  // AVAILABLE SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════
  const availableSuppliers = useMemo(() => {
    if (!business) return [];
    return suppliers.filter(s => s.businessId === business.id);
  }, [suppliers, business]);

  // ═══════════════════════════════════════════════════════════════════
  // SELECTED SUPPLIER DETAILS
  // ═══════════════════════════════════════════════════════════════════
  const selectedSupplier = useMemo(() => {
    return getSupplierById(formSupplierId);
  }, [formSupplierId, getSupplierById]);

  // ═══════════════════════════════════════════════════════════════════
  // CHECK AVAILABLE COMMUNICATION METHODS
  // ═══════════════════════════════════════════════════════════════════
  const availableMethods = useMemo(() => {
    if (!selectedPO) return { email: false, sms: false, whatsapp: false };

    const po = purchaseOrders.find(p => p.id === selectedPO);
    if (!po) return { email: false, sms: false, whatsapp: false };

    const supplier = getSupplierById(po.supplierId);
    if (!supplier) return { email: false, sms: false, whatsapp: false };

    return {
      email: !!supplier.email,
      sms: !!supplier.phone,
      whatsapp: !!supplier.phone && supplier.phone.startsWith("+254")
    };
  }, [selectedPO, purchaseOrders, getSupplierById]);

  // ═══════════════════════════════════════════════════════════════════
  // ADD LINE ITEM TO PO
  // ═══════════════════════════════════════════════════════════════════
  const handleAddLineItem = () => {
    if (!currentProductId || !currentQuantity || parseInt(currentQuantity) <= 0) {
      toast.error("Please select a product and enter a valid quantity");
      return;
    }

    // Check if product already added
    if (lineItems.some(item => item.productId === currentProductId)) {
      toast.error("Product already added to this order");
      return;
    }

    const product = availableProducts.find(p => p.id === currentProductId);
    if (!product) {
      toast.error("Product not found");
      return;
    }

    const quantity = parseInt(currentQuantity);
    const unitCost = currentUnitCost ? parseFloat(currentUnitCost) : undefined;
    const totalCost = unitCost ? quantity * unitCost : undefined;

    const newItem: PurchaseOrderLineItem = {
      productId: product.id,
      productName: product.name,
      productSKU: product.sku,
      currentStock: product.stock,
      requestedQuantity: quantity,
      unitCost,
      totalCost
    };

    setLineItems(prev => [...prev, newItem]);
    
    // Reset form
    setCurrentProductId("");
    setCurrentQuantity("");
    setCurrentUnitCost("");

    toast.success(`Added ${product.name} to purchase order`);
  };

  // ═══════════════════════════════════════════════════════════════════
  // REMOVE LINE ITEM
  // ═══════════════════════════════════════════════════════════════════
  const handleRemoveLineItem = (productId: string) => {
    setLineItems(prev => prev.filter(item => item.productId !== productId));
    toast.success("Item removed from purchase order");
  };

  // ═══════════════════════════════════════════════════════════════════
  // CREATE PURCHASE ORDER
  // ═══════════════════════════════════════════════════════════════════
  const handleCreatePO = async () => {
    // Validation
    if (!formBranchId) {
      toast.error("Please select a branch");
      return;
    }

    if (!formSupplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (lineItems.length === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }

    if (!formExpectedDelivery) {
      toast.error("Please select an expected delivery date");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    const branch = getBranchById(formBranchId);
    const supplier = getSupplierById(formSupplierId);

    if (!branch || !supplier) {
      toast.error("Invalid branch or supplier selection");
      return;
    }

    await addPurchaseOrder({
      branchId: formBranchId,
      branchName: branch.name,
      supplierId: formSupplierId,
      supplierName: supplier.name,
      supplierContact: supplier.phone || supplier.email,
      items: lineItems,
      expectedDeliveryDate: formExpectedDelivery,
      notes: formNotes || undefined,
      sourceRequestId: sourceRequest?.id, // Link to supplier request if converting
      createdByStaffId: user.id,
      createdByStaffName: `${user.firstName} ${user.lastName}`,
      createdByRole: user.role
    });

    toast.success("Purchase Order created successfully!", {
      description: `PO ${getNextPONumber()} is now in Draft status`
    });

    // Reset form
    setFormSupplierId("");
    setFormExpectedDelivery("");
    setFormNotes("");
    setLineItems([]);
    setActiveTab("list");
  };

  // ═══════════════════════════════════════════════════════════════════
  // SEND PURCHASE ORDER
  // ═══════════════════════════════════════════════════════════════════
  const handleSendPO = async () => {
    if (!selectedPO || sendMethods.length === 0) {
      toast.error("Please select at least one communication method");
      return;
    }

    await sendPurchaseOrder(selectedPO, sendMethods);

    const po = purchaseOrders.find(p => p.id === selectedPO);
    toast.success("Purchase Order sent successfully!", {
      description: `PO ${po?.poNumber} sent to ${po?.supplierName} via ${sendMethods.join(", ")}`
    });

    setShowSendDialog(false);
    setSendMethods([]);
    setSelectedPO(null);
  };

  // ═══════════════════════════════════════════════════════════════════
  // APPROVE PURCHASE ORDER
  // ═══════════════════════════════════════════════════════════════════
  const handleApprovePO = async (poId: string) => {
    if (!user) return;

    await approvePurchaseOrder(poId, user.id, `${user.firstName} ${user.lastName}`);

    const po = purchaseOrders.find(p => p.id === poId);
    toast.success("Purchase Order approved!", {
      description: `PO ${po?.poNumber} is now approved and ready for delivery`
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // CANCEL PURCHASE ORDER
  // ═══════════════════════════════════════════════════��═══════════════
  const handleCancelPO = () => {
    if (!selectedPO || !cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    cancelPurchaseOrder(selectedPO, cancelReason);

    const po = purchaseOrders.find(p => p.id === selectedPO);
    toast.success("Purchase Order cancelled", {
      description: `PO ${po?.poNumber} has been cancelled`
    });

    setShowCancelDialog(false);
    setCancelReason("");
    setSelectedPO(null);
  };

  // ═══════════════════════════════════════════════════════════════════
  // FILTERED PURCHASE ORDERS
  // ═══════════════════════════════════════════════════════════════════
  const filteredPOs = useMemo(() => {
    if (!business) return [];

    let filtered = purchaseOrders.filter(po => po.businessId === business.id);

    // Branch filter
    if (lockedBranchId) {
      filtered = filtered.filter(po => po.branchId === lockedBranchId);
    } else if (filterBranch !== "ALL") {
      filtered = filtered.filter(po => po.branchId === filterBranch);
    }

    // Status filter
    if (filterStatus !== "ALL") {
      filtered = filtered.filter(po => po.status === filterStatus);
    }

    // Supplier filter
    if (filterSupplier !== "ALL") {
      filtered = filtered.filter(po => po.supplierId === filterSupplier);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchaseOrders, business, lockedBranchId, filterBranch, filterStatus, filterSupplier]);

  // ═══════════════════════════════════════════════════════════════════
  // STATUS BADGE HELPER
  // ═══════════════════════════════════════════════════════════════════
  const getStatusBadge = (status: POStatus) => {
    switch (status) {
      case "Draft":
        return <Badge variant="outline" className="bg-gray-100">Draft</Badge>;
      case "Sent":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Sent</Badge>;
      case "Approved":
        return <Badge className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>;
      case "Cancelled":
        return <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelled
        </Badge>;
      case "Delivered":
        return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Delivered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // TOGGLE SEND METHOD
  // ══════════════════════════════════════════════════════════════════
  const toggleSendMethod = (method: CommunicationMethod) => {
    setSendMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATE TOTAL FOR LINE ITEMS
  // ═══════════════════════════════════════════════════════════════════
  const lineItemsTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  }, [lineItems]);

  // ═══════════════════════════════════════════════════════════════════
  // PERMISSION CHECKS
  // ═══════════════════════════════════════════════════════════════════
  const canCreatePO = user?.role === "Business Owner" || user?.role === "Manager";
  const canApprovePO = user?.role === "Business Owner";

  // ═══════════════════════════════════════════════════════════════════
  // CONVERSION FLOW FROM SUPPLIER REQUEST
  // ═══════════════════════════════════════════════════════════════════
  const [sourceRequest, setSourceRequest] = useState<SupplierRequest | null>(null);
  const [isConversionMode, setIsConversionMode] = useState(false);

  // Handle conversion from Supplier Request
  useEffect(() => {
    const state = location.state as { mode?: string; sourceRequest?: SupplierRequest } | null;
    
    if (state?.mode === "convert" && state?.sourceRequest) {
      const request = state.sourceRequest;
      setSourceRequest(request);
      setIsConversionMode(true);

      // Pre-fill form with supplier request data
      setFormBranchId(request.branchId);
      setFormSupplierId(request.supplierId);
      
      // Find the product in inventory
      const product = inventory.find(p => p.id === request.productId && p.branchId === request.branchId);
      
      if (product) {
        // Pre-populate line items with the requested product
        const prefilledItem: PurchaseOrderLineItem = {
          productId: product.id,
          productName: product.name,
          productSKU: product.sku,
          currentStock: product.stock,
          requestedQuantity: request.requestedQuantity,
          // Unit cost must be manually entered
          unitCost: undefined,
          totalCost: undefined
        };
        setLineItems([prefilledItem]);
      }

      // Add note referencing the supplier request
      setFormNotes(`Converted from Supplier Request: ${request.id}\nOriginal Request Date: ${new Date(request.timestamp).toLocaleDateString()}\nRequested by: ${request.createdByStaffName}`);

      // Switch to create tab
      setActiveTab("create");

      // Clear navigation state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
      
      toast.info("Pre-filled Purchase Order from Supplier Request", {
        description: "Please review and enter pricing details before creating the PO"
      });
    }
  }, [location.state, navigate, inventory, location.pathname]);

  // Modified Create PO to handle conversion
  const handleCreatePOFromConversion = () => {
    // Call the original create function
    handleCreatePO();

    // If this was a conversion, update the supplier request status
    if (sourceRequest && user) {
      // Get the newly created PO (it will be the first one in the list after creation)
      setTimeout(() => {
        const latestPO = purchaseOrders.find(po => 
          po.businessId === business?.id &&
          po.supplierId === sourceRequest.supplierId &&
          po.branchId === sourceRequest.branchId
        );

        if (latestPO) {
          updateRequestStatus(sourceRequest.id, "CONVERTED", {
            convertedToPOId: latestPO.id,
            convertedByStaffId: user.id,
            convertedByStaffName: `${user.firstName} ${user.lastName}`
          });

          toast.success("Supplier Request marked as converted!", {
            description: `Request ${sourceRequest.id} has been linked to PO ${latestPO.poNumber}`
          });
        }

        // Reset conversion state
        setSourceRequest(null);
        setIsConversionMode(false);
      }, 100);
    }
  };

  // Listen to conversion data from SupplierManagement context
  useEffect(() => {
    if (supplierManagementContext) {
      const conversionData = (supplierManagementContext as any).poConversionData;
      if (conversionData) {
        const { mode, sourceRequest: request } = conversionData;
        
        if (mode === "convert" && request) {
          setSourceRequest(request);
          setIsConversionMode(true);

          // Pre-fill form with supplier request data
          setFormBranchId(request.branchId);
          setFormSupplierId(request.supplierId);
          
          // Find the product in inventory
          const product = inventory.find((p: any) => p.id === request.productId && p.branchId === request.branchId);
          
          if (product) {
            // Pre-populate line items with the requested product
            const prefilledItem: PurchaseOrderLineItem = {
              productId: product.id,
              productName: product.name,
              productSKU: product.sku,
              currentStock: product.stock,
              requestedQuantity: request.requestedQuantity,
              // Unit cost must be manually entered
              unitCost: undefined,
              totalCost: undefined
            };
            setLineItems([prefilledItem]);
          }

          // Add note referencing the supplier request
          setFormNotes(`Converted from Supplier Request: ${request.id}\nOriginal Request Date: ${new Date(request.timestamp).toLocaleDateString()}\nRequested by: ${request.createdByStaffName}`);

          // Switch to create tab
          setActiveTab("create");

          // Clear conversion data
          (supplierManagementContext as any).setPOConversionData(null);
          
          toast.info("Pre-filled Purchase Order from Supplier Request", {
            description: "Please review and enter pricing details before creating the PO"
          });
        }
      }
    }
  }, [supplierManagementContext, inventory]);

  // Clear conversion mode when switching tabs
  useEffect(() => {
    if (activeTab !== "create") {
      setIsConversionMode(false);
      setSourceRequest(null);
    }
  }, [activeTab]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-1">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Manage purchase order requests to suppliers
          </p>
        </div>
        {canCreatePO && (
          <Button onClick={() => setActiveTab("create")} className="gap-2">
            <Plus className="w-5 h-5" />
            New Purchase Order
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Purchase Orders</TabsTrigger>
          {canCreatePO && <TabsTrigger value="create">Create New</TabsTrigger>}
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {canAccessAllBranches && (
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select value={filterBranch} onValueChange={setFilterBranch}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Branches</SelectItem>
                        {branches
                          .filter(b => b.businessId === business?.id)
                          .map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as POStatus | "ALL")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Suppliers</SelectItem>
                      {availableSuppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                {filteredPOs.length} order(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPOs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPOs.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono font-semibold">{po.poNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{po.supplierName}</p>
                            <p className="text-xs text-muted-foreground">{po.supplierContact}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {po.branchName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{po.items.length}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {po.totalAmount ? formatCurrency(po.totalAmount) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div>
                            <p>{new Date(po.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs">{po.createdByStaffName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedPO(po.id);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {po.status === "Draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-600"
                                onClick={() => {
                                  setSelectedPO(po.id);
                                  setShowSendDialog(true);
                                }}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}

                            {po.status === "Sent" && canApprovePO && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600"
                                onClick={() => handleApprovePO(po.id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}

                            {po.status === "Approved" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-purple-600"
                                onClick={() => navigate(`/app/goods-received?from_po=${po.id}`)}
                                title="Receive Goods"
                              >
                                <ClipboardCheck className="w-4 h-4" />
                              </Button>
                            )}

                            {(po.status === "Draft" || po.status === "Sent") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedPO(po.id);
                                  setShowCancelDialog(true);
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No purchase orders found</p>
                  <p className="text-sm mt-1">Create your first purchase order to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Purchase Order</CardTitle>
              <CardDescription>
                Create a formal purchase request to send to suppliers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Branch Selection */}
              {canAccessAllBranches ? (
                <div className="space-y-2">
                  <Label>Branch *</Label>
                  <Select value={formBranchId} onValueChange={setFormBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches
                        .filter(b => b.businessId === business?.id && b.status === "active")
                        .map(branch => (
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
              ) : (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Branch: {getBranchById(lockedBranchId!)?.name}
                        </p>
                        <p className="text-xs text-blue-700">
                          Purchase orders will be created for your assigned branch
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={formSupplierId} onValueChange={setFormSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSuppliers.map(supplier => (
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

              {/* Expected Delivery Date */}
              <div className="space-y-2">
                <Label>Expected Delivery Date *</Label>
                <Input
                  type="date"
                  value={formExpectedDelivery}
                  onChange={(e) => setFormExpectedDelivery(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Add Products Section */}
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-semibold">Add Products to Order</h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Product</Label>
                    <Select 
                      value={currentProductId} 
                      onValueChange={setCurrentProductId}
                      disabled={!formBranchId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!formBranchId ? "Select branch first" : "Select product"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts
                          .filter(p => !lineItems.some(item => item.productId === p.id))
                          .map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  SKU: {product.sku} • Current Stock: {product.stock}
                                </p>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit Cost (Optional)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={currencySymbol}
                      value={currentUnitCost}
                      onChange={(e) => setCurrentUnitCost(e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={handleAddLineItem} variant="outline" className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add Product to Order
                </Button>
              </div>

              {/* Line Items Table */}
              {lineItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="font-mono text-sm">{item.productSKU}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {item.currentStock}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.requestedQuantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unitCost ? formatCurrency(item.unitCost) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.totalCost ? formatCurrency(item.totalCost) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleRemoveLineItem(item.productId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {lineItemsTotal > 0 && (
                        <TableRow className="bg-gray-50 font-semibold">
                          <TableCell colSpan={5} className="text-right">Total Order Value:</TableCell>
                          <TableCell className="text-right text-lg">
                            {formatCurrency(lineItemsTotal)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any special instructions or notes for the supplier..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Create Button */}
              <div className="flex gap-4">
                <Button
                  onClick={isConversionMode ? handleCreatePOFromConversion : handleCreatePO}
                  className="flex-1 gap-2"
                  size="lg"
                  disabled={
                    !formBranchId ||
                    !formSupplierId ||
                    lineItems.length === 0 ||
                    !formExpectedDelivery
                  }
                >
                  <FileText className="w-5 h-5" />
                  Create Purchase Order (Draft)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send PO Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Purchase Order</DialogTitle>
            <DialogDescription>
              Select communication method(s) to send this PO to the supplier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Email */}
              <Card
                className={`cursor-pointer transition-all ${
                  sendMethods.includes("Email")
                    ? "border-primary bg-primary/5"
                    : "hover:border-gray-400"
                } ${!availableMethods.email ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => availableMethods.email && toggleSendMethod("Email")}
              >
                <CardContent className="p-4 text-center">
                  <Mail className={`w-6 h-6 mx-auto mb-2 ${sendMethods.includes("Email") ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">Email</p>
                  {sendMethods.includes("Email") && (
                    <CheckCircle className="w-4 h-4 mx-auto mt-2 text-primary" />
                  )}
                </CardContent>
              </Card>

              {/* SMS */}
              <Card
                className={`cursor-pointer transition-all ${
                  sendMethods.includes("SMS")
                    ? "border-primary bg-primary/5"
                    : "hover:border-gray-400"
                } ${!availableMethods.sms ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => availableMethods.sms && toggleSendMethod("SMS")}
              >
                <CardContent className="p-4 text-center">
                  <Phone className={`w-6 h-6 mx-auto mb-2 ${sendMethods.includes("SMS") ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">SMS</p>
                  {sendMethods.includes("SMS") && (
                    <CheckCircle className="w-4 h-4 mx-auto mt-2 text-primary" />
                  )}
                </CardContent>
              </Card>

              {/* WhatsApp */}
              <Card
                className={`cursor-pointer transition-all ${
                  sendMethods.includes("WhatsApp")
                    ? "border-primary bg-primary/5"
                    : "hover:border-gray-400"
                } ${!availableMethods.whatsapp ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => availableMethods.whatsapp && toggleSendMethod("WhatsApp")}
              >
                <CardContent className="p-4 text-center">
                  <MessageSquare className={`w-6 h-6 mx-auto mb-2 ${sendMethods.includes("WhatsApp") ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">WhatsApp</p>
                  {sendMethods.includes("WhatsApp") && (
                    <CheckCircle className="w-4 h-4 mx-auto mt-2 text-primary" />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSendDialog(false);
              setSendMethods([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSendPO} disabled={sendMethods.length === 0}>
              <Send className="w-4 h-4 mr-2" />
              Send Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel PO Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this purchase order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cancellation Reason *</Label>
              <Textarea
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCancelDialog(false);
              setCancelReason("");
            }}>
              Keep Order
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelPO}
              disabled={!cancelReason.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      {selectedPO && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
            </DialogHeader>

            {(() => {
              const po = purchaseOrders.find(p => p.id === selectedPO);
              if (!po) return null;

              return (
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">PO Number</p>
                      <p className="font-mono font-semibold text-lg">{po.poNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(po.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Supplier</p>
                      <p className="font-medium">{po.supplierName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-medium">{po.branchName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Delivery</p>
                      <p className="font-medium">{new Date(po.expectedDeliveryDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created By</p>
                      <p className="font-medium">{po.createdByStaffName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(po.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <h4 className="font-semibold mb-3">Order Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-xs text-muted-foreground">SKU: {item.productSKU}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.requestedQuantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.unitCost ? formatCurrency(item.unitCost) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.totalCost ? formatCurrency(item.totalCost) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {po.totalAmount && (
                          <TableRow className="bg-gray-50 font-semibold">
                            <TableCell colSpan={3} className="text-right">Total:</TableCell>
                            <TableCell className="text-right text-lg">
                              {formatCurrency(po.totalAmount)}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Notes */}
                  {po.notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded border">
                        {po.notes}
                      </p>
                    </div>
                  )}

                  {/* Audit Trail */}
                  <div>
                    <h4 className="font-semibold mb-2">Audit Trail</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Created:</span>
                        <span>{new Date(po.createdAt).toLocaleString()}</span>
                      </div>
                      {po.sentAt && (
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-blue-600" />
                          <span className="text-muted-foreground">Sent:</span>
                          <span>{new Date(po.sentAt).toLocaleString()}</span>
                          {po.sentVia && <Badge variant="outline">{po.sentVia.join(", ")}</Badge>}
                        </div>
                      )}
                      {po.approvedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-muted-foreground">Approved:</span>
                          <span>{new Date(po.approvedAt).toLocaleString()}</span>
                          <span className="text-sm">by {po.approvedByStaffName}</span>
                        </div>
                      )}
                      {po.cancelledAt && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-destructive" />
                            <span className="text-muted-foreground">Cancelled:</span>
                            <span>{new Date(po.cancelledAt).toLocaleString()}</span>
                          </div>
                          {po.cancelledReason && (
                            <p className="text-xs text-destructive ml-6">Reason: {po.cancelledReason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}