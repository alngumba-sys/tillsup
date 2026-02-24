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
  Loader2,
  Info,
  DollarSign
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
    lowStockThreshold?: string; // Reorder level
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

  // Compress image before upload
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if image is too large (max 1200px width)
          const maxWidth = 1200;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with compression (0.7 quality for good balance)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              // Create new file from blob
              const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log('Original size:', (file.size / 1024).toFixed(2), 'KB');
              console.log('Compressed size:', (compressedFile.size / 1024).toFixed(2), 'KB');
              console.log('Compression ratio:', ((1 - compressedFile.size / file.size) * 100).toFixed(1), '%');
              resolve(compressedFile);
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

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
      // Check authentication status FIRST
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user during upload:', user?.id, user?.email);
      
      if (!user) {
        toast.error("Not Authenticated", {
          description: "You must be logged in to upload images."
        });
        throw new Error('User not authenticated');
      }
      
      console.log('Original file size:', file.size, 'bytes');
      console.log('Compressing image...');
      
      // Compress image before upload
      const compressedFile = await compressImage(file);
      console.log('Compressed file size:', compressedFile.size, 'bytes');
      
      // Simple file naming
      const fileExt = 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      
      console.log('Starting upload to Inventoryimages bucket:', fileName);
      const uploadStartTime = Date.now();
      
      // Upload with upsert: true to avoid conflicts
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Inventoryimages')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true // Changed to true to avoid conflicts
        });
      
      const uploadDuration = Date.now() - uploadStartTime;
      console.log('Upload completed in', uploadDuration, 'ms');
        
      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message.includes("violates row-level security") || uploadError.message.includes("new row violates")) {
          toast.error("Upload Permission Error", {
            description: "Storage bucket RLS not configured. Go to Supabase Dashboard > Storage > Inventoryimages > Policies and add 'Allow authenticated uploads' policy."
          });
        } else if (uploadError.message.includes("Bucket not found")) {
          toast.error("Storage Not Configured", {
            description: "The 'Inventoryimages' bucket doesn't exist. Please create it in Supabase Dashboard > Storage with 'Public bucket' enabled."
          });
        } else if (uploadError.message.includes("timeout")) {
          toast.error("Upload Timeout", {
            description: "Upload took too long. Check your internet connection and try again with a smaller file."
          });
        } else {
          toast.error("Upload failed", {
            description: uploadError.message
          });
        }
        throw uploadError;
      }
      
      console.log('Upload successful:', uploadData);
      
      const { data: { publicUrl } } = supabase.storage
        .from('Inventoryimages')
        .getPublicUrl(fileName);
        
      console.log('Public URL:', publicUrl);
      onFormChange({ ...formData, image: publicUrl });
      toast.success("Image uploaded successfully");
      
    } catch (error: any) {
      console.error('Error uploading image:', error);
      if (error.message?.includes('timeout')) {
        toast.error("Upload Timeout", {
          description: "Upload took too long. Check your internet connection and try again with a smaller file."
        });
      } else {
        toast.error("Upload failed", {
          description: error.message || "Failed to upload image. Please try again."
        });
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY STATUS VALIDATION
  // ═══════════��═══════════════════════════════════════════════════════
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
    <div className="grid gap-2.5 py-2">
      {/* Branch Selection - REQUIRED */}
      <div className="grid gap-1.5">
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
          <div className="flex items-center gap-2 p-2 rounded-md border border-dashed bg-muted/30">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              No active branches available.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="image" className="text-sm">Product Image <span className="text-xs text-muted-foreground">(Max 2MB)</span></Label>
        <div className="flex items-start gap-3">
          <div className="shrink-0 relative">
            {formData.image ? (
              <div className="relative group">
                <div className="w-14 h-14 rounded-md border overflow-hidden">
                  <img src={formData.image} alt="Product" className="w-full h-full object-cover" />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onFormChange({ ...formData, image: undefined })}
                >
                  <XCircle className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-md border border-dashed flex items-center justify-center bg-muted/30">
                <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-1">
            <Input
              id="image"
              type="file"
              accept="image/*"
              className="cursor-pointer text-sm"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading...
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="name" className="text-sm">Product Name <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
          />
        </div>
        
        {/* Category Selection - Uses CategoryContext */}
        <div className="grid gap-1.5">
        <Label htmlFor="category" className="text-sm">Category <span className="text-destructive">*</span></Label>
        
        {/* ═══════════════════════════════════════════════════════════════════
            EDGE CASE: Product with deactivated category (Edit Mode)
            ═══════════════════════════════════════════════════════════����══════ */}
        {isEditMode && isCategoryDeactivated && (
          <Alert className="border-amber-200 bg-amber-50 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <AlertDescription className="text-amber-900 text-xs">
              Deactivated category. Please select an active one.
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
          <div className="flex items-center gap-2 p-2 rounded-md border border-dashed bg-destructive/10">
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            <p className="text-xs text-destructive">
              No categories. Create one first.
            </p>
          </div>
        )}
      </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════
          PRICING SECTION - Grouped for clarity
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-1.5 pb-0.5 border-b">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium">Pricing</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="costPrice" className="text-xs">
              Cost ({currencySymbol})
            </Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              value={formData.costPrice || ""}
              onChange={(e) => onFormChange({ ...formData, costPrice: e.target.value })}
              placeholder="0.00"
            />
            <p className="text-[10px] text-muted-foreground leading-tight">What you pay</p>
          </div>
          
          <div className="grid gap-1.5">
            <Label htmlFor="price" className="text-xs">Retail ({currencySymbol}) <span className="text-destructive">*</span></Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => onFormChange({ ...formData, price: e.target.value })}
              placeholder="0.00"
            />
            <p className="text-[10px] text-muted-foreground leading-tight">Single items</p>
          </div>
          
          <div className="grid gap-1.5">
            <Label htmlFor="wholesalePrice" className="text-xs">
              Wholesale ({currencySymbol})
            </Label>
            <Input
              id="wholesalePrice"
              type="number"
              step="0.01"
              value={formData.wholesalePrice || ""}
              onChange={(e) => onFormChange({ ...formData, wholesalePrice: e.target.value })}
              placeholder="0.00"
            />
            <p className="text-[10px] text-muted-foreground leading-tight">Bulk orders</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          STOCK MANAGEMENT SECTION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-1.5 pb-0.5 border-b">
          <Package className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium">Stock Management</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="stock" className="text-sm">Stock Quantity <span className="text-destructive">*</span></Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => onFormChange({ ...formData, stock: e.target.value })}
              placeholder="0"
            />
          </div>
          
          <div className="grid gap-1.5">
            <Label htmlFor="lowStockThreshold" className="text-sm">
              Reorder Level
            </Label>
            <Input
              id="lowStockThreshold"
              type="number"
              value={formData.lowStockThreshold || "10"}
              onChange={(e) => onFormChange({ ...formData, lowStockThreshold: e.target.value })}
              placeholder="10"
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="sku" className="text-sm">SKU/Size</Label>
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
      <div className="grid gap-1.5">
        <Label htmlFor="supplier" className="text-sm">
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
          <div className="flex items-center gap-2 p-2 rounded-md border border-dashed bg-muted/30">
            <Truck className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              No suppliers available.
            </p>
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
  
  // ══════════════════��════════════════════════════════════════════════
  // EXCEL IMPORT STATE
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
    lowStockThreshold: string;
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
    wholesalePrice: "",
    lowStockThreshold: "10"
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
    console.log('🟢 handleAddProduct called');
    console.log('📋 formData:', formData);
    
    // Validation
    if (!formData.name.trim()) {
      console.log('❌ Name validation failed');
      toast.error("Product name is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      console.log('❌ Price validation failed:', formData.price);
      toast.error("Valid price is required");
      return;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      console.log('❌ Stock validation failed:', formData.stock);
      toast.error("Valid stock quantity is required");
      return;
    }
    if (!formData.branchId) {
      console.log('❌ BranchId validation failed:', formData.branchId);
      toast.error("Branch selection is required");
      return;
    }

    const selectedCategory = categoryList.find(cat => cat.id === formData.category);
    if (!selectedCategory) {
      console.log('❌ Category not found:', formData.category);
      toast.error("Category is required");
      return;
    }
    if (selectedCategory.status === "disabled") {
      console.log('❌ Category disabled:', selectedCategory);
      toast.error("Invalid Category", {
        description: "This category is deactivated and cannot be used. Please select an active category."
      });
      return;
    }

    console.log('✅ All validations passed, creating product...');
    
    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        sku: formData.sku,
        supplier: formData.supplier,
        image: formData.image,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        retailPrice: parseFloat(formData.price),
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined,
        lowStockThreshold: parseInt(formData.lowStockThreshold)
      };
      
      console.log('📦 Product data to add:', productData);
      console.log('🏢 Branch ID:', formData.branchId);
      
      await addProduct(productData, formData.branchId);
      
      console.log('✅ Product added successfully!');
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Error in handleAddProduct:', error);
      toast.error("Failed to add product", {
        description: error?.message || "Unknown error occurred"
      });
    }
  };

  const handleEditProduct = async () => {
    console.log('🟢 handleEditProduct called');
    console.log('📝 editingItem:', editingItem);
    console.log('📋 formData:', formData);
    
    if (!editingItem) {
      console.log('❌ No editing item');
      toast.error("No product selected for editing");
      return;
    }
    
    if (!formData.name.trim()) {
      console.log('❌ Name validation failed');
      toast.error("Product name is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      console.log('❌ Price validation failed:', formData.price);
      toast.error("Valid price is required");
      return;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      console.log('❌ Stock validation failed:', formData.stock);
      toast.error("Valid stock quantity is required");
      return;
    }
    if (!formData.branchId) {
      console.log('❌ BranchId validation failed:', formData.branchId);
      toast.error("Branch selection is required");
      return;
    }

    const selectedCategory = categoryList.find(cat => cat.id === formData.category);
    if (!selectedCategory) {
      console.log('❌ Category not found:', formData.category);
      toast.error("Category is required");
      return;
    }
    if (selectedCategory.status === "disabled") {
      console.log('❌ Category disabled:', selectedCategory);
      toast.error("Invalid Category", {
        description: "This category is deactivated and cannot be used. Please select an active category."
      });
      return;
    }

    console.log('✅ All validations passed, preparing update...');
    
    try {
      const updates = {
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
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined,
        lowStockThreshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : undefined
      };
      
      console.log('📤 Updating product with:', updates);
      
      await updateProduct(editingItem.id, updates);
      
      console.log('✅ Product updated successfully');
      setEditingItem(null);
      resetForm();
      setIsEditDialogOpen(false);
      toast.success("Product updated successfully!");
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error("Failed to update product", {
        description: error.message || "An error occurred"
      });
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
      wholesalePrice: item.wholesalePrice?.toString() || "",
      lowStockThreshold: item.lowStockThreshold?.toString() || "10"
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
      wholesalePrice: "",
      lowStockThreshold: "10"
    });
    setEditingItem(null);
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // EXCEL IMPORT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════
  const downloadInventoryImportTemplate = () => {
    const templateData = [
      {
        "Product Name": "Sample Product 1",
        "Category": "Electronics",
        "SKU": "PROD-001",
        "Stock Quantity": "100",
        "Cost Price": "50",
        "Retail Price": "75",
        "Wholesale Price": "65",
        "Supplier": "Supplier Co",
        "Branch": "Main Branch",
        "Low Stock Threshold": "10"
      },
      {
        "Product Name": "Sample Product 2",
        "Category": "Groceries",
        "SKU": "PROD-002",
        "Stock Quantity": "50",
        "Cost Price": "20",
        "Retail Price": "30",
        "Wholesale Price": "25",
        "Supplier": "Fresh Foods Ltd",
        "Branch": "Downtown Branch",
        "Low Stock Threshold": "5"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    const colWidths = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 },
      { wch: 20 }, { wch: 18 }
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Template");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
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

  const handleInventoryImportFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportValidation(null);
    }
  };

  const validateAndImportInventory = async () => {
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

      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length > 0 && row.includes("Product Name")) {
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

      const headerMap: Record<string, number> = {};
      headers.forEach((header: string, index: number) => {
        if (header) headerMap[header.trim()] = index;
      });

      if (!("Product Name" in headerMap)) {
        errors.push("Missing required column: Product Name");
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = headerRowIndex + i + 2;

        try {
          const productName = row[headerMap["Product Name"]]?.toString().trim() || "";
          const category = row[headerMap["Category"]]?.toString().trim() || "";
          const sku = row[headerMap["SKU"]]?.toString().trim() || "";
          const stockQuantity = row[headerMap["Stock Quantity"]]?.toString().trim() || "0";
          const costPrice = row[headerMap["Cost Price"]]?.toString().trim() || "";
          const retailPrice = row[headerMap["Retail Price"]]?.toString().trim() || "";
          const wholesalePrice = row[headerMap["Wholesale Price"]]?.toString().trim() || "";
          const supplierName = row[headerMap["Supplier"]]?.toString().trim() || "";
          const branchName = row[headerMap["Branch"]]?.toString().trim() || "";
          const lowStockThreshold = row[headerMap["Low Stock Threshold"]]?.toString().trim() || "10";

          if (!productName) {
            errors.push(`Row ${rowNum}: Product name is required`);
            continue;
          }

          let categoryId = "";
          if (category) {
            const foundCategory = activeCategories.find(c => c.name.toLowerCase() === category.toLowerCase());
            if (foundCategory) {
              categoryId = foundCategory.id;
            } else {
              warnings.push(`Row ${rowNum}: Category "${category}" not found`);
            }
          }

          let supplierId = "";
          if (supplierName) {
            const foundSupplier = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
            if (foundSupplier) {
              supplierId = foundSupplier.id;
            } else {
              warnings.push(`Row ${rowNum}: Supplier "${supplierName}" not found`);
            }
          }

          let branchId = "";
          if (branchName) {
            const foundBranch = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase() && b.status === "active");
            if (foundBranch) {
              branchId = foundBranch.id;
            } else {
              warnings.push(`Row ${rowNum}: Branch "${branchName}" not found, using default`);
            }
          }

          if (!branchId) {
            branchId = getDefaultBranchId();
          }

          if (!branchId) {
            errors.push(`Row ${rowNum}: No valid branch available`);
            continue;
          }

          if (sku) {
            const existingProduct = inventory.find(
              p => p.sku.toLowerCase() === sku.toLowerCase() && p.branchId === branchId
            );
            if (existingProduct) {
              warnings.push(`Row ${rowNum}: Product with SKU "${sku}" already exists, skipped`);
              continue;
            }
          }

          const price = retailPrice || costPrice || "0";

          const productData = {
            name: productName,
            category: categoryId || getDefaultCategoryId(),
            price: parseFloat(price) || 0,
            stock: parseInt(stockQuantity) || 0,
            sku: sku || `AUTO-${Date.now()}-${i}`,
            supplier: supplierId,
            branchId,
            costPrice: costPrice ? parseFloat(costPrice) : undefined,
            retailPrice: retailPrice ? parseFloat(retailPrice) : undefined,
            wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : undefined,
            lowStockThreshold: parseInt(lowStockThreshold) || 10
          };

          await addProduct(productData);
          success.push(`Row ${rowNum}: Created product "${productName}"`);
        } catch (error) {
          console.error(`Error processing row ${rowNum}:`, error);
          errors.push(`Row ${rowNum}: Failed to process row`);
        }
      }

      setImportValidation({ errors, warnings, success, totalRows: dataRows.length });

      if (errors.length === 0 && (success.length > 0 || warnings.length > 0)) {
        toast.success(`Successfully processed ${success.length} products`);
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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your products, stock levels, and prices.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Import Excel Dialog */}
          <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
            setIsImportDialogOpen(open);
            if (!open) {
              setImportFile(null);
              setImportValidation(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Inventory from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file to bulk import products
                </DialogDescription>
              </DialogHeader>

              {/* Need a template section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-slate-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">Need a template?</h3>
                    <p className="text-sm text-slate-600 mb-3">Download our Excel template to get started</p>
                    <Button variant="outline" size="sm" onClick={downloadInventoryImportTemplate} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>

              {/* Upload Excel File */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Upload Excel File (.xlsx)</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleInventoryImportFileUpload}
                  className="cursor-pointer"
                />
                {importFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>

              {/* Import Guidelines */}
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-2">Import Guidelines:</h3>
                    <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                      <li>Required column: Product Name</li>
                      <li>Optional columns: Category, SKU, Stock Quantity, Cost Price, Retail Price, Wholesale Price, Supplier, Branch, Low Stock Threshold</li>
                      <li>Products with duplicate SKUs in the same branch will be skipped</li>
                      <li>Category and Supplier names must match existing records</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Validation Results */}
              {importValidation && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {importValidation.success.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900 text-sm mb-1">
                            Success ({importValidation.success.length})
                          </h4>
                          <div className="text-xs text-green-800 space-y-0.5">
                            {importValidation.success.map((msg, i) => (
                              <div key={i}>{msg}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {importValidation.warnings.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-amber-900 text-sm mb-1">
                            Warnings ({importValidation.warnings.length})
                          </h4>
                          <div className="text-xs text-amber-800 space-y-0.5">
                            {importValidation.warnings.map((msg, i) => (
                              <div key={i}>{msg}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {importValidation.errors.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-red-900 text-sm mb-1">
                            Errors ({importValidation.errors.length})
                          </h4>
                          <div className="text-xs text-red-800 space-y-0.5">
                            {importValidation.errors.map((msg, i) => (
                              <div key={i}>{msg}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setImportFile(null);
                    setImportValidation(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={validateAndImportInventory}
                  disabled={!importFile || isProcessingImport}
                  className="gap-2"
                >
                  {isProcessingImport ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Products
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Product Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            if (open) {
              // Reset form when opening the dialog
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
                wholesalePrice: "",
                lowStockThreshold: "10"
              });
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
          <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
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
              <Button onClick={async () => {
                console.log('🔵 Create Product button clicked');
                console.log('📊 Current formData:', JSON.stringify(formData, null, 2));
                try {
                  await handleAddProduct();
                } catch (error) {
                  console.error('🔴 Error caught in button handler:', error);
                  toast.error('Error', {
                    description: error instanceof Error ? error.message : 'Unknown error'
                  });
                }
              }}>Create Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
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
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
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
            <Button onClick={handleEditProduct}>
              Save Changes
            </Button>
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