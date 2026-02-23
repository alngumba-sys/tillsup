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
  XCircle,
  ScanBarcode,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { useInventory, InventoryItem } from "../contexts/InventoryContext";
import { useCategory } from "../contexts/CategoryContext";
import { useSupplier } from "../contexts/SupplierContext";
import { useBranch } from "../contexts/BranchContext";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../hooks/useCurrency";
import { useSubscription } from "../hooks/useSubscription";
import { toast } from "sonner";
import { CategoriesTab } from "../components/inventory/CategoriesTab";
import * as XLSX from "xlsx";
import { SchemaError } from "../components/inventory/SchemaError";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { useNavigate } from "react-router";

import { BarcodeScanner } from "../components/inventory/BarcodeScanner";
import { supabase } from "../../lib/supabase";

interface ProductFormProps {
  formData: {
    name: string;
    category: string;
    price: string;
    stock: string;
    sku: string;
    supplier: string;
    branchId: string;
    image?: string; // Image URL
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

  const { currencySymbol } = useCurrency();

  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Image must be less than 2MB"
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        toast.error("Invalid file type", {
            description: "Please upload an image file"
        });
        return;
    }

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('Inventoryimages')
        .upload(filePath, file);
        
      if (uploadError) {
        if (uploadError.message.includes("violates row-level security")) {
          toast.error("Upload Permission Error", {
            description: "Please run 'supabase_storage_policy.sql' in your Supabase Dashboard."
          });
        }
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('Inventoryimages')
        .getPublicUrl(filePath);
        
      onFormChange({ ...formData, image: publicUrl });
      toast.success("Image uploaded successfully");
      
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error("Upload failed", {
        description: error.message || "Failed to upload image"
      });
    } finally {
      setIsUploading(false);
    }
  };

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
        <Label htmlFor="image">Product Image <span className="text-xs text-muted-foreground">(Max 2MB)</span></Label>
        <div className="flex items-start gap-4">
          <div className="shrink-0 relative">
            {formData.image ? (
              <div className="relative group">
                <div className="w-20 h-20 rounded-lg border overflow-hidden">
                  <img src={formData.image} alt="Product" className="w-full h-full object-cover" />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onFormChange({ ...formData, image: undefined })}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg border border-dashed flex items-center justify-center bg-muted/30">
                <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <Input
              id="image"
              type="file"
              accept="image/*"
              className="cursor-pointer"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-blue-600 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading image...
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
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
              {activeCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-green-600" />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
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
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="price">Retail Price ({currencySymbol}) <span className="text-destructive">*</span></Label>
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
      
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="costPrice">
            Cost Price ({currencySymbol}) <span className="text-xs text-muted-foreground">(Optional)</span>
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
            Wholesale Price ({currencySymbol}) <span className="text-xs text-muted-foreground">(Optional)</span>
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
      
      <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2">
        <Label htmlFor="sku">SKU/Size</Label>
        <div className="flex gap-2">
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => onFormChange({ ...formData, sku: e.target.value })}
            placeholder="Enter SKU or size"
          />
          <Button 
            type="button"
            variant="outline" 
            size="icon" 
            onClick={() => setIsScanning(true)}
            title="Scan Barcode"
          >
            <ScanBarcode className="h-4 w-4" />
          </Button>
        </div>
        
        <Dialog open={isScanning} onOpenChange={setIsScanning}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Scan Barcode</DialogTitle>
              <DialogDescription>
                Place the barcode within the frame to scan.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <BarcodeScanner 
                onScan={(code) => {
                  onFormChange({ ...formData, sku: code });
                  setIsScanning(false);
                  toast.success(`Scanned: ${code}`);
                }}
                onClose={() => setIsScanning(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
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
    </div>
  );
}

// Inventory Management Page Component
export function Inventory() {
  const { inventory, addProduct, updateProduct, deleteProduct, error: inventoryError } = useInventory();
  const { categories: categoryList, activeCategories, addCategory, error: categoryError } = useCategory();
  const { suppliers } = useSupplier();
  const { branches, getBranchById, createBranch, error: branchError } = useBranch();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { hasFeature, plan } = useSubscription();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  
  // Stock Status Filter
  const [filterStockStatus, setFilterStockStatus] = useState<"All" | "Low Stock" | "Out of Stock">("All");
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);
  
  // Branch Filter
  const getInitialFilterBranchId = (): string => {
    if (user?.role === "Business Owner") {
      return "ALL_BRANCHES";
    }
    return user?.branchId || "";
  };

  const [filterBranchId, setFilterBranchId] = useState<string>(getInitialFilterBranchId());

  const getDefaultBranchId = (): string => {
    if (user?.role === "Business Owner") {
      const firstActiveBranch = branches.find(b => b.status === "active");
      return firstActiveBranch?.id || "";
    }
    return user?.branchId || "";
  };

  const getDefaultCategoryId = (): string => {
    return activeCategories.length > 0 ? activeCategories[0].id : "";
  };

  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    price: string;
    stock: string;
    sku: string;
    supplier: string;
    branchId: string;
    image?: string;
    costPrice: string;
    retailPrice: string;
    wholesalePrice: string;
  }>({
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

  useEffect(() => {
    if (!formData.branchId) {
      setFormData(prev => ({ ...prev, branchId: getDefaultBranchId() }));
    }
  }, [branches, user]);

  useEffect(() => {
    if (user?.role !== "Business Owner" && user?.branchId) {
      setFilterBranchId(user.branchId);
    }
  }, [user?.role, user?.branchId]);

  const getStockStatusCategory = (item: InventoryItem): "Out of Stock" | "Low Stock" | "In Stock" => {
    const threshold = item.lowStockThreshold || 10;
    
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
        image: formData.image,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        retailPrice: parseFloat(formData.price),
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
          image: formData.image,
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
          retailPrice: parseFloat(formData.price),
          wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined
        }
      );
      setEditingItem(null);
      resetForm();
      setIsEditDialogOpen(false);
        toast.success("Product updated successfully!");
      } catch (error) {
        // Toast handled in context
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      await deleteProduct(deleteConfirmation.id);
      toast.success("Product deleted successfully!");
      setDeleteConfirmation(null);
    } catch (error) {
      // Toast handled in context
    }
  };

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteConfirmation({ isOpen: true, id, name });
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
      image: item.image,
      costPrice: item.costPrice?.toString() || "",
      retailPrice: item.retailPrice?.toString() || "",
      wholesalePrice: item.wholesalePrice?.toString() || ""
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: getDefaultCategoryId(),
      price: "",
      stock: "",
      sku: "",
      supplier: "",
      branchId: getDefaultBranchId(),
      image: undefined,
      costPrice: "",
      retailPrice: "",
      wholesalePrice: ""
    });
    setEditingItem(null);
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your products, stock levels, and prices.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          if (open) {
            resetForm();
            setIsAddDialogOpen(true);
          } else {
            setIsAddDialogOpen(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a new product to your inventory.
              </DialogDescription>
            </DialogHeader>
            <ProductForm 
              formData={formData} 
              onFormChange={setFormData}
              suppliers={suppliers}
              branches={branches}
              userRole={user?.role || ""}
              userBranchId={user?.branchId || undefined}
              allCategories={categoryList}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddProduct}>Create Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards (Simplified) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground">Total Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-amber-600">
              {inventory.filter(i => (i.stock <= (i.lowStockThreshold || 10)) && i.stock > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-red-600">
              {inventory.filter(i => i.stock === 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
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
        
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                View and manage your inventory items.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {activeCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStockStatus} onValueChange={(v: any) => setFilterStockStatus(v)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Stock Status</SelectItem>
                    <SelectItem value="Low Stock">Low Stock</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                {user?.role === "Business Owner" && (
                  <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_BRANCHES">All Branches</SelectItem>
                      {branches.filter(b => b.status === "active").map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No products found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((item) => {
                        const branch = getBranchById(item.branchId);
                        const category = categoryList.find(c => c.id === item.category);
                        const stockStatus = getStockStatusCategory(item);
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-md object-cover border" />
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                                    <Package className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{category?.name || item.category}</Badge>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.price)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{item.stock}</span>
                                {stockStatus !== "In Stock" && (
                                  <Badge variant={stockStatus === "Out of Stock" ? "destructive" : "secondary"} className="w-fit text-[10px] px-1 py-0 h-4">
                                    {stockStatus}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="w-3 h-3" />
                                {branch?.name || "Unknown"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(item.id, item.name)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditDialogOpen(false);
          setEditingItem(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details.</DialogDescription>
          </DialogHeader>
          <ProductForm 
            formData={formData} 
            onFormChange={setFormData}
            suppliers={suppliers}
            branches={branches}
            userRole={user?.role || ""}
            userBranchId={user?.branchId || undefined}
            allCategories={categoryList}
            isEditMode={true}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditProduct}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => {
          if (!open) setDeleteConfirmation(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteConfirmation.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmation(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
