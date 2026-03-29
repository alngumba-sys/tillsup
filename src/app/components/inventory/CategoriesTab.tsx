import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Plus, Edit, Ban, CircleCheck, Tag, Upload, Download, FileSpreadsheet, AlertTriangle, XCircle, Trash2 } from "lucide-react";
import { useCategory } from "../../contexts/CategoryContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { validateSubscriptionForImport } from "../../utils/subscriptionGuard";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { SchemaError } from "./SchemaError";

export function CategoriesTab() {
  const {
    categories,
    activeCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    disableCategory,
    enableCategory,
    getCategoryByName,
    error,
  } = useCategory();
  const { business } = useAuth();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; description: string } | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════
  // DELETE CONFIRMATION STATE
  // ═══════════════════════════════════════════════════════════════════
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
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

  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest">("name-asc");

  const displayedCategories = categories
    .filter((category) => {
      const matchesSearch =
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || category.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.name.localeCompare(b.name);
    });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
  };

  const handleAddCategory = async () => {
    const name = formData.name.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }

    // Check for duplicates (case-insensitive) to prevent DB errors
    const existing = getCategoryByName(name);
    if (existing) {
      toast.error(`Category "${existing.name}" already exists`);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await addCategory({
        name: name,
        description: formData.description.trim(),
      });
      
      if (result.success) {
        toast.success("Category created successfully");
        resetForm();
        setIsAddDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to create category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await updateCategory(editingCategory.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
      });

      if (result.success) {
        toast.success("Category updated successfully");
        resetForm();
        setEditingCategory(null);
      } else {
         toast.error(result.error || "Failed to update category");
      }
    } catch (error) {
       console.error("Error updating category:", error);
       toast.error("An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableCategory = async (id: string, name: string) => {
    const result = await disableCategory(id);
    if (result.success) {
      toast.success(`Category "${name}" has been disabled`);
    } else {
      toast.error(result.error || "Failed to disable category");
    }
  };

  const handleEnableCategory = async (id: string, name: string) => {
    const result = await enableCategory(id);
    if (result.success) {
      toast.success(`Category "${name}" has been enabled`);
    } else {
      toast.error(result.error || "Failed to enable category");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    setIsProcessing(true);
    try {
      const result = await deleteCategory(id);
      if (result.success) {
        toast.success(`Category "${name}" has been deleted`);
        setDeleteConfirmation(null);
      } else {
        toast.error(result.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditDialog = (category: { id: string; name: string; description: string }) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // EXPORT TO EXCEL FUNCTION
  // ═══════════════════════════════════════════════════════════════════
  const exportCategoriesToExcel = () => {
    try {
      const dataToExport = categories.map(category => ({
        "Category Name": category.name,
        "Description": category.description || "",
        "Status": category.status === "active" ? "Active" : "Disabled",
        "Created Date": new Date(category.createdAt).toLocaleDateString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");

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
      a.download = `categories_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${categories.length} categories to Excel`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export categories");
    }
  };

  // ═════════════════════════════════════════���═════════════════════════
  // DOWNLOAD IMPORT TEMPLATE
  // ═══════════════════════════════════════════════════════════════════
  const downloadImportTemplate = () => {
    const templateData = [
      {
        "Category Name": "",
        "Description": "",
        "Status": "Active"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Add instructions
    const instructions = [
      "INSTRUCTIONS:",
      "1. Fill in all rows with category data",
      "2. Required field: Category Name",
      "3. Optional fields: Description, Status",
      "4. Status can be 'Active' or 'Disabled' (defaults to Active if not specified)",
      "5. If a category with the same name exists, it will be updated",
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
    a.download = "categories_import_template.xlsx";
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

      // Find header row
      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length > 0 && row.includes("Category Name")) {
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
      if (!("Category Name" in headerMap)) {
        errors.push("Missing required column: Category Name");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = headerRowIndex + i + 2;

        try {
          const categoryName = row[headerMap["Category Name"]]?.toString().trim() || "";
          const description = row[headerMap["Description"]]?.toString().trim() || "";
          const statusValue = row[headerMap["Status"]]?.toString().trim() || "Active";

          // Validation
          if (!categoryName) {
            errors.push(`Row ${rowNum}: Category name is required`);
            continue;
          }

          // Check for existing category with same name (case-insensitive)
          const existingCategory = getCategoryByName(categoryName);

          if (existingCategory) {
            // Update existing category
            updateCategory(existingCategory.id, {
              description: description || existingCategory.description,
              status: statusValue.toLowerCase() === "disabled" ? "disabled" : "active"
            });

            warnings.push(`Row ${rowNum}: Category "${categoryName}" already exists, updated instead`);
          } else {
            // Create new category
            addCategory({
              name: categoryName,
              description: description
            });

            // If status is disabled, we need to disable it after creation
            if (statusValue.toLowerCase() === "disabled") {
              const newCategory = getCategoryByName(categoryName);
              if (newCategory) {
                disableCategory(newCategory.id);
              }
            }

            success.push(`Row ${rowNum}: Created category "${categoryName}"`);
          }
        } catch (error) {
          console.error(`Error processing row ${rowNum}:`, error);
          errors.push(`Row ${rowNum}: Failed to process row`);
        }
      }

      setImportValidation({ errors, warnings, success, totalRows: dataRows.length });

      if (errors.length === 0 && (success.length > 0 || warnings.length > 0)) {
        toast.success(`Successfully processed ${success.length + warnings.length} categories`);
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
    <div className="space-y-6">
      {/* Schema Error Display */}
      {error && <SchemaError error={error} />}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground text-sm">
            Track and manage product categories
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          {/* Import Dialog */}
          <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
            if (!open) resetImportDialog();
            setIsImportDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Import Categories
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Categories from Excel</DialogTitle>
              <DialogDescription>
                Upload an Excel file to bulk import or update categories
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              {/* Template Download */}
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertTitle>Need a template?</AlertTitle>
                <AlertDescription>
                  Download our Excel template with instructions
                </AlertDescription>
                <Button variant="outline" size="sm" className="mt-2 flex items-center gap-2" onClick={downloadImportTemplate}>
                  <Download className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Download Template</span>
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
                      <CircleCheck className="h-4 w-4 text-green-600" />
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
                    <li>Required column: Category Name</li>
                    <li>Optional columns: Description, Status</li>
                    <li>Status can be 'Active' or 'Disabled'</li>
                    <li>Existing categories will be updated (no deletion)</li>
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
                    Import Categories
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Category Button */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setEditingCategory(null);
              }} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new category for organizing your products.
                </DialogDescription>
              </DialogHeader>
              
              {/* Show schema error inside dialog if it occurs during creation */}
              {error && <SchemaError error={error} />}

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Category Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    placeholder="e.g., Beverages, Food, Electronics"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">
                    Description <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this category"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button onClick={handleAddCategory} disabled={isProcessing}>
                  {isProcessing ? "Adding..." : "Add Category"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            {categories.length === 0
              ? "No categories created yet. Add your first category to get started."
              : "Manage and organize your product categories"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sm:max-w-sm"
              />
              <Select value={statusFilter} onValueChange={(value: "all" | "active" | "disabled") => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: "name-asc" | "name-desc" | "newest") => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[190px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-3">
                <Tag className="w-8 h-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No Categories Yet</h3>
              <p className="mb-4 text-sm text-muted-foreground max-w-sm">
                Create your first category to start organizing your products. Categories help you manage
                and filter your inventory efficiently.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Category
              </Button>
            </div>
          ) : displayedCategories.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No categories match the current search/filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || (
                        <span className="italic text-muted-foreground/60">No description</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.status === "active" ? (
                        <Badge variant="default" className="gap-1">
                          <CircleCheck className="w-3 h-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Ban className="w-3 h-3" />
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(category)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        {category.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisableCategory(category.id, category.name)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Disable
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnableCategory(category.id, category.name)}
                          >
                            <CircleCheck className="w-3 h-3 mr-1" />
                            Enable
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmation({ isOpen: true, id: category.id, name: category.name })}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
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

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Beverages, Food, Electronics"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">
                Description <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory} disabled={isProcessing}>
              {isProcessing ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation?.isOpen || false} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the category "{deleteConfirmation?.name}"?
              <br />
              This action cannot be undone. Products in this category may become uncategorized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmation(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmation && handleDeleteCategory(deleteConfirmation.id, deleteConfirmation.name)}
              disabled={isProcessing}
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}