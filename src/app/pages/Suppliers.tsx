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
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, User, Building2, FileText, Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useSupplier } from "../contexts/SupplierContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";

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
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSupplier();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(emptyForm);

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
  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.contactPerson.toLowerCase().includes(query) ||
      supplier.phone.includes(query) ||
      supplier.email.toLowerCase().includes(query)
    );
  });

  const handleAddSupplier = () => {
    if (!formData.name.trim()) {
      return;
    }

    addSupplier(formData);
    setFormData(emptyForm);
    setIsAddDialogOpen(false);
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

  const handleUpdateSupplier = () => {
    if (!selectedSupplierId || !formData.name.trim()) {
      return;
    }

    updateSupplier(selectedSupplierId, formData);
    setFormData(emptyForm);
    setSelectedSupplierId(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteClick = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedSupplierId) {
      deleteSupplier(selectedSupplierId);
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
  // ═══════════════════════════════════════════════════════════════════
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

    setIsProcessingImport(true);
    const errors: string[] = [];
    const warnings: string[] = [];
    const success: string[] = [];

    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Find header row
      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length > 0 && row.includes("Supplier Name")) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        errors.push("Could not find header row. Please use the template format.");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      const headers = jsonData[headerRowIndex];
      const dataRows = jsonData.slice(headerRowIndex + 1).filter(row =>
        row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== "")
      );

      if (dataRows.length === 0) {
        errors.push("No data rows found in file");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Create header map
      const headerMap: Record<string, number> = {};
      headers.forEach((header: string, index: number) => {
        if (header) headerMap[header.trim()] = index;
      });

      // Validate headers
      if (!("Supplier Name" in headerMap)) {
        errors.push("Missing required column: Supplier Name");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = headerRowIndex + i + 2;

        try {
          const supplierName = row[headerMap["Supplier Name"]]?.toString().trim() || "";
          const contactPerson = row[headerMap["Contact Person"]]?.toString().trim() || "";
          const phone = row[headerMap["Phone"]]?.toString().trim() || "";
          const email = row[headerMap["Email"]]?.toString().trim() || "";
          const address = row[headerMap["Address"]]?.toString().trim() || "";
          const notes = row[headerMap["Notes"]]?.toString().trim() || "";
          const pinNumber = row[headerMap["PIN Number"]]?.toString().trim() || "";

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

          // Check for duplicate supplier name
          const existingSupplier = suppliers.find(
            s => s.name.toLowerCase() === supplierName.toLowerCase()
          );

          if (existingSupplier) {
            warnings.push(`Row ${rowNum}: Supplier "${supplierName}" already exists, skipped`);
            continue;
          }

          // Add supplier
          addSupplier({
            name: supplierName,
            contactPerson: contactPerson,
            phone: phone,
            email: email,
            address: address,
            notes: notes,
            pinNumber: pinNumber
          });

          success.push(`Row ${rowNum}: Added supplier "${supplierName}"`);
        } catch (error) {
          console.error(`Error processing row ${rowNum}:`, error);
          errors.push(`Row ${rowNum}: Failed to process row`);
        }
      }

      setImportValidation({ errors, warnings, success, totalRows: dataRows.length });

      if (errors.length === 0 && success.length > 0) {
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
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Supplier Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your suppliers and vendor contacts
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div className="flex gap-3">
            {/* Import from Excel Button */}
            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
              if (!open) resetImportDialog();
              setIsImportDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Suppliers from Excel</DialogTitle>
                  <DialogDescription>
                    Upload an Excel file to bulk import suppliers
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Template Download */}
                  <Alert>
                    <FileSpreadsheet className="h-4 w-4" />
                    <AlertTitle>Need a template?</AlertTitle>
                    <AlertDescription>
                      Download our Excel template with instructions
                    </AlertDescription>
                    <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={downloadImportTemplate}>
                      <Download className="w-3.5 h-3.5" />
                      Download Template
                    </Button>
                  </Alert>

                  {/* File Upload */}
                  <div className="grid gap-2">
                    <Label htmlFor="file-upload">Upload Excel File (.xlsx)</Label>
                    <Input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="cursor-pointer" />
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
                    <div className="space-y-2 text-sm text-muted-foreground border rounded-lg p-4 bg-muted/30">
                      <p className="font-medium text-foreground">📋 Import Guidelines:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
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

            {/* Export to Excel Button */}
            <Button variant="outline" onClick={exportSuppliersToExcel} className="gap-2" disabled={filteredSuppliers.length === 0}>
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
          <div className="flex gap-3">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Suppliers</CardDescription>
            <CardTitle className="text-3xl">{suppliers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Contacts</CardDescription>
            <CardTitle className="text-3xl">
              {suppliers.filter((s) => s.email || s.phone).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>With Notes</CardDescription>
            <CardTitle className="text-3xl">
              {suppliers.filter((s) => s.notes).length}
            </CardTitle>
          </CardHeader>
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