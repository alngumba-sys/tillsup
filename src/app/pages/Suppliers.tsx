import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, User, Building2, FileText, Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Truck, Package, CreditCard } from "lucide-react";
import { useSupplier } from "../contexts/SupplierContext";
import { usePurchaseOrder } from "../contexts/PurchaseOrderContext";
import { useCurrency } from "../hooks/useCurrency";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { validateSubscriptionForImport } from "../utils/subscriptionGuard";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { SchemaError } from "../components/inventory/SchemaError";

interface SupplierFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  pinNumber: string;
}

const emptyForm: SupplierFormData = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  pinNumber: "",
};

export function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, error } = useSupplier();
  const { purchaseOrders } = usePurchaseOrder();
  const { formatCurrency } = useCurrency();
  const { business } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(emptyForm);
  const [contactFilter, setContactFilter] = useState<"all" | "with-contact" | "no-contact">("all");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "contact-asc">("name-asc");

  // ═══════════════════════════════════════════════════════════════════
  // IMPORT/EXPORT STATE
  // ═══════════════════════════════════════════════════════════════════
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importValidation, setImportValidation] = useState<{
    errors: string[];
    warnings: string[];
    success: string[];
    totalRows: number;
  } | null>(null);

  // Filter suppliers based on search query
  const filteredSuppliers = suppliers
    .filter((supplier) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        supplier.name.toLowerCase().includes(query) ||
        supplier.contactPerson.toLowerCase().includes(query) ||
        supplier.phone.includes(query) ||
        supplier.email.toLowerCase().includes(query);

      const hasContact = Boolean(supplier.phone || supplier.email);
      const matchesContactFilter =
        contactFilter === "all" ||
        (contactFilter === "with-contact" && hasContact) ||
        (contactFilter === "no-contact" && !hasContact);

      return matchesSearch && matchesContactFilter;
    })
    .sort((a, b) => {
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "contact-asc") {
        return (a.contactPerson || "").localeCompare(b.contactPerson || "");
      }
      return a.name.localeCompare(b.name);
    });

  // ═══════════════════════════════════════════════════════════════════
  // SUPPLIER STATISTICS — Derived from Purchase Orders
  // ═══════════════════════════════════════════════════════════════════

  // Card 1: Active Suppliers — suppliers with deliveries (POs) in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeSupplierIds = new Set(
    purchaseOrders
      .filter(po => {
        const poDate = new Date(po.createdAt);
        return poDate >= thirtyDaysAgo;
      })
      .map(po => po.supplierId)
  );
  const activeSupplierCount = activeSupplierIds.size;

  // Card 2: Pending Deliveries — POs with status 'Sent' or 'Approved' (i.e. pending/shipped delivery)
  const pendingDeliveryCount = purchaseOrders.filter(
    po => po.status === "Sent" || po.status === "Approved"
  ).length;

  // Card 3: Monthly Spend (MTD) — total KES value of completed ('Delivered') POs this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlySpend = purchaseOrders
    .filter(po => {
      const poDate = new Date(po.createdAt);
      return po.status === "Delivered" && poDate >= monthStart;
    })
    .reduce((sum, po) => sum + (po.totalAmount || 0), 0);

  const handleAddSupplier = async () => {
    if (!formData.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    try {
      console.log("Adding supplier with data:", formData);
      await addSupplier(formData);
      setFormData(emptyForm);
      setIsAddDialogOpen(false);
      // Success toast is shown in context
    } catch (error) {
      console.error("Error in handleAddSupplier:", error);
      // Error toast already handled in context
    }
  };

  const handleEditClick = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (supplier) {
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        notes: supplier.notes,
        pinNumber: supplier.pinNumber || ""
      });
      setSelectedSupplierId(supplierId);
      setIsEditDialogOpen(true);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!selectedSupplierId || !formData.name.trim()) {
      return;
    }

    await updateSupplier(selectedSupplierId, formData);
    setFormData(emptyForm);
    setSelectedSupplierId(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteClick = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedSupplierId) {
      await deleteSupplier(selectedSupplierId);
      setSelectedSupplierId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleCancelDialog = () => {
    setFormData(emptyForm);
    setSelectedSupplierId(null);
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // EXPORT TO EXCEL FUNCTION
  // ═══════════════════════════════════════════════════════════════════
  const exportSuppliersToExcel = () => {
    try {
      const dataToExport = filteredSuppliers.map(supplier => ({
        "Supplier Name": supplier.name,
        "Contact Person": supplier.contactPerson || "",
        "Phone": supplier.phone || "",
        "Email": supplier.email || "",
        "Address": supplier.address || "",
        "Notes": supplier.notes || "",
        "PIN Number": supplier.pinNumber || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = Object.keys(dataToExport[0] || {}).map(key => {
        const maxLen = Math.max(
          key.length,
          ...dataToExport.map(row => String(row[key as keyof typeof row] || "").length)
        );
        return { wch: Math.min(maxLen + 2, maxWidth) };
      });
      worksheet["!cols"] = colWidths;

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array"
      });

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `suppliers_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredSuppliers.length} suppliers to Excel`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export suppliers");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // DOWNLOAD IMPORT TEMPLATE
  // ═══════════════════════════════════════════════════════════════════
  const downloadImportTemplate = () => {
    const templateData = [
      {
        "Supplier Name": "",
        "Contact Person": "",
        "Phone": "",
        "Email": "",
        "Address": "",
        "Notes": "",
        "PIN Number": ""
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Add instructions
    const instructions = [
      "INSTRUCTIONS:",
      "1. Fill in all rows with supplier data",
      "2. Required field: Supplier Name",
      "3. Optional fields: Contact Person, Phone, Email, Address, Notes, PIN Number",
      "4. Email format must be valid (e.g., contact@company.com)",
      "5. Phone can be in any format",
      "6. Delete this row and the example row before importing",
      ""
    ];

    XLSX.utils.sheet_add_aoa(worksheet, instructions.map(i => [i]), { origin: "A1" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "suppliers_import_template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded successfully");
  };

  // ═══════════════════════════════════════════════════════════════════
  // HANDLE FILE UPLOAD
  // ══════════════════════════════════════════���════════════════════════
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportValidation(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATE AND IMPORT EXCEL DATA
  // ═══════════════════════════════════════════════════════════════════
  const validateAndImportExcel = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    // Check subscription status before allowing import
    if (business?.id) {
      try {
        await validateSubscriptionForImport(business.id);
      } catch (error: any) {
        toast.error("Import Blocked", {
          description: error.message || "Subscription Inactive: Please renew your subscription to perform bulk imports."
        });
        return;
      }
    }

    setIsProcessingImport(true);
    const errors: string[] = [];
    const warnings: string[] = [];
    const success: string[] = [];

    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Find header row (case-insensitive, trimmed)
      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length > 0 && row.some((cell: any) => cell && typeof cell === "string" && cell.trim().toLowerCase() === "supplier name")) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        errors.push("Could not find header row. Make sure your file has a 'Supplier Name' column header.");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Normalize headers: trim and lowercase for mapping
      const rawHeaders = jsonData[headerRowIndex];
      const headerMap: Record<string, number> = {};
      rawHeaders.forEach((header: string, index: number) => {
        if (header) headerMap[header.toString().trim()] = index;
      });

      // Extract data rows (skip header row, filter empty rows)
      const dataRows = jsonData.slice(headerRowIndex + 1).filter(row =>
        row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== "")
      );

      if (dataRows.length === 0) {
        errors.push("No data rows found in file");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Validate headers — check both trimmed key and lowercase for robustness
      const headerKeys = Object.keys(headerMap).map(k => k.toLowerCase());
      if (!headerKeys.includes("supplier name")) {
        errors.push("Missing required column: 'Supplier Name'. Found columns: " + Object.keys(headerMap).join(", "));
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Process each row
      // Helper: find column index by flexible name matching
      const findCol = (name: string): number | undefined => {
        // Try exact match first
        if (headerMap[name] !== undefined) return headerMap[name];
        // Try case-insensitive match
        const lowered = name.toLowerCase();
        for (const [key, idx] of Object.entries(headerMap)) {
          if (key.toLowerCase() === lowered) return idx;
        }
        return undefined;
      };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = headerRowIndex + i + 2;

        try {
          const supplierName = (findCol("Supplier Name") !== undefined ? row[findCol("Supplier Name")] : row[findCol("Supplier Name")])?.toString().trim() || "";
          const contactPerson = (findCol("Contact Person") !== undefined ? row[findCol("Contact Person")] : "")?.toString().trim() || "";
          const phone = (findCol("Phone") !== undefined ? row[findCol("Phone")] : "")?.toString().trim() || "";
          const email = (findCol("Email") !== undefined ? row[findCol("Email")] : "")?.toString().trim() || "";
          const address = (findCol("Address") !== undefined ? row[findCol("Address")] : "")?.toString().trim() || "";
          const notes = (findCol("Notes") !== undefined ? row[findCol("Notes")] : "")?.toString().trim() || "";
          const pinNumber = (findCol("PIN Number") !== undefined ? row[findCol("PIN Number")] : "")?.toString().trim() || "";

          // Validation
          if (!supplierName) {
            errors.push(`Row ${rowNum}: Supplier name is required`);
            continue;
          }

          // Email validation (if provided)
          if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            errors.push(`Row ${rowNum}: Invalid email format for "${supplierName}"`);
            continue;
          }

          // Check for duplicate supplier name (case-insensitive, trimmed)
          const existingSupplier = suppliers.find(
            s => s.name.trim().toLowerCase() === supplierName.toLowerCase()
          );

          if (existingSupplier) {
            warnings.push(`Row ${rowNum}: Supplier "${supplierName}" already exists, skipped`);
            continue;
          }

          // Add supplier (awaited — addSupplier throws on DB errors)
          try {
            await addSupplier({
              name: supplierName,
              contactPerson: contactPerson,
              phone: phone,
              email: email,
              address: address,
              notes: notes,
              pinNumber: pinNumber
            });
            success.push(`Row ${rowNum}: Added supplier "${supplierName}"`);
          } catch (addErr: any) {
            const errMsg = addErr?.message || addErr?.toString() || "Unknown error";
            // Duplicate from DB (unique constraint) — treat as warning, not error
            if (errMsg.toLowerCase().includes("duplicate")) {
              warnings.push(`Row ${rowNum}: Supplier "${supplierName}" already exists (duplicate), skipped`);
            } else {
              errors.push(`Row ${rowNum}: Failed to add "${supplierName}" — ${errMsg}`);
            }
          }
        } catch (error: any) {
          console.error(`Error processing row ${rowNum}:`, error);
          const errMsg = error?.message || error?.toString() || "Unknown error";
          errors.push(`Row ${rowNum}: Failed to process row — ${errMsg}`);
        }
      }

      setImportValidation({ errors, warnings, success, totalRows: dataRows.length });

      if (errors.length === 0 && (success.length > 0 || warnings.length > 0)) {
        toast.success(`Successfully imported ${success.length} suppliers`);
        setTimeout(() => {
          setIsImportDialogOpen(false);
          setImportFile(null);
          setImportValidation(null);
        }, 3000);
      } else if (errors.length > 0) {
        toast.error(`Import completed with ${errors.length} errors`);
      }
    } catch (error) {
      console.error("Import error:", error);
      errors.push("Failed to read Excel file. Please ensure it's a valid .xlsx file");
      setImportValidation({ errors, warnings, success, totalRows: 0 });
    }

    setIsProcessingImport(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // RESET IMPORT DIALOG
  // ═══════════════════════════════════════════════════════════════════
  const resetImportDialog = () => {
    setImportFile(null);
    setImportValidation(null);
    setIsImportDialogOpen(false);
  };

  return (
    <div className="space-y-6 px-[24px] py-[0px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-2">
        <div>
          <h1 className="text-2xl font-semibold">Supplier Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your suppliers and vendor contacts
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Import from Excel Button */}
          <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
            if (!open) resetImportDialog();
            setIsImportDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Import Suppliers
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Suppliers from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file to bulk import suppliers
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-6">
                {/* Template Download */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#00719C]/5 border border-[#00719C]/20">
                  <FileSpreadsheet className="w-5 h-5 text-[#00719C] flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#00719C]">Need a template?</p>
                    <p className="text-xs text-slate-500">Download our Excel template with instructions</p>
                  </div>
                  <Button size="sm" className="flex items-center gap-2 bg-[#00719C] hover:bg-[#005d81] text-white flex-shrink-0" onClick={downloadImportTemplate}>
                    <Download className="w-4 h-4" />
                    <span className="font-semibold">Download Template</span>
                  </Button>
                </div>

                {/* File Upload */}
                <div className="grid gap-2">
                  <Label htmlFor="file-upload">Upload Excel File (.xlsx)</Label>
                  <div className="p-2">
                    <Input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="cursor-pointer" />
                  </div>
                  {importFile && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      {importFile.name}
                    </p>
                  )}
                </div>

                {/* Validation Results */}
                {importValidation && (
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {importValidation.success.length > 0 && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-900">Success ({importValidation.success.length})</AlertTitle>
                        <AlertDescription className="text-green-800">
                          <ul className="list-disc list-inside space-y-1 text-xs mt-2">
                            {importValidation.success.slice(0, 5).map((msg, idx) => (
                              <li key={idx}>{msg}</li>
                            ))}
                            {importValidation.success.length > 5 && (
                              <li className="italic">... and {importValidation.success.length - 5} more</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {importValidation.warnings.length > 0 && (
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-900">Warnings ({importValidation.warnings.length})</AlertTitle>
                        <AlertDescription className="text-amber-800">
                          <ul className="list-disc list-inside space-y-1 text-xs mt-2">
                            {importValidation.warnings.slice(0, 5).map((msg, idx) => (
                              <li key={idx}>{msg}</li>
                            ))}
                            {importValidation.warnings.length > 5 && (
                              <li className="italic">... and {importValidation.warnings.length - 5} more</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {importValidation.errors.length > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Errors ({importValidation.errors.length})</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1 text-xs mt-2">
                            {importValidation.errors.slice(0, 5).map((msg, idx) => (
                              <li key={idx}>{msg}</li>
                            ))}
                            {importValidation.errors.length > 5 && (
                              <li className="italic">... and {importValidation.errors.length - 5} more</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="text-sm text-muted-foreground border-t pt-2">
                      Processed {importValidation.totalRows} rows from Excel file
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {!importValidation && (
                  <div className="space-y-2 text-sm border rounded-lg p-4 bg-muted/30">
                    <p className="font-medium text-foreground">📋 Import Guidelines:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-slate-800">
                      <li>Required column: Supplier Name</li>
                      <li>Optional columns: Contact Person, Phone, Email, Address, Notes, PIN Number</li>
                      <li>Email format must be valid if provided</li>
                      <li>Duplicate supplier names will be skipped</li>
                    </ul>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetImportDialog}>Cancel</Button>
                <Button onClick={validateAndImportExcel} disabled={!importFile || isProcessingImport} className="gap-2">
                  {isProcessingImport ? "Processing..." : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Suppliers
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Supplier Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Supplier</DialogTitle>
                  <DialogDescription>
                    Enter the supplier details below. All fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Supplier Name */}
                  <div className="grid gap-2">
                    <Label htmlFor="add-name">
                      Supplier Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="add-name"
                        className="pl-10"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Fresh Foods Co."
                      />
                    </div>
                  </div>

                  {/* Contact Person */}
                  <div className="grid gap-2">
                    <Label htmlFor="add-contact">Contact Person</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="add-contact"
                        className="pl-10"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        placeholder="e.g., John Smith"
                      />
                    </div>
                  </div>

                  {/* Phone and Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="add-phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="add-phone"
                          className="pl-10"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+254-712-345-678"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="add-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="add-email"
                          type="email"
                          className="pl-10"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="supplier@company.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="grid gap-2">
                    <Label htmlFor="add-address">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Textarea
                        id="add-address"
                        className="pl-10 min-h-[60px]"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Market Street, Nairobi"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="grid gap-2">
                    <Label htmlFor="add-notes">Notes</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Textarea
                        id="add-notes"
                        className="pl-10 min-h-[80px]"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional information about this supplier..."
                      />
                    </div>
                  </div>

                  {/* PIN Number */}
                  <div className="grid gap-2">
                    <Label htmlFor="add-pin">PIN Number</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="add-pin"
                        className="pl-10"
                        value={formData.pinNumber}
                        onChange={(e) => setFormData({ ...formData, pinNumber: e.target.value })}
                        placeholder="Enter PIN Number"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCancelDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSupplier} disabled={!formData.name.trim()}>
                    Add Supplier
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Card 1: Active Suppliers (blue) */}
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Active Suppliers</span>
              <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Truck className="w-2.5 h-2.5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-slate-900 leading-none truncate">{activeSupplierCount}</span>
            </div>
            <p className="text-[9px] text-slate-400">Deliveries in last 30 days</p>
          </CardContent>
        </Card>

        {/* Card 2: Pending Deliveries (orange) */}
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Pending Deliveries</span>
              <div className="w-5 h-5 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Package className="w-2.5 h-2.5 text-orange-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-slate-900 leading-none truncate">{pendingDeliveryCount}</span>
            </div>
            <p className="text-[9px] text-slate-400">Sent or Approved POs</p>
          </CardContent>
        </Card>

        {/* Card 3: Procurement MTD (green) */}
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Procurement (MTD)</span>
              <div className="w-5 h-5 rounded-md bg-green-50 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-2.5 h-2.5 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-slate-900 leading-none truncate">{formatCurrency(monthlySpend)}</span>
            </div>
            <p className="text-[9px] text-slate-400">Completed deliveries this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription className="mt-1">
                {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={contactFilter} onValueChange={(value: "all" | "with-contact" | "no-contact") => setContactFilter(value)}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Contact Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="with-contact">With Contact</SelectItem>
                <SelectItem value="no-contact">No Contact</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: "name-asc" | "name-desc" | "contact-asc") => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="contact-asc">Contact Person (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No suppliers found matching your search."
                  : "No suppliers yet. Add your first supplier to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>PIN Number</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{supplier.name}</span>
                          {supplier.address && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {supplier.address}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.contactPerson || (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.phone ? (
                          <a
                            href={`tel:${supplier.phone}`}
                            className="flex items-center gap-1.5 text-blue-600 hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {supplier.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.email ? (
                          <a
                            href={`mailto:${supplier.email}`}
                            className="flex items-center gap-1.5 text-blue-600 hover:underline"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            {supplier.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.pinNumber || (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditClick(supplier.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(supplier.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update the supplier details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Supplier Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Supplier Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-name"
                  className="pl-10"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Fresh Foods Co."
                />
              </div>
            </div>

            {/* Contact Person */}
            <div className="grid gap-2">
              <Label htmlFor="edit-contact">Contact Person</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-contact"
                  className="pl-10"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g., John Smith"
                />
              </div>
            </div>

            {/* Phone and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="edit-phone"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+254-712-345-678"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="edit-email"
                    type="email"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="supplier@company.com"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea
                  id="edit-address"
                  className="pl-10 min-h-[60px]"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Market Street, Nairobi"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea
                  id="edit-notes"
                  className="pl-10 min-h-[80px]"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information about this supplier..."
                />
              </div>
            </div>

            {/* PIN Number */}
            <div className="grid gap-2">
              <Label htmlFor="edit-pin">PIN Number</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-pin"
                  className="pl-10"
                  value={formData.pinNumber}
                  onChange={(e) => setFormData({ ...formData, pinNumber: e.target.value })}
                  placeholder="Enter PIN Number"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDialog}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSupplier} disabled={!formData.name.trim()}>
              Update Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this supplier? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSupplierId(null);
                setIsDeleteDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}