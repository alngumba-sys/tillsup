import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  FileText,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Building2,
  User,
  Calendar,
  Eye,
  Receipt,
  Clock,
  BadgeCheck,
  TrendingDown
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useGoodsReceived } from "../contexts/GoodsReceivedContext";
import { useSupplierInvoice, SupplierInvoiceStatus, SupplierInvoiceLineItem } from "../contexts/SupplierInvoiceContext";
import { useCurrency } from "../hooks/useCurrency";
import { toast } from "sonner";

export function SupplierInvoices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, business } = useAuth();
  const { branches, getBranchById } = useBranch();
  const { goodsReceivedNotes, getGRNById } = useGoodsReceived();
  const {
    supplierInvoices,
    addSupplierInvoice,
    approveSupplierInvoice,
    markInvoiceAsPaid,
    getInvoicesByGRN,
    getTotalOutstanding
  } = useSupplierInvoice();
  const { formatCurrency, currencySymbol } = useCurrency();


  // ═══════════════════════════════════════════════════════════════════
  // VIEW STATE
  // ═══════════════════════════════════════════════════════════════════
  const [activeTab, setActiveTab] = useState("list");
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // FORM STATE (Create Invoice from GRN)
  // ═══════════════════════════════════════════════════════════════════
  const [selectedGRNId, setSelectedGRNId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [invoiceItems, setInvoiceItems] = useState<SupplierInvoiceLineItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes] = useState("");

  // Filters
  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState<SupplierInvoiceStatus | "ALL">("ALL");

  // ═══════════════════════════════════════════════════════════════════
  // RBAC: Determine user's branch access
  // ═══════════════════════════════════════════════════════════════════
  const { canAccessAllBranches, lockedBranchId } = useMemo(() => {
    if (!user) return { canAccessAllBranches: false, lockedBranchId: undefined };

    const canAccessAllBranches = user.role === "Business Owner" || user.role === "Accountant";
    const lockedBranchId = user.role === "Manager" ? user.branchId : undefined;

    return { canAccessAllBranches, lockedBranchId };
  }, [user]);

  // Set default branch filter
  useMemo(() => {
    if (lockedBranchId) {
      setFilterBranch(lockedBranchId);
    }
  }, [lockedBranchId]);

  // ═══════════════════════════════════════════════════════════════════
  // HANDLE GRN SELECTION FROM URL PARAMETER
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const grnId = searchParams.get("from_grn");
    if (grnId) {
      const grn = getGRNById(grnId);
      if (grn && grn.status === "Confirmed") {
        // Check if invoice already exists for this GRN
        const existingInvoices = getInvoicesByGRN(grnId);
        if (existingInvoices.length > 0) {
          toast.error("Invoice already exists for this GRN");
          return;
        }

        setSelectedGRNId(grnId);
        setActiveTab("create");
        
        // Auto-populate line items
        const initialItems: SupplierInvoiceLineItem[] = grn.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productSKU: item.productSKU,
          quantity: item.receivedQuantity,
          unitPrice: 0,
          lineTotal: 0
        }));
        setInvoiceItems(initialItems);
      }
    }
  }, [searchParams, getGRNById, getInvoicesByGRN]);

  // ═══════════════════════════════════════════════════════════════════
  // AVAILABLE GRNs (Confirmed only, without existing invoices)
  // ═══════════════════════════════════════════════════════════════════
  const availableGRNs = useMemo(() => {
    if (!business) return [];
    
    let grns = goodsReceivedNotes.filter(grn => 
      grn.businessId === business.id && 
      grn.status === "Confirmed"
    );

    // Filter by branch if user has limited access
    if (lockedBranchId) {
      grns = grns.filter(grn => grn.branchId === lockedBranchId);
    }

    // Filter out GRNs that already have invoices
    grns = grns.filter(grn => {
      const existingInvoices = getInvoicesByGRN(grn.id);
      return existingInvoices.length === 0;
    });

    return grns;
  }, [goodsReceivedNotes, business, lockedBranchId, getInvoicesByGRN]);

  // ═══════════════════════════════════════════════════════════════════
  // SELECTED GRN
  // ═══════════════════════════════════════════════════════════════════
  const selectedGRN = useMemo(() => {
    return selectedGRNId ? getGRNById(selectedGRNId) : null;
  }, [selectedGRNId, getGRNById]);

  // ═══════════════════════════════════════════════════════════════════
  // HANDLE GRN SELECTION
  // ═══════════════════════════════════════════════════════════════════
  const handleSelectGRN = (grnId: string) => {
    const grn = getGRNById(grnId);
    if (!grn) return;

    setSelectedGRNId(grnId);

    // Auto-populate line items
    const initialItems: SupplierInvoiceLineItem[] = grn.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productSKU: item.productSKU,
      quantity: item.receivedQuantity,
      unitPrice: 0,
      lineTotal: 0
    }));
    setInvoiceItems(initialItems);
    
    // Reset totals
    setSubtotal(0);
    setTaxAmount(0);
    setTotalAmount(0);
  };

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE LINE ITEM PRICING
  // ═══════════════════════════════════════════════════════════════════
  const handleUpdateLineItem = (productId: string, field: "unitPrice" | "lineTotal", value: number) => {
    setInvoiceItems(prev =>
      prev.map(item => {
        if (item.productId !== productId) return item;

        if (field === "unitPrice") {
          const lineTotal = value * item.quantity;
          return { ...item, unitPrice: value, lineTotal };
        } else {
          const unitPrice = item.quantity > 0 ? value / item.quantity : 0;
          return { ...item, unitPrice, lineTotal: value };
        }
      })
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATE TOTALS
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const calculatedSubtotal = invoiceItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    setSubtotal(calculatedSubtotal);
    
    const calculatedTotal = calculatedSubtotal + taxAmount;
    setTotalAmount(calculatedTotal);
  }, [invoiceItems, taxAmount]);

  // ═══════════════════════════════════════════════════════════════════
  // CREATE SUPPLIER INVOICE (Draft)
  // ═══════════════════════════════════════════════════════════════════
  const handleCreateInvoice = async () => {
    if (!selectedGRN) {
      toast.error("Please select a GRN");
      return;
    }

    if (!invoiceNumber.trim()) {
      toast.error("Please enter supplier invoice number");
      return;
    }

    if (!invoiceDate) {
      toast.error("Please enter invoice date");
      return;
    }

    if (!dueDate) {
      toast.error("Please enter due date");
      return;
    }

    if (totalAmount <= 0) {
      toast.error("Invoice total must be greater than 0");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    await addSupplierInvoice({
      invoiceNumber: invoiceNumber.trim(),
      branchId: selectedGRN.branchId,
      branchName: selectedGRN.branchName,
      supplierId: selectedGRN.supplierId,
      supplierName: selectedGRN.supplierName,
      purchaseOrderId: selectedGRN.purchaseOrderId,
      purchaseOrderNumber: selectedGRN.purchaseOrderNumber,
      grnId: selectedGRN.id,
      grnNumber: selectedGRN.grnNumber,
      items: invoiceItems,
      subtotal,
      taxAmount: taxAmount > 0 ? taxAmount : undefined,
      totalAmount,
      invoiceDate,
      dueDate,
      notes: notes.trim() || undefined,
      createdByStaffId: user.id,
      createdByStaffName: `${user.firstName} ${user.lastName}`,
      createdByRole: user.role
    });

    toast.success("Supplier Invoice created!", {
      description: `Invoice ${invoiceNumber} created as Draft`
    });

    // Reset form
    setSelectedGRNId("");
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate("");
    setInvoiceItems([]);
    setSubtotal(0);
    setTaxAmount(0);
    setTotalAmount(0);
    setNotes("");
    setActiveTab("list");
  };

  // ═══════════════════════════════════════════════════════════════════
  // APPROVE INVOICE
  // ═══════════════════════════════════════════════════════════════════
  const handleApproveInvoice = async () => {
    if (!selectedInvoice || !user) return;

    const result = await approveSupplierInvoice(
      selectedInvoice,
      user.id,
      `${user.firstName} ${user.lastName}`
    );

    if (result.success) {
      const invoice = supplierInvoices.find(inv => inv.id === selectedInvoice);
      
      toast.success("Invoice Approved & Expense Created!", {
        description: `Invoice ${invoice?.invoiceNumber} approved. Expense record auto-created.`
      });
    } else {
      toast.error("Failed to approve invoice", {
        description: result.error
      });
      return;
    }

    setShowApproveDialog(false);
    setSelectedInvoice(null);
  };

  // ═══════════════════════════════════════════════════════════════════
  // MARK AS PAID
  // ═══════════════════════════════════════════════════════════════════
  const handleMarkAsPaid = async () => {
    if (!selectedInvoice || !user) return;

    await markInvoiceAsPaid(
      selectedInvoice,
      user.id,
      `${user.firstName} ${user.lastName}`
    );

    const invoice = supplierInvoices.find(inv => inv.id === selectedInvoice);
    
    toast.success("Invoice Marked as Paid", {
      description: `Invoice ${invoice?.invoiceNumber} payment recorded`
    });

    setShowPayDialog(false);
    setSelectedInvoice(null);
  };

  // ═══════════════════════════════════════════════════════════════════
  // FILTERED INVOICES
  // ═══════════════════════════════════════════════════════════════════
  const filteredInvoices = useMemo(() => {
    if (!business) return [];

    let filtered = supplierInvoices.filter(inv => inv.businessId === business.id);

    // Branch filter
    if (lockedBranchId) {
      filtered = filtered.filter(inv => inv.branchId === lockedBranchId);
    } else if (filterBranch !== "ALL") {
      filtered = filtered.filter(inv => inv.branchId === filterBranch);
    }

    // Status filter
    if (filterStatus !== "ALL") {
      filtered = filtered.filter(inv => inv.status === filterStatus);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [supplierInvoices, business, lockedBranchId, filterBranch, filterStatus]);

  // ═══════════════════════════════════════════════════════════════════
  // STATUS BADGE HELPERS
  // ═══════════════════════════════════════════════════════════════════
  const getStatusBadge = (status: SupplierInvoiceStatus) => {
    switch (status) {
      case "Draft":
        return <Badge variant="outline" className="bg-gray-100">Draft</Badge>;
      case "Approved":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "Paid":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <BadgeCheck className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // PERMISSION CHECKS
  // ═══════════════════════════════════════════════════════════════════
  const canCreateInvoice = user?.role === "Business Owner" || user?.role === "Manager";
  const canApproveInvoice = user?.role === "Business Owner" || user?.role === "Manager";

  // ═══════════════════════════════════════════════════════════════════
  // OUTSTANDING AMOUNT
  // ══════════════════════════════════════════════���════════════════════
  const outstandingAmount = useMemo(() => {
    return getTotalOutstanding(
      business?.id,
      lockedBranchId || (filterBranch !== "ALL" ? filterBranch : undefined)
    );
  }, [business, lockedBranchId, filterBranch, getTotalOutstanding, supplierInvoices]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-1">Supplier Invoices</h1>
          <p className="text-muted-foreground">
            Manage supplier bills and procurement expenses
          </p>
        </div>
      </div>

      {/* Outstanding Amount Card */}
      {outstandingAmount > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-700">Outstanding Payables (Approved but Unpaid)</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(outstandingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Invoices</TabsTrigger>
          {canCreateInvoice && <TabsTrigger value="create">Create Invoice</TabsTrigger>}
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
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as SupplierInvoiceStatus | "ALL")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Table */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Invoices</CardTitle>
              <CardDescription>
                {filteredInvoices.length} invoice(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>GRN</TableHead>
                      <TableHead className="text-right">Amount ({currencySymbol})</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-semibold">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="font-medium">{invoice.supplierName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {invoice.branchName}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{invoice.grnNumber}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {invoice.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedInvoice(invoice.id);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {invoice.status === "Draft" && canApproveInvoice && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-600"
                                onClick={() => {
                                  setSelectedInvoice(invoice.id);
                                  setShowApproveDialog(true);
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}

                            {invoice.status === "Approved" && canApproveInvoice && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600"
                                onClick={() => {
                                  setSelectedInvoice(invoice.id);
                                  setShowPayDialog(true);
                                }}
                              >
                                <DollarSign className="w-4 h-4" />
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
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No supplier invoices found</p>
                  <p className="text-sm mt-1">Create an invoice from a confirmed GRN</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Supplier Invoice</CardTitle>
              <CardDescription>
                Record a supplier bill from a confirmed goods received note
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* GRN Selection */}
              <div className="space-y-2">
                <Label>Select Confirmed GRN *</Label>
                <Select value={selectedGRNId} onValueChange={handleSelectGRN}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a confirmed GRN without existing invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGRNs.length > 0 ? (
                      availableGRNs.map(grn => (
                        <SelectItem key={grn.id} value={grn.id}>
                          <div className="space-y-1">
                            <p className="font-mono font-semibold">{grn.grnNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {grn.supplierName} • {grn.branchName} • {grn.items.length} items
                            </p>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No confirmed GRNs without invoices available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* GRN Summary */}
              {selectedGRN && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-blue-900">GRN Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-blue-700 text-xs">GRN Number</p>
                        <p className="font-mono font-semibold text-blue-900">{selectedGRN.grnNumber}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 text-xs">PO Number</p>
                        <p className="font-mono font-semibold text-blue-900">{selectedGRN.purchaseOrderNumber}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 text-xs">Supplier</p>
                        <p className="font-medium text-blue-900">{selectedGRN.supplierName}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 text-xs">Branch</p>
                        <p className="font-medium text-blue-900">{selectedGRN.branchName}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invoice Details */}
              {invoiceItems.length > 0 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Supplier Invoice Number *</Label>
                      <Input
                        placeholder="e.g., SUP-INV-12345"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Invoice Date *</Label>
                      <Input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date *</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={invoiceDate}
                      />
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Invoice Line Items</h3>
                      <Badge variant="outline" className="text-xs">
                        {invoiceItems.length} Products
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {invoiceItems.map((item, index) => (
                        <div key={item.productId} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">SKU: {item.productSKU}</p>
                              <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Item {index + 1}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">Unit Price ({currencySymbol})</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={item.unitPrice || ""}
                                onChange={(e) => handleUpdateLineItem(
                                  item.productId,
                                  "unitPrice",
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Line Total ({currencySymbol})</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={item.lineTotal || ""}
                                onChange={(e) => handleUpdateLineItem(
                                  item.productId,
                                  "lineTotal",
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tax and Totals */}
                  <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Tax Amount (Optional, {currencySymbol})</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={taxAmount || ""}
                          onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                      </div>
                      {taxAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax:</span>
                          <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total Amount:</span>
                        <span>{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      placeholder="Add any additional notes about this invoice..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Create Button */}
                  <div className="flex gap-4">
                    <Button
                      onClick={handleCreateInvoice}
                      className="flex-1 gap-2"
                      size="lg"
                    >
                      <Receipt className="w-5 h-5" />
                      Create Supplier Invoice (Draft)
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Invoice Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Invoice & Create Expense</DialogTitle>
            <DialogDescription>
              This will approve the invoice and automatically create an expense record.
            </DialogDescription>
          </DialogHeader>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <p className="font-semibold mb-1">Expense Will Be Created</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Category: "Inventory Procurement"</li>
                    <li>Amount: Invoice total</li>
                    <li>Branch: Invoice branch</li>
                    <li>Linked to this invoice for traceability</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Invoice Will Be Locked</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Invoice becomes read-only</li>
                    <li>Cannot be edited after approval</li>
                    <li>Financial record is permanent</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveInvoice} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="w-4 h-4" />
              Approve Invoice & Create Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Record that this invoice has been paid to the supplier.
            </DialogDescription>
          </DialogHeader>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <BadgeCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <p className="font-semibold mb-1">Payment Confirmation</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Marks invoice as paid</li>
                    <li>Records payment timestamp</li>
                    <li>Removes from outstanding payables</li>
                    <li>Cannot be undone</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} className="gap-2 bg-green-600 hover:bg-green-700">
              <DollarSign className="w-4 h-4" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      {selectedInvoice && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Supplier Invoice Details</DialogTitle>
            </DialogHeader>

            {(() => {
              const invoice = supplierInvoices.find(inv => inv.id === selectedInvoice);
              if (!invoice) return null;

              return (
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Number</p>
                      <p className="font-mono font-semibold text-lg">{invoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Supplier</p>
                      <p className="font-medium">{invoice.supplierName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-medium">{invoice.branchName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">GRN Number</p>
                      <p className="font-mono font-medium">{invoice.grnNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">PO Number</p>
                      <p className="font-mono font-medium">{invoice.purchaseOrderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Date</p>
                      <p className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <h4 className="font-semibold mb-3">Line Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Line Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-xs text-muted-foreground">SKU: {item.productSKU}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitPrice || 0)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.lineTotal || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totals */}
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.taxAmount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax:</span>
                        <span className="font-semibold">{formatCurrency(invoice.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {invoice.notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded border">
                        {invoice.notes}
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
                        <span>{new Date(invoice.createdAt).toLocaleString()}</span>
                        <span className="text-muted-foreground">by {invoice.createdByStaffName}</span>
                      </div>
                      {invoice.approvedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <span className="text-muted-foreground">Approved:</span>
                          <span>{new Date(invoice.approvedAt).toLocaleString()}</span>
                          <span className="text-muted-foreground">by {invoice.approvedByStaffName}</span>
                        </div>
                      )}
                      {invoice.paidAt && (
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="w-4 h-4 text-green-600" />
                          <span className="text-muted-foreground">Paid:</span>
                          <span>{new Date(invoice.paidAt).toLocaleString()}</span>
                          <span className="text-muted-foreground">by {invoice.paidByStaffName}</span>
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