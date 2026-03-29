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
  CircleCheck,
  Ban,
  XCircle,
  ScanBarcode,
  Image as ImageIcon,
  Loader2,
  Info,
  DollarSign,
  MapPin
} from "lucide-react";
import { useInventory, InventoryItem } from "../contexts/InventoryContext";
import { useCategory } from "../contexts/CategoryContext";
import { useSupplier } from "../contexts/SupplierContext";
import { useBranch } from "../contexts/BranchContext";
import { useLocation } from "../contexts/LocationContext";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../hooks/useCurrency";
import { useSubscription } from "../hooks/useSubscription";
import { toast } from "sonner";
import { CategoriesTab } from "../components/inventory/CategoriesTab";
import * as XLSX from "xlsx";
import { SchemaError } from "../components/inventory/SchemaError";
import { AddProductToShopDialog } from "../components/inventory/AddProductToShopDialog";
import { StockTransferConfirmation } from "../components/inventory/StockTransferConfirmation";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { useNavigate } from "react-router";
import { validateSubscriptionForImport } from "../utils/subscriptionGuard";
import { ErrorBoundary } from "../components/ErrorBoundary";

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
    branchId: string; // Legacy - kept for backwards compatibility
    locationId?: string; // NEW - Initial location for multi-location tracking
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
  locations: { id: string; name: string; type: "shop" | "warehouse"; isActive: boolean }[];
  branchLocationMappings: Record<string, string>;
  userRole: string;
  userBranchId?: string;
  allCategories: { id: string; name: string; status: "active" | "disabled" }[];
  isEditMode?: boolean;
}

function ProductForm({ formData, onFormChange, suppliers, branches, locations, branchLocationMappings, userRole, userBranchId, allCategories, isEditMode = false }: ProductFormProps) {
  // Filter active branches only
  const activeBranches = branches.filter(b => b.status === "active");
  
  // Filter active locations only
  const activeLocations = locations.filter(loc => loc.isActive);
  
  // Use explicit branch-location mappings (from user configuration)
  // Build locationToBranchMap from the branchLocationMappings
  const locationToBranchMap = new Map<string, string>();
  Object.entries(branchLocationMappings).forEach(([branchId, locationId]) => {
    // Reverse the mapping: locationId -> branchId
    locationToBranchMap.set(locationId, branchId);
  });
  
  // Check if we have any valid mappings - if not, use branches directly
  const hasValidMappings = locationToBranchMap.size > 0;
  
  // Filter locations to only show those that have been mapped to branches
  const mappedLocations = activeLocations.filter(loc => locationToBranchMap.has(loc.id));
  
  // Handle location selection - map to real branch ID
  const handleLocationChange = (locationId: string) => {
    const realBranchId = locationToBranchMap.get(locationId);
    if (!realBranchId) {
      console.error('❌ No branch mapping found for location:', locationId);
      return;
    }
    onFormChange({ 
      ...formData, 
      locationId: locationId, 
      branchId: realBranchId 
    });
  };
  
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
    <div className="grid gap-2 py-1">
      {/* Location/Branch Selection */}
      <div className="grid gap-1">
        <Label htmlFor="branchId" className="text-xs">
          Branch <span className="text-destructive">*</span>
        </Label>
        {hasValidMappings && mappedLocations.length > 0 ? (
          <Select 
            value={formData.locationId || formData.branchId} 
            onValueChange={handleLocationChange}
          >
            <SelectTrigger id="branchId" className="h-8 text-xs">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {mappedLocations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3 h-3 text-[#00719C]" />
                    <span>{location.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : activeBranches.length > 0 ? (
          <Select 
            value={formData.branchId} 
            onValueChange={(value) => onFormChange({ ...formData, branchId: value, locationId: undefined })}
            disabled={isBranchDisabled}
          >
            <SelectTrigger id="branchId" className="h-8 text-xs">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {activeBranches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3 h-3 text-[#00719C]" />
                    <span>{branch.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 p-1.5 rounded-md border border-dashed bg-muted/30">
            <AlertCircle className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              No branches available.
            </p>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Choose the branch where this product will be stocked
        </p>
      </div>

      <div className="grid gap-1">
        <Label htmlFor="image" className="text-xs">Product Image <span className="text-[10px] text-muted-foreground">(Max 2MB)</span></Label>
        <div className="flex items-start gap-2">
          <div className="shrink-0 relative">
            {formData.image ? (
              <div className="relative group">
                <div className="w-12 h-12 rounded-md border overflow-hidden">
                  <img src={formData.image} alt="Product" className="w-full h-full object-cover" />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onFormChange({ ...formData, image: undefined })}
                >
                  <XCircle className="w-2.5 h-2.5" />
                </Button>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md border border-dashed flex items-center justify-center bg-muted/30">
                <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-0.5">
            <Input
              id="image"
              type="file"
              accept="image/*"
              className="cursor-pointer text-xs h-8"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="flex items-center gap-1 text-[10px] text-blue-600 animate-pulse">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Uploading...
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label htmlFor="name" className="text-xs">Product Name <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
            className="h-8 text-xs"
          />
        </div>
        
        {/* Category Selection - Uses CategoryContext */}
        <div className="grid gap-1">
        <Label htmlFor="category" className="text-xs">Category <span className="text-destructive">*</span></Label>
        
        {/* ═════════════════════════════════��═════════════════════════════════
            EDGE CASE: Product with deactivated category (Edit Mode)
            ═══════════════════════════════════════════════════════════����══════ */}
        {isEditMode && isCategoryDeactivated && (
          <Alert className="border-amber-200 bg-amber-50 py-1">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            <AlertDescription className="text-amber-900 text-[10px]">
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
              className={isCategoryDeactivated ? "border-amber-300 bg-amber-50 h-8 text-xs" : "h-8 text-xs"}
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {activeCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <Tag className="w-3 h-3 text-green-600" />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
              {disabledCategories.length > 0 && (
                <>
                  {activeCategories.length > 0 && (
                    <div className="px-2 py-1">
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
                        <XCircle className="w-3 h-3 text-red-500" />
                        {cat.name} <span className="text-xs">(Deactivated)</span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 p-1.5 rounded-md border border-dashed bg-destructive/10">
            <AlertCircle className="w-3 h-3 text-destructive" />
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
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center gap-1 pb-0.5 border-b">
          <DollarSign className="w-3 h-3 text-muted-foreground" />
          <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Pricing</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="costPrice" className="text-[10px]">
              Cost ({currencySymbol})
            </Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              value={formData.costPrice || ""}
              onChange={(e) => onFormChange({ ...formData, costPrice: e.target.value })}
              placeholder="0.00"
              className="h-8 text-xs"
            />
          </div>
          
          <div className="grid gap-1">
            <Label htmlFor="price" className="text-[10px]">Retail ({currencySymbol}) <span className="text-destructive">*</span></Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => onFormChange({ ...formData, price: e.target.value })}
              placeholder="0.00"
              className="h-8 text-xs"
            />
          </div>
          
          <div className="grid gap-1">
            <Label htmlFor="wholesalePrice" className="text-[10px]">
              Wholesale ({currencySymbol})
            </Label>
            <Input
              id="wholesalePrice"
              type="number"
              step="0.01"
              value={formData.wholesalePrice || ""}
              onChange={(e) => onFormChange({ ...formData, wholesalePrice: e.target.value })}
              placeholder="0.00"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          STOCK MANAGEMENT SECTION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center gap-1 pb-0.5 border-b">
          <Package className="w-3 h-3 text-muted-foreground" />
          <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Stock</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="stock" className="text-xs">Quantity <span className="text-destructive">*</span></Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => onFormChange({ ...formData, stock: e.target.value })}
              placeholder="0"
              className="h-8 text-xs"
            />
          </div>
          
          <div className="grid gap-1">
            <Label htmlFor="lowStockThreshold" className="text-xs">
              Reorder Level
            </Label>
            <Input
              id="lowStockThreshold"
              type="number"
              value={formData.lowStockThreshold || "10"}
              onChange={(e) => onFormChange({ ...formData, lowStockThreshold: e.target.value })}
              placeholder="10"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
      <div className="grid gap-1">
        <Label htmlFor="sku" className="text-xs">SKU/Size</Label>
        <div className="flex gap-1.5">
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => onFormChange({ ...formData, sku: e.target.value })}
            placeholder="Enter SKU or size"
            className="h-8 text-xs"
          />
          <Button 
            type="button"
            variant="outline" 
            size="icon" 
            onClick={() => setIsScanning(true)}
            title="Scan Barcode"
            className="h-8 w-8 shrink-0"
          >
            <ScanBarcode className="h-3.5 w-3.5" />
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
      <div className="grid gap-1">
        <Label htmlFor="supplier" className="text-xs">
          Supplier <span className="text-[10px] text-muted-foreground">(Optional)</span>
        </Label>
        {suppliers.length > 0 ? (
          <Select 
            value={formData.supplier || "__none__"} 
            onValueChange={(value) => onFormChange({ ...formData, supplier: value === "__none__" ? "" : value })}
          >
            <SelectTrigger id="supplier" className="h-8 text-xs">
              <SelectValue placeholder="Select supplier (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground italic">No supplier</span>
              </SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.name}>
                  <div className="flex items-center gap-2">
                    <Truck className="w-3 h-3 text-muted-foreground" />
                    {supplier.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 p-1.5 rounded-md border border-dashed bg-muted/30">
            <Truck className="w-3 h-3 text-muted-foreground" />
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
// Wrapped in error boundary to prevent white screen on any crash
export function Inventory() {
  return (
    <ErrorBoundary>
      <InventoryContent />
    </ErrorBoundary>
  );
}

function InventoryContent() {
  // Safe default for all context data
  let inventory: any[] = [];
  let addProduct: any = () => {};
  let updateProduct: any = () => {};
  let deleteProduct: any = () => {};
  let inventoryError: any = null;
  let categoryList: any[] = [];
  let activeCategories: any[] = [];
  let addCategory: any = () => {};
  let categoryError: any = null;
  let suppliers: any[] = [];
  let branches: any[] = [];
  let getBranchById: any = () => undefined;
  let createBranch: any = () => {};
  let branchError: any = null;
  let locations: any[] = [];
  let user: any = null;
  let business: any = null;
  let formatCurrency: any = (n: number) => n.toString();
  let hasFeature: any = () => true;
  let plan: any = {};
  let contextError: string | null = null;

  try {
    const inv = useInventory();
    inventory = inv.inventory || [];
    addProduct = inv.addProduct;
    updateProduct = inv.updateProduct;
    deleteProduct = inv.deleteProduct;
    inventoryError = inv.error;
  } catch (e: any) {
    console.warn('Inventory context not available:', e.message);
    contextError = 'Inventory context error';
  }

  try {
    const cat = useCategory();
    categoryList = cat.categories || [];
    activeCategories = cat.activeCategories || [];
    addCategory = cat.addCategory;
    categoryError = cat.error;
  } catch (e: any) {
    console.warn('Category context not available:', e.message);
  }

  try {
    const sup = useSupplier();
    suppliers = sup.suppliers || [];
  } catch (e: any) {
    console.warn('Supplier context not available:', e.message);
  }

  try {
    const br = useBranch();
    branches = br.branches || [];
    getBranchById = br.getBranchById;
    createBranch = br.createBranch;
    branchError = br.error;
  } catch (e: any) {
    console.warn('Branch context not available:', e.message);
    contextError = contextError || 'Branch context error';
  }

  try {
    const loc = useLocation();
    locations = loc.locations || [];
  } catch (e: any) {
    console.warn('Location context not available:', e.message);
  }

  try {
    const auth = useAuth();
    user = auth.user;
    business = auth.business;
  } catch (e: any) {
    console.warn('Auth context not available:', e.message);
    contextError = contextError || 'Auth context error';
  }

  try {
    const curr = useCurrency();
    formatCurrency = curr.formatCurrency;
  } catch (e: any) {
    console.warn('Currency context not available:', e.message);
  }

  try {
    const sub = useSubscription();
    hasFeature = sub.hasFeature;
    plan = sub.plan;
  } catch (e: any) {
    console.warn('Subscription context not available:', e.message);
  }

  const navigate = useNavigate();
  
  // ALL useState hooks must be called unconditionally (Rules of Hooks)
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(contextError);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [productSort, setProductSort] = useState<"name-asc" | "name-desc" | "stock-desc" | "stock-asc" | "price-desc" | "price-asc">("name-asc");
  const [filterStockStatus, setFilterStockStatus] = useState<"All" | "Low Stock" | "Out of Stock">("All");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);
  const [isManageLocationsOpen, setIsManageLocationsOpen] = useState(false);
  const [managingProduct, setManagingProduct] = useState<InventoryItem | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importValidation, setImportValidation] = useState<{
    errors: string[];
    warnings: string[];
    success: string[];
    totalRows: number;
  } | null>(null);
  const [filterBranchId, setFilterBranchId] = useState<string>(
    user?.role === "Business Owner" ? "ALL_BRANCHES" : (user?.branchId || "")
  );
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    price: string;
    stock: string;
    sku: string;
    supplier: string;
    branchId: string;
    locationId?: string;
    image?: string;
    costPrice: string;
    retailPrice: string;
    wholesalePrice: string;
    lowStockThreshold: string;
  }>({
    name: "",
    category: "",
    price: "",
    stock: "",
    sku: "",
    supplier: "",
    branchId: "",
    locationId: "",
    image: "",
    costPrice: "",
    retailPrice: "",
    wholesalePrice: "",
    lowStockThreshold: "",
  });
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [newSupplierNotes, setNewSupplierNotes] = useState("");
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchLocation, setNewBranchLocation] = useState("");

  // Determine initial loading state based on context errors
  useEffect(() => {
    if (contextError) {
      setLoadError(contextError);
    }
    // Mark as loaded immediately — contexts are already available or errored
    setIsLoading(false);
  }, []);

  // Early return if business data is not available yet
  if (!business && !contextError) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00719C]"></div>
            <p className="text-muted-foreground">Loading business data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Derive computed values with safe access
  const branchLocationMappings = business?.id ? (business as any).branchLocationMappings || {} : {};
  const categoryListForForm = categoryList || [];

  // Location mapping state (persisted to localStorage)
  const [branchLocationMappingsState, setBranchLocationMappingsState] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('tillsup_branch_location_mappings');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Merge business mappings with local state
  const effectiveBranchLocationMappings = { ...branchLocationMappingsState, ...branchLocationMappings };
  
  useEffect(() => {
    localStorage.setItem('tillsup_branch_location_mappings', JSON.stringify(branchLocationMappingsState));
  }, [branchLocationMappingsState]);
  
  const updateBranchLocationMapping = (branchId: string, locationId: string | null) => {
    setBranchLocationMappingsState(prev => {
      const next = { ...prev };
      if (locationId === null) {
        delete next[branchId];
      } else {
        next[branchId] = locationId;
      }
      return next;
    });
    toast.success("Mapping updated successfully");
  };

  const getStockStatusCategory = (item: InventoryItem): "Out of Stock" | "Low Stock" | "In Stock" => {
    const threshold = item.lowStockThreshold || 10;
    
    if (item.stock === 0) return "Out of Stock";
    if (item.stock > 0 && item.stock <= threshold) return "Low Stock";
    return "In Stock";
  };

  const filteredInventory = inventory
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "All" || item.category === filterCategory;
      const matchesBranch = filterBranchId === "ALL_BRANCHES" || item.branchId === filterBranchId;
      
      const stockCategory = getStockStatusCategory(item);
      const matchesStockStatus = filterStockStatus === "All" || stockCategory === filterStockStatus;
      
      return matchesSearch && matchesCategory && matchesBranch && matchesStockStatus;
    })
    .sort((a, b) => {
      if (productSort === "name-desc") return b.name.localeCompare(a.name);
      if (productSort === "stock-desc") return b.stock - a.stock;
      if (productSort === "stock-asc") return a.stock - b.stock;
      if (productSort === "price-desc") return b.price - a.price;
      if (productSort === "price-asc") return a.price - b.price;
      return a.name.localeCompare(b.name);
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
    
    // REMOVED: Location validation - not needed in branches mode
    // When locations are properly configured, locationId will be set automatically
    // When in branches mode, only branchId is required (which we already validated above)

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
      locationId: undefined, // Don't set locationId - it will be managed by the form
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

    // Check subscription status before allowing import
    if (business?.id) {
      try {
        await validateSubscriptionForImport(business.id);
      } catch (error: any) {
        toast.error("Import Blocked", {
          description: error.message || "Subscription Inactive: Please renew your subscription to perform bulk imports."
        });
        setIsProcessingImport(false);
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
    <ErrorBoundary>
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
                Import Products
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Products from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file to bulk import products
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Need a template section */}
                <div className="bg-[#00719C]/5 rounded-lg p-4 border border-[#00719C]/20">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-[#00719C] mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#00719C] mb-1">Need a template?</h3>
                      <p className="text-sm text-slate-600 mb-3">Download our Excel template to get started</p>
                      <Button size="sm" onClick={downloadInventoryImportTemplate} className="flex items-center gap-2 bg-[#00719C] hover:bg-[#005d81] text-white">
                        <Download className="w-4 h-4 flex-shrink-0" />
                        <span className="font-semibold">Download Template</span>
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportFile(file);
                        validateImportFile(file);
                      }
                    }}
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
                        <li>Required columns: Name, SKU</li>
                        <li>Optional columns: Category, Cost Price, Retail Price, Stock, Branch, Supplier</li>
                        <li>Existing products (by SKU) will be updated</li>
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
              </div>

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

          {/* Add Products Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            if (open) {
              setFormData({
                name: "",
                category: "",
                price: "",
                stock: "",
                sku: "",
                supplier: "",
                branchId: "",
                locationId: "",
                image: "",
                costPrice: "",
                retailPrice: "",
                wholesalePrice: "",
                lowStockThreshold: "10",
              });
            }
            setIsAddDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Products
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">Add New Product</DialogTitle>
                <DialogDescription className="text-[11px]">
                  Add a new product to your inventory.
                </DialogDescription>
              </DialogHeader>
              <ProductForm 
                formData={formData} 
                onFormChange={setFormData}
                suppliers={suppliers}
                branches={branches}
                locations={locations}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => {
                    // Validation
                    if (!formData.name.trim()) {
                      toast.error("Product name is required");
                      return;
                    }
                    if (!formData.branchId) {
                      toast.error("Branch is required");
                      return;
                    }
                    if (hasFeature('inventoryLocations') && !formData.locationId) {
                      toast.error("Location is required");
                      return;
                    }

                    // Create the product
                    addProduct({
                      name: formData.name,
                      sku: formData.sku || `SKU-${Date.now()}`,
                      category: formData.category,
                      price: parseFloat(formData.price) || 0,
                      costPrice: parseFloat(formData.costPrice) || 0,
                      retailPrice: parseFloat(formData.retailPrice) || 0,
                      wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
                      stock: parseInt(formData.stock) || 0,
                      lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
                      supplier: formData.supplier,
                      branchId: formData.branchId,
                      locationId: formData.locationId,
                      image: formData.image,
                    });
                    
                    setIsAddDialogOpen(false);
                    toast.success("Product added successfully");
                  }}
                >
                  Add Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Product Stats */}
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Total Products</span>
              <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Package className="w-2.5 h-2.5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-slate-900 leading-none truncate">{inventory.length}</span>
            </div>
            <p className="text-[9px] text-slate-400">Items in inventory</p>
          </CardContent>
        </Card>
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Low Stock</span>
              <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-amber-600 leading-none truncate">
                {inventory.filter(i => (i.stock <= (i.lowStockThreshold || 10)) && i.stock > 0).length}
              </span>
            </div>
            <p className="text-[9px] text-slate-400">Items below threshold</p>
          </CardContent>
        </Card>
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Out of Stock</span>
              <div className="w-5 h-5 rounded-md bg-red-50 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-2.5 h-2.5 text-red-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-red-600 leading-none truncate">
                {inventory.filter(i => i.stock === 0).length}
              </span>
            </div>
            <p className="text-[9px] text-slate-400">Items unavailable</p>
          </CardContent>
        </Card>

        {/* Category Stats */}
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Total Categories</span>
              <div className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Tag className="w-2.5 h-2.5 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-slate-900 leading-none truncate">{categoryList.length}</span>
            </div>
            <p className="text-[9px] text-slate-400">Product categories</p>
          </CardContent>
        </Card>
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Active Categories</span>
              <div className="w-5 h-5 rounded-md bg-green-50 flex items-center justify-center flex-shrink-0">
                <CircleCheck className="w-2.5 h-2.5 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-green-600 leading-none truncate">{activeCategories.length}</span>
            </div>
            <p className="text-[9px] text-slate-400">Enabled categories</p>
          </CardContent>
        </Card>
        <Card className="h-[100px] border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 truncate">Disabled Categories</span>
              <div className="w-5 h-5 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Ban className="w-2.5 h-2.5 text-gray-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-base font-bold text-gray-600 leading-none truncate">
                {categoryList.filter((c) => c.status === "disabled").length}
              </span>
            </div>
            <p className="text-[9px] text-slate-400">Inactive categories</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="w-4 h-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="w-4 h-4" />
            Products
          </TabsTrigger>
  
        </TabsList>
        
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Products</CardTitle>
                <CardDescription>
                  View and manage your inventory items.
                </CardDescription>
              </div>
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
                <Select value={productSort} onValueChange={(value: "name-asc" | "name-desc" | "stock-desc" | "stock-asc" | "price-desc" | "price-asc") => setProductSort(value)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="stock-desc">Stock (High-Low)</SelectItem>
                    <SelectItem value="stock-asc">Stock (Low-High)</SelectItem>
                    <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                    <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                  </SelectContent>
                </Select>
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
                      <TableHead>Locations</TableHead>
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
                                <span className="font-medium">{item.stock}</span>
                                {stockStatus !== "In Stock" && (
                                  <Badge variant={stockStatus === "Out of Stock" ? "destructive" : "secondary"} className="w-fit text-[10px] px-1 py-0 h-4">
                                    {stockStatus}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  // Find the location mapped to this product's branch
                                  const locationId = branchLocationMappings[item.branchId];
                                  const location = locations.find(loc => loc.id === locationId);
                                  
                                  if (location) {
                                    // Show location (shop or warehouse)
                                    return (
                                      <div className="flex items-center gap-1.5 text-sm">
                                        {location.type === "shop" ? (
                                          <Building2 className="w-3.5 h-3.5 text-[#00719C]" />
                                        ) : (
                                          <Package className="w-3.5 h-3.5 text-purple-600" />
                                        )}
                                        <span className="text-xs font-medium">{location.name}</span>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                          {location.type === "shop" ? "Shop" : "Warehouse"}
                                        </Badge>
                                      </div>
                                    );
                                  } else {
                                    // Fallback to branch display if no location mapping exists
                                    return (
                                      <>
                                        <div className="flex items-center gap-1.5 text-sm">
                                          <Building2 className="w-3 h-3 text-[#00719C]" />
                                          <span className="text-xs">{branch?.name || "Unknown"}</span>
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                            Branch
                                          </Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                          No location mapping
                                        </p>
                                      </>
                                    );
                                  }
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setManagingProduct(item);
                                    setIsManageLocationsOpen(true);
                                  }}
                                  title="Manage stock at locations"
                                >
                                  <MapPin className="w-4 h-4 text-[#00719C]" />
                                </Button>
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Product</DialogTitle>
            <DialogDescription className="text-[11px]">Update product details below.</DialogDescription>
          </DialogHeader>
          <ProductForm 
            formData={formData} 
            onFormChange={setFormData}
            suppliers={suppliers}
            branches={branches}
            locations={locations}
            branchLocationMappings={effectiveBranchLocationMappings}
            userRole={user?.role || ""}
            userBranchId={user?.branchId || undefined}
            allCategories={categoryList}
            isEditMode={true}
          />
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-9 text-xs">Cancel</Button>
            <Button onClick={handleEditProduct} className="h-9 text-xs">
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

      {/* Manage Stock Locations Dialog */}
      <Dialog open={isManageLocationsOpen} onOpenChange={(open) => {
        if (!open) {
          setIsManageLocationsOpen(false);
          setManagingProduct(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#00719C]" />
              Manage Stock Locations
            </DialogTitle>
            <DialogDescription className="text-xs">
              {managingProduct && (
                <span>Manage stock quantities for <strong>{managingProduct.name}</strong> across different locations</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {managingProduct && (
              <>
                {/* Current Stock Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Stock Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{managingProduct.stock}</p>
                        <p className="text-xs text-muted-foreground">Total units across all locations</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        SKU: {managingProduct.sku}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Stock by Location */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Stock at Each Location</Label>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Location</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs text-right">Current Stock</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                              No locations available. Create locations first.
                            </TableCell>
                          </TableRow>
                        ) : (
                          locations.map((location) => {
                            // Check if product is at this location (currently using branch match)
                            const isAtLocation = managingProduct.branchId === location.id;
                            const stockAtLocation = isAtLocation ? managingProduct.stock : 0;
                            
                            return (
                              <TableRow key={location.id}>
                                <TableCell className="text-xs">
                                  <div className="flex items-center gap-2">
                                    {location.type === "shop" ? (
                                      <Building2 className="w-3.5 h-3.5 text-[#00719C]" />
                                    ) : (
                                      <Package className="w-3.5 h-3.5 text-purple-600" />
                                    )}
                                    <span className="font-medium">{location.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant="outline" className="text-[10px]">
                                    {location.type === "shop" ? "Shop" : "Warehouse"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  <span className="font-medium">{stockAtLocation}</span>
                                  {isAtLocation && (
                                    <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                                      Primary
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {isAtLocation ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => openEditDialog(managingProduct)}
                                    >
                                      Edit Stock
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-[#00719C]"
                                      onClick={() => {
                                        toast.info("Stock Update", {
                                          description: "Use the Edit Stock button to update quantities at this location."
                                        });
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add Stock
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Info Alert - Single Branch Mode */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle className="text-xs">Single Branch Mode</AlertTitle>
                  <AlertDescription className="text-xs">
                    Products are managed directly in your branch. Stock tracking is available per branch.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageLocationsOpen(false)} className="h-9 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
}