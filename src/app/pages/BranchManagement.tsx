import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  DialogFooter,
  DialogTrigger
} from "../components/ui/dialog";
import { Building2, Plus, MapPin, Edit, CheckCircle, XCircle, Upload, Download, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { useBranch } from "../contexts/BranchContext";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { useNavigate } from "react-router";

export function BranchManagement() {
  const { user, business } = useAuth();
  const { branches, createBranch, updateBranch } = useBranch();
  const { canCreateBranch, plan, usage, limits } = useSubscription();
  const navigate = useNavigate();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    location: ""
  });

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

  const handleAddBranch = () => {
    const result = createBranch(formData.name, formData.location);
    
    if (result.success) {
      toast.success("Branch created successfully!");
      setIsAddDialogOpen(false);
      resetForm();
    } else {
      toast.error(result.error || "Failed to create branch");
    }
  };

  const handleEditBranch = () => {
    if (!editingBranch) return;
    
    const result = updateBranch(editingBranch, {
      name: formData.name,
      location: formData.location
    });
    
    if (result.success) {
      toast.success("Branch updated successfully!");
      setEditingBranch(null);
      setIsAddDialogOpen(false);
      resetForm();
    } else {
      toast.error(result.error || "Failed to update branch");
    }
  };

  const handleToggleStatus = (branchId: string, currentStatus: "active" | "inactive") => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const result = updateBranch(branchId, { status: newStatus });
    
    if (result.success) {
      toast.success(`Branch ${newStatus === "active" ? "activated" : "deactivated"} successfully!`);
    } else {
      toast.error(result.error || "Failed to update branch status");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", location: "" });
  };

  const openAddDialog = () => {
    // Check plan limits
    if (!canCreateBranch()) {
      toast.error("Branch Limit Reached", {
        description: `Your ${plan.name} plan is limited to ${limits.maxBranches} branches. Please upgrade to add more.`
      });
      // Optionally navigate to billing
      // navigate("/app/subscription");
      return;
    }

    resetForm();
    setEditingBranch(null);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setFormData({
        name: branch.name,
        location: branch.location
      });
      setEditingBranch(branchId);
      setIsAddDialogOpen(true);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // EXPORT TO EXCEL FUNCTION
  // ═══════════════════════════════════════════════════════════════════
  const exportBranchesToExcel = () => {
    try {
      const dataToExport = branches.map(branch => ({
        "Branch Name": branch.name,
        "Location": branch.location || "",
        "Status": branch.status === "active" ? "Active" : "Inactive",
        "Created Date": new Date(branch.createdAt).toLocaleDateString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Branches");

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
      a.download = `branches_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${branches.length} branches to Excel`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export branches");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // DOWNLOAD IMPORT TEMPLATE
  // ═══════════════════════════════════════════════════════════════════
  const downloadImportTemplate = () => {
    const templateData = [
      {
        "Branch Name": "",
        "Location": "",
        "Status": "Active"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Add instructions
    const instructions = [
      "INSTRUCTIONS:",
      "1. Fill in all rows with branch data",
      "2. Required field: Branch Name",
      "3. Optional fields: Location, Status",
      "4. Status can be 'Active' or 'Inactive' (defaults to Active if not specified)",
      "5. If a branch with the same name exists, it will be updated",
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
    a.download = "branches_import_template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded successfully");
  };

  // ═══════════════════════════════════════════════════════════════════
  // HANDLE FILE UPLOAD
  // ═══════════════════════════════════════════════════════════════════
  const handleImportFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        if (row && row.length > 0 && row.includes("Branch Name")) {
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
      if (!("Branch Name" in headerMap)) {
        errors.push("Missing required column: Branch Name");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = headerRowIndex + i + 2;

        try {
          const branchName = row[headerMap["Branch Name"]]?.toString().trim() || "";
          const location = row[headerMap["Location"]]?.toString().trim() || "";
          const statusValue = row[headerMap["Status"]]?.toString().trim() || "Active";

          // Validation
          if (!branchName) {
            errors.push(`Row ${rowNum}: Branch name is required`);
            continue;
          }

          // Check for existing branch with same name
          const existingBranch = branches.find(
            b => b.name.toLowerCase() === branchName.toLowerCase()
          );

          if (existingBranch) {
            // Update existing branch
            const result = updateBranch(existingBranch.id, {
              location: location || existingBranch.location,
              status: statusValue.toLowerCase() === "inactive" ? "inactive" : "active"
            });

            if (result.success) {
              warnings.push(`Row ${rowNum}: Branch "${branchName}" already exists, updated instead`);
            } else {
              errors.push(`Row ${rowNum}: Failed to update branch "${branchName}"`);
            }
          } else {
            // Create new branch
            const result = createBranch(branchName, location);

            if (result.success) {
              // Set status if different from default
              if (statusValue.toLowerCase() === "inactive" && result.branchId) {
                updateBranch(result.branchId, { status: "inactive" });
              }
              success.push(`Row ${rowNum}: Created branch "${branchName}"`);
            } else {
              errors.push(`Row ${rowNum}: ${result.error || "Failed to create branch"}`);
            }
          }
        } catch (error) {
          console.error(`Error processing row ${rowNum}:`, error);
          errors.push(`Row ${rowNum}: Failed to process row`);
        }
      }

      setImportValidation({ errors, warnings, success, totalRows: dataRows.length });

      if (errors.length === 0 && (success.length > 0 || warnings.length > 0)) {
        toast.success(`Successfully processed ${success.length + warnings.length} branches`);
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

  // Only Business Owners can manage branches
  if (user?.role !== "Business Owner") {
    return (
      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-3xl mb-1">Branch Management</h1>
          <p className="text-muted-foreground">Manage your business locations</p>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-8 text-center">
            <p className="text-amber-800">Only Business Owners can manage branches.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl mb-1">Branch Management</h1>
        <p className="text-muted-foreground">Manage your business locations</p>
      </div>

      {/* Action Buttons - Import, Export, Add */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-3">
          {/* Import Dialog */}
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
                <DialogTitle>Import Branches from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file to bulk import or update branches
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
                  <Input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleImportFileUpload} className="cursor-pointer" />
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
                      <li>Required column: Branch Name</li>
                      <li>Optional columns: Location, Status</li>
                      <li>Status can be 'Active' or 'Inactive'</li>
                      <li>Existing branches will be updated (no deletion)</li>
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
                      Import Branches
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Export Button */}
          <Button variant="outline" onClick={exportBranchesToExcel} className="gap-2" disabled={branches.length === 0}>
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>

        <div className="flex gap-3">
          {/* Add Branch Button */}
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Branch
          </Button>
        </div>
      </div>

      {/* Branch Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Branches</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {branches.filter(b => b.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Branches</CardTitle>
            <XCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {branches.filter(b => b.status === "inactive").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Branches</CardTitle>
          <CardDescription>View and manage all business locations</CardDescription>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No branches found. Create your first branch to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {branch.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {branch.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={branch.status === "active" ? "default" : "secondary"}
                        className={
                          branch.status === "active"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }
                      >
                        {branch.status === "active" ? (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {branch.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(branch.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(branch.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(branch.id, branch.status)}
                        >
                          {branch.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Branch Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "Edit Branch" : "Add New Branch"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? "Update branch information"
                : "Create a new branch location for your business"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name *</Label>
              <Input
                id="branch-name"
                placeholder="e.g., Downtown Branch"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch-location">Location</Label>
              <Input
                id="branch-location"
                placeholder="e.g., 123 Main St, City"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setEditingBranch(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingBranch ? handleEditBranch : handleAddBranch}
              disabled={!formData.name.trim()}
            >
              {editingBranch ? "Save Changes" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
