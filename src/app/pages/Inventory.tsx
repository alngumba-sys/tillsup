import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Truck, 
  Building2, 
  AlertTriangle, 
  Package, 
  Tag,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useInventory } from "../contexts/InventoryContext";
import { useCategory } from "../contexts/CategoryContext";
import { useSupplier } from "../contexts/SupplierContext";
import { useBranch } from "../contexts/BranchContext";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../hooks/useCurrency";
import { useSubscription } from "../hooks/useSubscription";
import { toast } from "sonner";
import { CategoriesTab } from "../components/inventory/CategoriesTab";
import * as XLSX from "xlsx";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { useNavigate } from "react-router";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  supplier: string;
  branchId: string;
  lowStockThreshold?: number;
  // Pricing extension
  costPrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
}

interface ProductFormProps {
  formData: {
    name: string;
    category: string;
    price: string;
    stock: string;
    sku: string;
    supplier: string;
    branchId: string;
    // Pricing extension fields
    costPrice?: string;
    retailPrice?: string;
    wholesalePrice?: string;
  };
  onFormChange: (data: any) => void;
  suppliers: { id: string; name: string }[];
  branches: { id: string; name: string; status: string }[];
  userRole: string;
  userBranchId?: string;
  allCategories: { id: string; name: string; status: "active" | "disabled" }[];
  isEditMode?: boolean;
}

function ProductForm({ formData, onFormChange, suppliers, branches, userRole, userBranchId, allCategories, isEditMode = false }: ProductFormProps) {
  // Filter active branches only
  const activeBranches = branches.filter(b => b.status === "active");
  
  // Determine if branch field should be disabled
  const isBranchDisabled = userRole !== "Business Owner";

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY STATUS VALIDATION
  // ═══════════════════════════════════════════════════════════════════
  const activeCategories = allCategories.filter(cat => cat.status === "active");
  const disabledCategories = allCategories.filter(cat => cat.status === "disabled");
  const selectedCategory = allCategories.find(cat => cat.id === formData.category);
  const isCategoryDeactivated = selectedCategory && selectedCategory.status === "disabled";
  
  // Handle category selection with deactivation check
  const handleCategoryChange = (value: string) => {
    const category = allCategories.find(cat => cat.id === value);
    
    // HARD BLOCK: Prevent selection of deactivated categories
    if (category && category.status === "disabled") {
      toast.error("Category Unavailable", {
        description: "This category is deactivated and cannot be used."
      });
      return; // Block the selection
    }
    
    // Allow selection of active categories
    onFormChange({ ...formData, category: value });
  };
  
  return (
    <div className="grid gap-4 py-4">
      {/* Branch Selection - REQUIRED */}
      <div className="grid gap-2">
        <Label htmlFor="branchId">
          Branch <span className="text-destructive">*</span>
        </Label>
        {activeBranches.length > 0 ? (
          <Select 
            value={formData.branchId} 
            onValueChange={(value) => onFormChange({ ...formData, branchId: value })}
            disabled={isBranchDisabled}
          >
            <SelectTrigger id="branchId" className={isBranchDisabled ? "bg-muted" : ""}>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {activeBranches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    {branch.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-md border border-dashed bg-muted/30">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                No active branches available. Create branches in the Staff tab.
              </p>
            </div>
          </div>
        )}
        {isBranchDisabled && (
          <p className="text-xs text-muted-foreground">
            Products will be added to your assigned branch
          </p>
        )}
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
          placeholder="Enter product name"
        />
      </div>
      
      {/* Category Selection - Uses CategoryContext */}
      <div className="grid gap-2">
        <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
        
        {/* ═══════════════════════════════════════════════════════════════════
            EDGE CASE: Product with deactivated category (Edit Mode)
            ═══════════════════════════════════════════════════════════════════ */}
        {isEditMode && isCategoryDeactivated && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 text-sm">
              This product belongs to a deactivated category.
              <br />
              Please select an active category to continue.
            </AlertDescription>
          </Alert>
        )}

        {allCategories.length > 0 ? (
          <Select 
            value={formData.category} 
            onValueChange={handleCategoryChange}
            disabled={isCategoryDeactivated && !isEditMode}
          >
            <SelectTrigger 
              id="category"
              className={isCategoryDeactivated ? "border-amber-300 bg-amber-50" : ""}
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {/* ═══════════════════════════════════════════════════════════════════
                  ACTIVE CATEGORIES - Fully selectable
                  ═══════════════════════════════════════════════════════════════════ */}
              {activeCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-green-600" />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}

              {/* ═══════════════════════════════════════════════════════════════════
                  DISABLED CATEGORIES - Visible but not selectable
                  ═══════════════════════════════════════════════════════════════════ */}
              {disabledCategories.length > 0 && (
                <>
                  {activeCategories.length > 0 && (
                    <div className="px-2 py-1.5">
                      <div className="h-px bg-border" />
                    </div>
                  )}
                  {disabledCategories.map((cat) => (
                    <SelectItem 
                      key={cat.id} 
                      value={cat.id}
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        {cat.name} <span className="text-xs">(Deactivated)</span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-md border border-dashed bg-destructive/10">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                No categories available
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Please create a category first in the Categories tab before adding products.
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="price">Retail Price ($) <span className="text-destructive">*</span></Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => onFormChange({ ...formData, price: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="stock">Stock Quantity <span className="text-destructive">*</span></Label>
          <Input
            id="stock"
            type="number"
            value={formData.stock}
            onChange={(e) => onFormChange({ ...formData, stock: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════
          PRICING EXTENSION: Additional Pricing Fields
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="costPrice">
            Cost Price ($) <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            value={formData.costPrice || ""}
            onChange={(e) => onFormChange({ ...formData, costPrice: e.target.value })}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">Purchase/supplier price</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="wholesalePrice">
            Wholesale Price ($) <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <Input
            id="wholesalePrice"
            type="number"
            step="0.01"
            value={formData.wholesalePrice || ""}
            onChange={(e) => onFormChange({ ...formData, wholesalePrice: e.target.value })}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">Bulk/wholesale selling price</p>
        </div>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="sku">SKU/Size</Label>
        <Input
          id="sku"
          value={formData.sku}
          onChange={(e) => onFormChange({ ...formData, sku: e.target.value })}
          placeholder="Enter SKU or size"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="supplier">
          Supplier <span className="text-xs text-muted-foreground">(Optional)</span>
        </Label>
        {suppliers.length > 0 ? (
          <Select 
            value={formData.supplier || "__none__"} 
            onValueChange={(value) => onFormChange({ ...formData, supplier: value === "__none__" ? "" : value })}
          >
            <SelectTrigger id="supplier">
              <SelectValue placeholder="Select supplier (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground italic">No supplier</span>
              </SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.name}>
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                    {supplier.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-md border border-dashed bg-muted/30">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                No suppliers available. Add suppliers in the Suppliers tab.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inventory Management Page Component
export function Inventory() {
  const { inventory, addProduct, updateProduct, deleteProduct } = useInventory();
  const { categories: categoryList, activeCategories, addCategory } = useCategory();
  const { suppliers } = useSupplier();
  const { branches, getBranchById, createBranch } = useBranch();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { hasFeature, plan } = useSubscription();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  
  // ═══════════════════════════════════════════════════════════════════
  // STOCK STATUS FILTER - Frontend inventory filtering
  // ═══════════════════════════════════════════════════════════════════
  const [filterStockStatus, setFilterStockStatus] = useState<"All" | "Low Stock" | "Out of Stock">("All");
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
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
  
  // ═══════════════════════════════════════════════════════════════════
  // BRANCH FILTER FOR INVENTORY MANAGEMENT
  // ══════════════════════════════��════════════════════════════════════
  // CRITICAL FIX: Initialize filter based on user role
  // - Business Owner: "ALL_BRANCHES" (can filter freely)
  // - Manager/Staff: user.branchId (locked to assigned branch)
  const getInitialFilterBranchId = (): string => {
    if (user?.role === "Business Owner") {
      return "ALL_BRANCHES";
    }
    // Non-owners: locked to their assigned branch
    return user?.branchId || "";
  };

  const [filterBranchId, setFilterBranchId] = useState<string>(getInitialFilterBranchId());

  // Determine default branch for the user
  const getDefaultBranchId = (): string => {
    if (user?.role === "Business Owner") {
      // Owner can select any active branch, default to first active branch
      const firstActiveBranch = branches.find(b => b.status === "active");
      return firstActiveBranch?.id || "";
    }
    // Staff/Manager: use their assigned branch
    return user?.branchId || "";
  };

  // Get default category ID
  const getDefaultCategoryId = (): string => {
    return activeCategories.length > 0 ? activeCategories[0].id : "";
  };

  const [formData, setFormData] = useState({
    name: "",
    category: getDefaultCategoryId(),
    price: "",
    stock: "",
    sku: "",
    supplier: "",
    branchId: getDefaultBranchId(),
    // Pricing extension fields
    costPrice: "",
    retailPrice: "",
    wholesalePrice: ""
  });

  // Update default branch when branches change
  useEffect(() => {
    if (!formData.branchId) {
      setFormData(prev => ({ ...prev, branchId: getDefaultBranchId() }));
    }
  }, [branches, user]);

  // ═══════════════════════════════════════════════════════════════════
  // CRITICAL: Keep filterBranchId synchronized with user role
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    // For non-owners, lock filter to their assigned branch
    if (user?.role !== "Business Owner" && user?.branchId) {
      setFilterBranchId(user.branchId);
    }
  }, [user?.role, user?.branchId]);

  // ═══════════════════════════════════════════════════════════════════
  // STOCK STATUS HELPER - Determine stock category for filtering
  // ═══════════════════════════════════════════════════════════════════
  const getStockStatusCategory = (item: InventoryItem): "Out of Stock" | "Low Stock" | "In Stock" => {
    const threshold = item.lowStockThreshold || 5; // Default to 5 if not set
    
    if (item.stock === 0) return "Out of Stock";
    if (item.stock > 0 && item.stock <= threshold) return "Low Stock";
    return "In Stock";
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "All" || item.category === filterCategory;
    const matchesBranch = filterBranchId === "ALL_BRANCHES" || item.branchId === filterBranchId;
    
    // Stock status filter logic
    const stockCategory = getStockStatusCategory(item);
    const matchesStockStatus = filterStockStatus === "All" || stockCategory === filterStockStatus;
    
    return matchesSearch && matchesCategory && matchesBranch && matchesStockStatus;
  });

  const handleAddProduct = async () => {
    // Validation
    if (!formData.name.trim()) {
      alert("Product name is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert("Valid price is required");
      return;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      alert("Valid stock quantity is required");
      return;
    }
    if (!formData.branchId) {
      alert("Branch selection is required");
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CATEGORY STATUS VALIDATION - HARD BLOCK
    // ═══════════════════════════════════════════════════════════════════
    const selectedCategory = categoryList.find(cat => cat.id === formData.category);
    if (!selectedCategory) {
      toast.error("Category is required");
      return;
    }
    if (selectedCategory.status === "disabled") {
      toast.error("Invalid Category", {
        description: "This category is deactivated and cannot be used. Please select an active category."
      });
      return;
    }

    try {
      await addProduct({
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        sku: formData.sku,
        supplier: formData.supplier,
        // ═══════════════════════════════════════════════════════════════════
        // PRICING EXTENSION: Include new pricing fields
        // ═══════════════════════════════════════════════════════════════════
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        retailPrice: parseFloat(formData.price), // Same as price for backward compatibility
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined
      }, formData.branchId);
      
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Product added successfully!");
    } catch (error) {
      // Toast already handled in context
    }
  };

  const handleEditProduct = async () => {
    if (editingItem) {
      // Validation
      if (!formData.name.trim()) {
        alert("Product name is required");
        return;
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        alert("Valid price is required");
        return;
      }
      if (!formData.stock || parseInt(formData.stock) < 0) {
        alert("Valid stock quantity is required");
        return;
      }
      if (!formData.branchId) {
        alert("Branch selection is required");
        return;
      }

      // ═══════════════════════════════════════════════════════════════════
      // CATEGORY STATUS VALIDATION - HARD BLOCK
      // ═══════════════════════════════════════════════════════════════════
      const selectedCategory = categoryList.find(cat => cat.id === formData.category);
      if (!selectedCategory) {
        toast.error("Category is required");
        return;
      }
      if (selectedCategory.status === "disabled") {
        toast.error("Invalid Category", {
          description: "This category is deactivated and cannot be used. Please select an active category."
        });
        return;
      }

      try {
        await updateProduct(
        editingItem.id,
        {
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          sku: formData.sku,
          supplier: formData.supplier,
          branchId: formData.branchId,
          // ═════════════════════════════════════════════════════════��═════════
          // PRICING EXTENSION: Include new pricing fields
          // ═══════════════════════════════════════════════════════════════════
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
          retailPrice: parseFloat(formData.price), // Same as price for backward compatibility
          wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined
        }
      );
      setEditingItem(null);
      resetForm();
        toast.success("Product updated successfully!");
      } catch (error) {
        // Toast handled in context
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id);
        toast.success("Product deleted successfully!");
      } catch (error) {
        // Toast handled in context
      }
    }
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      stock: item.stock.toString(),
      sku: item.sku,
      supplier: item.supplier,
      branchId: item.branchId,
      // Pricing extension fields
      costPrice: item.costPrice?.toString() || "",
      retailPrice: item.retailPrice?.toString() || "",
      wholesalePrice: item.wholesalePrice?.toString() || ""
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "Food",
      price: "",
      stock: "",
      sku: "",
      supplier: "",
      branchId: getDefaultBranchId(),
      // Pricing extension fields
      costPrice: "",
      retailPrice: "",
      wholesalePrice: ""
    });
  };

  // ═════════════════════════════════���═════════════════════════════════
  // STOCK STATUS BADGE - Visual indicator for table display
  // Uses item's lowStockThreshold or defaults to 5
  // ═══════════════════════════════════════════════════════════════════
  const getStockStatus = (stock: number, threshold: number = 5) => {
    if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stock > 0 && stock <= threshold) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const ProductFormProps = {
    formData,
    onFormChange: setFormData,
    suppliers,
    branches,
    userRole: user?.role || "",
    userBranchId: user?.branchId,
    allCategories: categoryList,
    isEditMode: !!editingItem
  };

  // Check if user can add inventory
  const canAddInventory = user?.role !== "Staff";

  // ═══════════════════════════════════════════════════════════════════
  // EXPORT TO EXCEL FUNCTION
  // ═══════════════════════════════════════════════════════════════════
  const exportInventoryToExcel = () => {
    if (!hasFeature("exportData")) {
      toast.error("Feature Locked", {
        description: `Exporting data is not available on your ${plan.name} plan.`,
        action: {
          label: "Upgrade",
          onClick: () => navigate("/app/subscription")
        }
      });
      return;
    }

    try {
      const dataToExport = filteredInventory.map(item => {
        const branch = getBranchById(item.branchId);
        return {
          "SKU/Size": item.sku,
          "Product Name": item.name,
          "Category": categoryList.find(c => c.id === item.category)?.name || item.category,
          "Branch": branch?.name || "Unknown",
          "Cost Price": item.costPrice || "-",
          "Retail Price": item.retailPrice || item.price,
          "Wholesale Price": item.wholesalePrice || "-",
          "Stock Quantity": item.stock,
          "Supplier": item.supplier || "-",
          "Low Stock Threshold": item.lowStockThreshold || 10
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

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
      const branchName = filterBranchId === "ALL_BRANCHES" 
        ? "all_branches" 
        : (getBranchById(filterBranchId)?.name.toLowerCase().replace(/\s+/g, '_') || "branch");
      a.download = `inventory_${branchName}_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredInventory.length} products to Excel`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export inventory");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // DOWNLOAD IMPORT TEMPLATE
  // ═══════════════════════════════════════════════════════════════════
  const downloadImportTemplate = () => {
    const activeBranches = branches.filter(b => b.status === "active");
    
    const templateData = [
      {
        "Product Name": "",
        "Category": activeCategories.length > 0 ? activeCategories[0].name : "",
        "Branch": activeBranches.length > 0 ? activeBranches[0].name : "",
        "SKU": "",
        "Retail Price": "",
        "Cost Price": "",
        "Wholesale Price": "",
        "Stock Quantity": "",
        "Supplier": "",
        "Low Stock Threshold": "10"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Add instructions as comments
    const instructions = [
      "INSTRUCTIONS:",
      "1. Fill in all rows with product data",
      "2. Required fields: Product Name, Category, Branch, Retail Price, Stock Quantity",
      "3. Optional fields: SKU, Cost Price, Wholesale Price, Supplier, Low Stock Threshold",
      `4. Available Categories: ${activeCategories.map(c => c.name).join(", ")}`,
      `5. Available Branches: ${activeBranches.map(b => b.name).join(", ")}`,
      "6. If a category doesn't exist, it will be created automatically",
      "7. Branch names must match exactly (case-insensitive)",
      "8. Delete this row and the example row before importing",
      ""
    ];

    // Insert instructions at the top
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
    a.download = "inventory_import_template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded successfully");
  };

  // ══════════════════════════════════════════════════════════════════
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
  // ════════════════════════════��══════════════════════════════════════
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

      // Find the header row (skip instruction rows)
      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length > 0 && 
            (row.includes("Product Name") || row.includes("SKU"))) {
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
      const requiredHeaders = ["Product Name", "Category", "Branch", "Retail Price", "Stock Quantity"];
      const missingHeaders = requiredHeaders.filter(h => !(h in headerMap));
      if (missingHeaders.length > 0) {
        errors.push(`Missing required columns: ${missingHeaders.join(", ")}`);
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = headerRowIndex + i + 2; // +2 for 1-based indexing and header row

        try {
          // Extract data
          const productName = row[headerMap["Product Name"]]?.toString().trim() || "";
          const categoryName = row[headerMap["Category"]]?.toString().trim() || "";
          const branchName = row[headerMap["Branch"]]?.toString().trim() || "";
          const sku = row[headerMap["SKU"]]?.toString().trim() || "";
          const retailPriceStr = row[headerMap["Retail Price"]]?.toString().trim() || "";
          const costPriceStr = row[headerMap["Cost Price"]]?.toString().trim() || "";
          const wholesalePriceStr = row[headerMap["Wholesale Price"]]?.toString().trim() || "";
          const stockStr = row[headerMap["Stock Quantity"]]?.toString().trim() || "";
          const supplierName = row[headerMap["Supplier"]]?.toString().trim() || "";
          const lowStockThresholdStr = row[headerMap["Low Stock Threshold"]]?.toString().trim() || "10";

          // Validation
          if (!productName) {
            errors.push(`Row ${rowNum}: Product name is required`);
            continue;
          }

          if (!categoryName) {
            errors.push(`Row ${rowNum}: Category is required for "${productName}"`);
            continue;
          }

          if (!branchName) {
            errors.push(`Row ${rowNum}: Branch is required for "${productName}"`);
            continue;
          }

          if (!sku) {
            errors.push(`Row ${rowNum}: SKU is required for "${productName}"`);
            continue;
          }

          // Find or create category (ONLY ACTIVE CATEGORIES)
          let categoryId = activeCategories.find(
            c => c.name.toLowerCase() === categoryName.toLowerCase()
          )?.id;

          // ═══════════════════════════════════════════════════════════════════
          // CATEGORY STATUS VALIDATION - Check if category is deactivated
          // ═══════════════════════════════════════════════════════════════════
          const deactivatedCategory = categoryList.find(
            c => c.name.toLowerCase() === categoryName.toLowerCase() && c.status === "disabled"
          );

          if (deactivatedCategory) {
            errors.push(`Row ${rowNum}: Category "${categoryName}" is deactivated and cannot be used`);
            continue;
          }

          if (!categoryId) {
            // Auto-create category
            addCategory({ name: categoryName });
            categoryId = categoryName; // Use name as ID temporarily
            warnings.push(`Row ${rowNum}: Created new category "${categoryName}"`);
          }

          // Find branch
          const targetBranch = branches.find(
            b => b.name.toLowerCase() === branchName.toLowerCase() && b.status === "active"
          );

          if (!targetBranch) {
            errors.push(`Row ${rowNum}: Branch "${branchName}" not found or inactive`);
            continue;
          }

          // Validate numeric fields
          const retailPrice = parseFloat(retailPriceStr);
          if (isNaN(retailPrice) || retailPrice <= 0) {
            errors.push(`Row ${rowNum}: Invalid retail price for "${productName}"`);
            continue;
          }

          const costPrice = costPriceStr ? parseFloat(costPriceStr) : undefined;
          if (costPrice !== undefined && (isNaN(costPrice) || costPrice < 0)) {
            errors.push(`Row ${rowNum}: Invalid cost price for "${productName}"`);
            continue;
          }

          const wholesalePrice = wholesalePriceStr ? parseFloat(wholesalePriceStr) : undefined;
          if (wholesalePrice !== undefined && (isNaN(wholesalePrice) || wholesalePrice <= 0)) {
            errors.push(`Row ${rowNum}: Invalid wholesale price for "${productName}"`);
            continue;
          }

          const stock = parseInt(stockStr);
          if (isNaN(stock) || stock < 0) {
            errors.push(`Row ${rowNum}: Invalid stock quantity for "${productName}"`);
            continue;
          }

          const lowStockThreshold = parseInt(lowStockThresholdStr) || 10;

          // Check for duplicate SKU
          const existingProduct = inventory.find(
            p => p.sku.toLowerCase() === sku.toLowerCase() && p.branchId === targetBranch.id
          );

          if (existingProduct) {
            warnings.push(`Row ${rowNum}: SKU "${sku}" already exists in ${branchName}, skipped`);
            continue;
          }

          // Add product
          addProduct({
            name: productName,
            category: categoryId,
            price: retailPrice, // Legacy field maps to retail price
            stock: stock,
            sku: sku,
            supplier: supplierName,
            lowStockThreshold: lowStockThreshold,
            // ═══════════════════════════════════════════════════════════════════
            // PRICING EXTENSION: Include new pricing fields from import
            // ═══════════════════════════════════════════════════════════════════
            costPrice: costPrice,
            retailPrice: retailPrice,
            wholesalePrice: wholesalePrice
          }, targetBranch.id);

          success.push(`Row ${rowNum}: Added "${productName}" to ${branchName}`);
        } catch (error) {
          console.error(`Error processing row ${rowNum}:`, error);
          errors.push(`Row ${rowNum}: Failed to process row`);
        }
      }

      setImportValidation({ errors, warnings, success, totalRows: dataRows.length });

      if (errors.length === 0 && success.length > 0) {
        toast.success(`Successfully imported ${success.length} products`);
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
      {/* Page Header */}
      <div>
        <h1 className="text-3xl mb-1">Inventory Management</h1>
        <p className="text-muted-foreground">
          {user?.role === "Business Owner" 
            ? "Manage products and categories across all branches" 
            : user?.branchId 
              ? `Viewing inventory for ${getBranchById(user.branchId)?.name || "your branch"}`
              : "Manage your products and stock levels"}
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="w-4 h-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="w-4 h-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          {/* Action Buttons - Import, Export, Add Product */}
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div className="flex gap-3">
              {/* Import Products Button */}
              {canAddInventory && (
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
                      <DialogTitle>Import Products from Excel</DialogTitle>
                      <DialogDescription>
                        Upload an Excel file to bulk import inventory products
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
                            <li>Required: Product Name, Category, Branch, Price, Stock Quantity</li>
                            <li>Optional: SKU, Supplier, Low Stock Threshold</li>
                            <li>Categories auto-created if they don't exist</li>
                            <li>Branch names must match exactly (case-insensitive)</li>
                            <li>Duplicate SKUs in same branch will be skipped</li>
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
                            Import Products
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Export Button */}
              <Button variant="outline" onClick={exportInventoryToExcel} className="gap-2" disabled={filteredInventory.length === 0}>
                <Download className="w-4 h-4" />
                Export Excel
              </Button>
            </div>

            {/* Add Product Button */}
            {canAddInventory && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setEditingItem(null); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>Enter the details of the new product. All fields marked with * are required.</DialogDescription>
                  </DialogHeader>
                  <ProductForm {...ProductFormProps} />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddProduct}>Add Product</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 7: ACTIVE BRANCH INDICATOR */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {user?.role !== "Business Owner" && user?.branchId && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Active Branch</p>
                    <p className="text-xs text-muted-foreground">
                      You are viewing inventory for: <span className="font-semibold text-foreground">{getBranchById(user.branchId)?.name || "Unknown"}</span>
                    </p>
                  </div>
                  <Badge variant="default" className="h-6">
                    Branch Locked
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business Owner: Show current filter status */}
          {user?.role === "Business Owner" && filterBranchId !== "ALL_BRANCHES" && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Filtered View</p>
                    <p className="text-xs text-blue-700">
                      Showing inventory for: <span className="font-semibold">{getBranchById(filterBranchId)?.name || "Unknown Branch"}</span>
                    </p>
                  </div>
                  <Badge variant="secondary" className="h-6 bg-blue-100 text-blue-800 border-blue-300">
                    {filteredInventory.length} {filteredInventory.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}



          {/* Stats Cards - Clickable to filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card 
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setFilterStockStatus("All")}
            >
              <CardContent className="p-6">
                <div className="text-2xl font-semibold">{filteredInventory.length}</div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                {filterStockStatus === "All" && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">Active Filter</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:bg-amber-50 transition-colors"
              onClick={() => setFilterStockStatus("Low Stock")}
            >
              <CardContent className="p-6">
                <div className="text-2xl font-semibold text-orange-600">
                  {filteredInventory.filter((item) => getStockStatusCategory(item) === "Low Stock").length}
                </div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                {filterStockStatus === "Low Stock" && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 bg-amber-50">Active Filter</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:bg-red-50 transition-colors"
              onClick={() => setFilterStockStatus("Out of Stock")}
            >
              <CardContent className="p-6">
                <div className="text-2xl font-semibold text-red-600">
                  {filteredInventory.filter((item) => item.stock === 0).length}
                </div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                {filterStockStatus === "Out of Stock" && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs border-red-500 text-red-700 bg-red-50">Active Filter</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Search and filter your inventory</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="search-inventory" className="text-sm font-medium">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search-inventory"
                      placeholder="Search by name or SKU/size..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-[180px]">
                  <Label htmlFor="filter-category" className="text-sm font-medium">Category</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger id="filter-category" className="w-full">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Always show "All" first */}
                      <SelectItem value="All">All</SelectItem>
                      
                      {/* Render active categories from Category Management */}
                      {activeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {user?.role === "Business Owner" && (
                  <div className="flex flex-col gap-2 w-full sm:w-[180px]">
                    <Label htmlFor="filter-branch" className="text-sm font-medium">Branch</Label>
                    <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                      <SelectTrigger id="filter-branch" className="w-full">
                        <SelectValue placeholder="Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_BRANCHES">All Branches</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              {branch.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Stock Status Filter */}
                <div className="flex flex-col gap-2 w-full sm:w-[180px]">
                  <Label htmlFor="filter-stock-status" className="text-sm font-medium">Stock Status</Label>
                  <Select value={filterStockStatus} onValueChange={(value) => setFilterStockStatus(value as "All" | "Low Stock" | "Out of Stock")}>
                    <SelectTrigger id="filter-stock-status" className="w-full">
                      <SelectValue placeholder="Stock Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Low Stock">Low Stock</SelectItem>
                      <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU/Size</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        {user?.role === "Business Owner" && <TableHead>Branch</TableHead>}
                        <TableHead>Purchase Price</TableHead>
                        <TableHead>Retail Price</TableHead>
                        <TableHead>Wholesale Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Supplier</TableHead>
                        {canAddInventory && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.map((item) => {
                        const threshold = item.lowStockThreshold || 5;
                        const status = getStockStatus(item.stock, threshold);
                        const itemBranch = getBranchById(item.branchId);
                        const stockCategory = getStockStatusCategory(item);
                        const isOutOfStock = item.stock === 0;
                        const isLowStock = stockCategory === "Low Stock";
                        return (
                          <TableRow key={item.id} className={isLowStock ? "bg-amber-50/50" : isOutOfStock ? "bg-red-50/30" : ""}>
                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {item.name}
                                {isLowStock && (
                                  <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Low Stock
                                  </Badge>
                                )}
                                {isOutOfStock && (
                                  <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Out of Stock
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {categoryList.find(c => c.id === item.category)?.name || item.category}
                            </TableCell>
                            {user?.role === "Business Owner" && (
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm">{itemBranch?.name || "Unknown"}</span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              {item.costPrice ? (
                                <div className="font-medium text-muted-foreground">{formatCurrency(item.costPrice)}</div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{formatCurrency(item.retailPrice || item.price)}</div>
                            </TableCell>
                            <TableCell>
                              {item.wholesalePrice ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium">{formatCurrency(item.wholesalePrice)}</span>
                                  <Badge variant="outline" className="text-xs">Bulk</Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>{item.stock}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.supplier || "-"}</TableCell>
                            {canAddInventory && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditDialog(item)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>Edit Product</DialogTitle>
                                        <DialogDescription>Update the product details. All fields marked with * are required.</DialogDescription>
                                      </DialogHeader>
                                      <ProductForm {...ProductFormProps} />
                                      <DialogFooter>
                                        <Button variant="outline" onClick={() => setEditingItem(null)}>
                                          Cancel
                                        </Button>
                                        <Button onClick={handleEditProduct}>Save Changes</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(item.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {filteredInventory.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No products found</p>
                  {filterStockStatus !== "All" && (
                    <p className="text-sm mt-2">
                      No products match the <span className="font-semibold">{filterStockStatus}</span> status.
                    </p>
                  )}
                  {filterBranchId && filterBranchId !== "ALL_BRANCHES" && filterStockStatus === "All" && (
                    <p className="text-sm mt-2">
                      No inventory items found for <span className="font-semibold">{getBranchById(filterBranchId)?.name || "this branch"}</span>.
                      {user?.role === "Business Owner" && " Try selecting a different branch or add new products."}
                    </p>
                  )}
                  {user?.role === "Staff" && filterStockStatus === "All" && (
                    <p className="text-sm mt-2">Contact your manager to add inventory.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}