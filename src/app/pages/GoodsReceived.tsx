import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { usePurchaseOrder } from "../contexts/PurchaseOrderContext";
import { useGoodsReceived, GRNLineItem, GRNStatus, DeliveryStatus } from "../contexts/GoodsReceivedContext";
import { useGRNWithInventory } from "../hooks/useGRNWithInventory";
import { useSupplierInvoice } from "../contexts/SupplierInvoiceContext";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import {
  Eye,
  CheckCircle,
  AlertTriangle,
  ClipboardCheck,
  Building2,
  TrendingUp,
  Receipt,
  Calendar
} from "lucide-react";

export function GoodsReceived() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, business } = useAuth();
  const { branches, getBranchById } = useBranch();
  const { purchaseOrders, getPurchaseOrderById } = usePurchaseOrder();
  const {
    goodsReceivedNotes,
    addGRN,
    updateGRN,
    confirmGRN,
    getNextGRNNumber,
    calculateDeliveryStatus
  } = useGoodsReceived();
  const { confirmGRNWithInventoryUpdate } = useGRNWithInventory();
  const { supplierInvoices, addSupplierInvoice } = useSupplierInvoice();

  // ═══════════════════════════════════════════════════════════════════
  // VIEW STATE
  // ═══════════════════════════════════════════════════════════════════
  const [activeTab, setActiveTab] = useState("list");
  const [selectedGRN, setSelectedGRN] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // FORM STATE (Create GRN from PO)
  // ═══════════════════════════════════════════════════════════════════
  const [selectedPOId, setSelectedPOId] = useState("");
  const [grnLineItems, setGrnLineItems] = useState<GRNLineItem[]>([]);
  const [grnNotes, setGrnNotes] = useState("");

  // Filters
  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState<DeliveryStatus | "ALL">("ALL");

  // ═══════════════════════════════════════════════════════════════════
  // SAFETY CHECK: Ensure all required contexts are available
  // ═══════════════════════════════════════════════════════════════════
  if (!user || !business) {
    return null; // AuthGuard should handle this, but adding safety check
  }

  // ═══════════════════════════════════════════════════════════════════
  // RBAC: Determine user's branch access
  // ═══════════════════════════════════════════════════════════════════
  const { canAccessAllBranches, lockedBranchId } = useMemo(() => {
    if (!user) return { canAccessAllBranches: false, lockedBranchId: undefined };

    const canAccessAllBranches = user.role === "Business Owner" || user.role === "Accountant";
    const lockedBranchId = user.role === "Manager" || user.role === "Staff"
      ? user.branchId
      : undefined;

    return { canAccessAllBranches, lockedBranchId };
  }, [user]);

  // Set default branch filter
  useMemo(() => {
    if (lockedBranchId) {
      setFilterBranch(lockedBranchId);
    }
  }, [lockedBranchId]);

  // ═══════════════════════════════════════════════════════════════════
  // HANDLE PO SELECTION FROM URL PARAMETER
  // ═══════════════════════════════════════���═══════════════════════════
  useEffect(() => {
    const poId = searchParams.get("from_po");
    if (poId) {
      const po = getPurchaseOrderById(poId);
      if (po && po.status === "Approved") {
        setSelectedPOId(poId);
        setActiveTab("create");
        
        // Auto-populate line items with ordered quantities
        const initialItems: GRNLineItem[] = po.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productSKU: item.productSKU,
          orderedQuantity: item.requestedQuantity,
          receivedQuantity: item.requestedQuantity, // Default to full delivery
          notes: ""
        }));
        setGrnLineItems(initialItems);
      }
    }
  }, [searchParams, getPurchaseOrderById]);

  // ═══════════════════════════════════════════════════════════════════
  // AVAILABLE PURCHASE ORDERS (Approved only)
  // ═══════════════════════════════════════════════════════════════════
  const availablePOs = useMemo(() => {
    if (!business) return [];
    
    let pos = purchaseOrders.filter(po => 
      po.businessId === business.id && 
      po.status === "Approved"
    );

    // Filter by branch if user has limited access
    if (lockedBranchId) {
      pos = pos.filter(po => po.branchId === lockedBranchId);
    }

    return pos;
  }, [purchaseOrders, business, lockedBranchId]);

  // ═══════════════════════════════════════════════════════════════════
  // SELECTED PURCHASE ORDER
  // ═══════════════════════════════════════════════════════════════════
  const selectedPO = useMemo(() => {
    return selectedPOId ? getPurchaseOrderById(selectedPOId) : null;
  }, [selectedPOId, getPurchaseOrderById]);

  // ═══════════════════════════════════════════════════════════════════
  // HANDLE PO SELECTION
  // ═══════════════════════════════════════════════════════════════════
  const handleSelectPO = (poId: string) => {
    const po = getPurchaseOrderById(poId);
    if (!po) return;

    setSelectedPOId(poId);

    // Auto-populate line items
    const initialItems: GRNLineItem[] = po.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productSKU: item.productSKU,
      orderedQuantity: item.requestedQuantity,
      receivedQuantity: item.requestedQuantity, // Default to full delivery
      notes: ""
    }));
    setGrnLineItems(initialItems);
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE RECEIVED QUANTITY
  // ═══════════════════════════════════════════════════════════════════
  const handleUpdateReceivedQuantity = (productId: string, receivedQty: number) => {
    setGrnLineItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, receivedQuantity: Math.max(0, Math.min(receivedQty, item.orderedQuantity)) }
          : item
      )
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE LINE ITEM NOTES
  // ═══════════════════════════════════════════════════════════════════
  const handleUpdateLineItemNotes = (productId: string, notes: string) => {
    setGrnLineItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, notes }
          : item
      )
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // CREATE GRN (Draft)
  // ═══════════════════════════════════════════════════════════════════
  const handleCreateGRN = () => {
    if (!selectedPO) {
      toast.error("Please select a purchase order");
      return;
    }

    if (grnLineItems.length === 0) {
      toast.error("No items to receive");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    // Validate that at least some quantity is received
    const totalReceived = grnLineItems.reduce((sum, item) => sum + item.receivedQuantity, 0);
    if (totalReceived === 0) {
      toast.error("Please enter received quantities for at least one product");
      return;
    }

    addGRN({
      branchId: selectedPO.branchId,
      branchName: selectedPO.branchName,
      purchaseOrderId: selectedPO.id,
      purchaseOrderNumber: selectedPO.poNumber,
      supplierId: selectedPO.supplierId,
      supplierName: selectedPO.supplierName,
      items: grnLineItems,
      deliveryStatus: calculateDeliveryStatus(grnLineItems),
      receivedByStaffId: user.id,
      receivedByStaffName: `${user.firstName} ${user.lastName}`,
      receivedByRole: user.role,
      notes: grnNotes || undefined
    });

    const deliveryStatus = calculateDeliveryStatus(grnLineItems);
    
    toast.success("Goods Received Note created!", {
      description: `GRN ${getNextGRNNumber()} created as Draft (${deliveryStatus} Delivery)`
    });

    // Reset form
    setSelectedPOId("");
    setGrnLineItems([]);
    setGrnNotes("");
    setActiveTab("list");
  };

  // ═══════════════════════════════════════════════════════════════════
  // CONFIRM GRN
  // ═══════════════════════════════════════════════════════════════════
  const handleConfirmGRN = () => {
    if (!selectedGRN) return;

    const result = confirmGRNWithInventoryUpdate(selectedGRN);

    if (result.success) {
      const grn = goodsReceivedNotes.find(g => g.id === selectedGRN);
      
      toast.success("GRN Confirmed & Inventory Updated!", {
        description: `GRN ${grn?.grnNumber}: ${result.productsUpdated} product(s) updated, ${result.productsCreated} product(s) created`
      });

      // Show detailed inventory update card
      if (result.productsCreated > 0) {
        toast.info("New inventory records created", {
          description: `${result.productsCreated} new product(s) added to branch inventory`
        });
      }
    } else {
      toast.error("Failed to confirm GRN", {
        description: result.message
      });
      
      // Show detailed errors if any
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          toast.error(error);
        });
      }
      
      // Don't close dialog if failed
      return;
    }

    setShowConfirmDialog(false);
    setSelectedGRN(null);
  };

  // ══════════════════════════════════════════════════════════════════
  // FILTERED GRNs
  // ═══════════════════════════════════════════════════════════════════
  const filteredGRNs = useMemo(() => {
    if (!business) return [];

    let filtered = goodsReceivedNotes.filter(grn => grn.businessId === business.id);

    // Branch filter
    if (lockedBranchId) {
      filtered = filtered.filter(grn => grn.branchId === lockedBranchId);
    } else if (filterBranch !== "ALL") {
      filtered = filtered.filter(grn => grn.branchId === filterBranch);
    }

    // Status filter
    if (filterStatus !== "ALL") {
      filtered = filtered.filter(grn => grn.deliveryStatus === filterStatus);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [goodsReceivedNotes, business, lockedBranchId, filterBranch, filterStatus]);

  // ═══════════════════════════════════════════════════════════════════
  // STATUS BADGE HELPERS
  // ═══════════════════════════════════════════════════════════════════
  const getStatusBadge = (status: GRNStatus) => {
    if (status === "Draft") {
      return <Badge variant="outline" className="bg-gray-100">Draft</Badge>;
    }
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300">
        <CheckCircle className="w-3 h-3 mr-1" />
        Confirmed
      </Badge>
    );
  };

  const getDeliveryStatusBadge = (status: DeliveryStatus) => {
    if (status === "Full") {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Full Delivery
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Partial Delivery
      </Badge>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // PERMISSION CHECKS
  // ═══════════════════════════════════════════════════════════════════
  const canCreateGRN = user?.role === "Business Owner" || user?.role === "Manager" || user?.role === "Staff";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-1">Goods Received Notes</h1>
          <p className="text-muted-foreground">
            Record actual deliveries from suppliers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Received Notes</TabsTrigger>
          {canCreateGRN && <TabsTrigger value="create">Receive Goods</TabsTrigger>}
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Label>Delivery Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as DeliveryStatus | "ALL")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Deliveries</SelectItem>
                      <SelectItem value="Full">Full Delivery</SelectItem>
                      <SelectItem value="Partial">Partial Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GRN Table */}
          <Card>
            <CardHeader>
              <CardTitle>Goods Received Notes</CardTitle>
              <CardDescription>
                {filteredGRNs.length} record(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredGRNs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GRN Number</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead>Delivery Status</TableHead>
                      <TableHead>GRN Status</TableHead>
                      <TableHead>Received By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGRNs.map((grn) => (
                      <TableRow key={grn.id}>
                        <TableCell className="font-mono font-semibold">{grn.grnNumber}</TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-mono"
                            onClick={() => {
                              // TODO: Navigate to PO details or open dialog
                              toast.info(`View PO ${grn.purchaseOrderNumber}`);
                            }}
                          >
                            {grn.purchaseOrderNumber}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{grn.supplierName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {grn.branchName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{grn.items.length}</TableCell>
                        <TableCell>{getDeliveryStatusBadge(grn.deliveryStatus)}</TableCell>
                        <TableCell>{getStatusBadge(grn.status)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{grn.receivedByStaffName}</p>
                            <p className="text-xs text-muted-foreground">{grn.receivedByRole}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {grn.confirmedAt
                            ? new Date(grn.confirmedAt).toLocaleDateString()
                            : new Date(grn.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedGRN(grn.id);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {grn.status === "Draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600"
                                onClick={() => {
                                  setSelectedGRN(grn.id);
                                  setShowConfirmDialog(true);
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
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
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No goods received notes found</p>
                  <p className="text-sm mt-1">Create a GRN when you receive delivery from a supplier</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receive Goods</CardTitle>
              <CardDescription>
                Record actual delivery quantities from an approved purchase order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Purchase Order Selection */}
              <div className="space-y-2">
                <Label>Select Purchase Order *</Label>
                <Select value={selectedPOId} onValueChange={handleSelectPO}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an approved purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePOs.length > 0 ? (
                      availablePOs.map(po => (
                        <SelectItem key={po.id} value={po.id}>
                          <div className="space-y-1">
                            <p className="font-mono font-semibold">{po.poNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {po.supplierName} • {po.branchName} • {po.items.length} items
                            </p>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No approved purchase orders available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* PO Summary */}
              {selectedPO && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-blue-900">Purchase Order Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-blue-700 text-xs">PO Number</p>
                        <p className="font-mono font-semibold text-blue-900">{selectedPO.poNumber}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 text-xs">Supplier</p>
                        <p className="font-medium text-blue-900">{selectedPO.supplierName}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 text-xs">Branch</p>
                        <p className="font-medium text-blue-900">{selectedPO.branchName}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 text-xs">Expected Delivery</p>
                        <p className="font-medium text-blue-900">
                          {new Date(selectedPO.expectedDeliveryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Received Quantities */}
              {grnLineItems.length > 0 && (
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Record Received Quantities</h3>
                    <Badge variant="outline" className="text-xs">
                      {grnLineItems.length} Products
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {grnLineItems.map((item, index) => (
                      <div key={item.productId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">SKU: {item.productSKU}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Item {index + 1}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Ordered Quantity</Label>
                            <div className="h-10 px-3 rounded-md border bg-gray-100 flex items-center font-semibold">
                              {item.orderedQuantity}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Received Quantity *</Label>
                            <Input
                              type="number"
                              min="0"
                              max={item.orderedQuantity}
                              value={item.receivedQuantity}
                              onChange={(e) => handleUpdateReceivedQuantity(
                                item.productId,
                                parseInt(e.target.value) || 0
                              )}
                              className={
                                item.receivedQuantity < item.orderedQuantity
                                  ? "border-yellow-500 bg-yellow-50"
                                  : "border-green-500 bg-green-50"
                              }
                            />
                          </div>
                        </div>

                        {item.receivedQuantity < item.orderedQuantity && (
                          <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                            <AlertTriangle className="w-4 h-4" />
                            <span>
                              Partial delivery: {item.orderedQuantity - item.receivedQuantity} units short
                            </span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs">Notes (Optional)</Label>
                          <Input
                            placeholder="e.g., Damaged, Missing, Substituted"
                            value={item.notes || ""}
                            onChange={(e) => handleUpdateLineItemNotes(item.productId, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Status Summary */}
                  <Card className={
                    calculateDeliveryStatus(grnLineItems) === "Full"
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  }>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        {calculateDeliveryStatus(grnLineItems) === "Full" ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-semibold text-green-900">Full Delivery</p>
                              <p className="text-xs text-green-700">
                                All products received as ordered
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <div>
                              <p className="font-semibold text-yellow-900">Partial Delivery</p>
                              <p className="text-xs text-yellow-700">
                                Some products received less than ordered
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* General Notes */}
              {grnLineItems.length > 0 && (
                <div className="space-y-2">
                  <Label>General Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any additional notes about this delivery..."
                    value={grnNotes}
                    onChange={(e) => setGrnNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              )}

              {/* Create Button */}
              {grnLineItems.length > 0 && (
                <div className="flex gap-4">
                  <Button
                    onClick={handleCreateGRN}
                    className="flex-1 gap-2"
                    size="lg"
                  >
                    <ClipboardCheck className="w-5 h-5" />
                    Create Goods Received Note (Draft)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm GRN Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Goods Received Note & Update Inventory</DialogTitle>
            <DialogDescription>
              This action will confirm the GRN and automatically update inventory stock.
            </DialogDescription>
          </DialogHeader>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <p className="font-semibold mb-1">Inventory Will Be Updated</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Stock levels will increase based on received quantities</li>
                    <li>Updates apply only to the branch in this GRN</li>
                    <li>Full audit trail will be created for each product</li>
                    <li>Changes are permanent and cannot be undone</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-semibold mb-1">This GRN Will Be Locked</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>GRN becomes immutable and cannot be edited</li>
                    <li>Received quantities are recorded permanently</li>
                    <li>Confirms physical delivery from supplier</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmGRN} className="gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4" />
              Confirm GRN & Update Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      {selectedGRN && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Goods Received Note Details</DialogTitle>
            </DialogHeader>

            {(() => {
              const grn = goodsReceivedNotes.find(g => g.id === selectedGRN);
              if (!grn) return null;

              // Check if invoice already exists for this GRN
              const existingInvoices = supplierInvoices.filter(inv => inv.grnId === grn.id);
              const hasInvoice = existingInvoices.length > 0;

              return (
                <div className="space-y-6">
                  {/* Create Invoice Button for Confirmed GRNs */}
                  {grn.status === "Confirmed" && !hasInvoice && (user?.role === "Business Owner" || user?.role === "Manager") && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-blue-900">Create Supplier Invoice</p>
                            <p className="text-xs text-blue-700 mt-1">
                              Record the supplier's bill for this delivery
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              setShowDetailsDialog(false);
                              navigate(`/app/supplier-invoices?from_grn=${grn.id}`);
                            }}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                          >
                            <Receipt className="w-4 h-4" />
                            Create Invoice
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Existing Invoice Link */}
                  {hasInvoice && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-green-900">Supplier Invoice Created</p>
                            <p className="text-xs text-green-700 mt-1">
                              Invoice {existingInvoices[0].invoiceNumber} has been created for this GRN
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowDetailsDialog(false);
                              navigate(`/app/supplier-invoices`);
                            }}
                            className="gap-2"
                          >
                            <Receipt className="w-4 h-4" />
                            View Invoice
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">GRN Number</p>
                      <p className="font-mono font-semibold text-lg">{grn.grnNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">PO Number</p>
                      <p className="font-mono font-semibold text-lg">{grn.purchaseOrderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Supplier</p>
                      <p className="font-medium">{grn.supplierName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-medium">{grn.branchName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Status</p>
                      <div className="mt-1">{getDeliveryStatusBadge(grn.deliveryStatus)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">GRN Status</p>
                      <div className="mt-1">{getStatusBadge(grn.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Received By</p>
                      <p className="font-medium">{grn.receivedByStaffName}</p>
                      <p className="text-xs text-muted-foreground">{grn.receivedByRole}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {grn.confirmedAt
                          ? new Date(grn.confirmedAt).toLocaleString()
                          : new Date(grn.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <h4 className="font-semibold mb-3">Received Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Ordered</TableHead>
                          <TableHead className="text-right">Received</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grn.items.map((item, idx) => {
                          const variance = item.receivedQuantity - item.orderedQuantity;
                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.productName}</p>
                                  <p className="text-xs text-muted-foreground">SKU: {item.productSKU}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {item.orderedQuantity}
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${
                                item.receivedQuantity < item.orderedQuantity
                                  ? "text-yellow-700"
                                  : "text-green-700"
                              }`}>
                                {item.receivedQuantity}
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${
                                variance < 0
                                  ? "text-red-700"
                                  : variance > 0
                                  ? "text-green-700"
                                  : "text-gray-600"
                              }`}>
                                {variance > 0 ? `+${variance}` : variance}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {item.notes || "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* General Notes */}
                  {grn.notes && (
                    <div>
                      <h4 className="font-semibold mb-2">General Notes</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded border">
                        {grn.notes}
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
                        <span>{new Date(grn.createdAt).toLocaleString()}</span>
                      </div>
                      {grn.confirmedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-muted-foreground">Confirmed:</span>
                          <span>{new Date(grn.confirmedAt).toLocaleString()}</span>
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