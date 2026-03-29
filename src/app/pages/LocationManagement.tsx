/**
 * LocationManagement - Manage shops and warehouses
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Store as StoreIcon,
  Warehouse,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Package,
  AlertTriangle,
  Building2,
  Star,
  Search,
} from "lucide-react";
import { useLocation, Location, LocationType } from "../contexts/LocationContext";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../hooks/useCurrency";
import { toast } from "sonner";
import { cn } from "../components/ui/utils";

export function LocationManagement() {
  const { locations, addLocation, updateLocation, deleteLocation, getShops, getWarehouses, isUsingDemoData } = useLocation();
  const { user, business } = useAuth();
  const { formatCurrency } = useCurrency();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "shop" | "warehouse">("all");
  const [showDemoAlert, setShowDemoAlert] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    type: "shop" as LocationType,
    address: "",
    city: "",
    phone: "",
    email: "",
    isDefault: false,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "shop",
      address: "",
      city: "",
      phone: "",
      email: "",
      isDefault: false,
    });
    setEditingLocation(null);
  };

  const handleOpenDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        type: location.type,
        address: location.address || "",
        city: location.city || "",
        phone: location.phone || "",
        email: location.email || "",
        isDefault: location.isDefault,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a location name");
      return;
    }

    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, formData);
        toast.success("Location updated successfully");
      } else {
        await addLocation({
          ...formData,
          businessId: business?.id || "demo-business",
          isActive: true,
        });
        toast.success("Location added successfully");
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to save location");
    }
  };

  const handleDelete = async (location: Location) => {
    if (location.isDefault) {
      toast.error("Cannot delete the default location");
      return;
    }

    try {
      await deleteLocation(location.id);
      toast.success("Location deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete location");
    }
  };

  const handleDeleteConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!locationToDelete) return;

    if (deleteConfirmText !== locationToDelete.name) {
      toast.error("Location name doesn't match");
      return;
    }

    try {
      await deleteLocation(locationToDelete.id);
      toast.success("Location deleted successfully");
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
      setDeleteConfirmText("");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete location");
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setLocationToDelete(null);
      setDeleteConfirmText("");
    }
  };

  // Filter locations
  const filteredLocations = locations.filter((location) => {
    const matchesSearch = location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || location.type === filterType;
    return matchesSearch && matchesType;
  });

  const shops = getShops();
  const warehouses = getWarehouses();

  const totalStockValue = locations.reduce((sum, loc) => sum + (loc.totalStockValue || 0), 0);
  const totalProducts = locations.reduce((sum, loc) => sum + (loc.totalProducts || 0), 0);
  const totalLowStock = locations.reduce((sum, loc) => sum + (loc.lowStockCount || 0), 0);

  const getLocationIcon = (type: LocationType) => {
    return type === "shop" ? (
      <StoreIcon className="w-4 h-4 text-[#00719C]" />
    ) : (
      <Warehouse className="w-4 h-4 text-purple-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Locations</h1>
        <p className="text-muted-foreground mt-1">Manage your shops and warehouses</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Locations</p>
                <p className="text-2xl font-bold text-[#00719C]">{locations.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-[#00719C] opacity-20" />
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="border-[#00719C] text-[#00719C]">
                {shops.length} Shops
              </Badge>
              <Badge variant="outline" className="border-purple-600 text-purple-600">
                {warehouses.length} Warehouses
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalStockValue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-orange-600">{totalLowStock}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="shop">Shops Only</SelectItem>
                  <SelectItem value="warehouse">Warehouses Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-[#00719C] hover:bg-[#00719C]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <CardDescription>
            {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
                <TableHead className="text-right">Low Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No locations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getLocationIcon(location.type)}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {location.name}
                            {location.isDefault && (
                              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            )}
                          </div>
                          {location.city && (
                            <div className="text-xs text-muted-foreground">{location.city}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          location.type === "shop"
                            ? "border-[#00719C] text-[#00719C]"
                            : "border-purple-600 text-purple-600"
                        )}
                      >
                        {location.type === "shop" ? "Shop" : "Warehouse"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {location.address || (
                          <span className="text-muted-foreground">No address</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {location.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {location.phone}
                          </div>
                        )}
                        {location.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {location.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{location.totalProducts || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(location.totalStockValue || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.lowStockCount && location.lowStockCount > 0 ? (
                        <Badge variant="destructive">{location.lowStockCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(location)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLocationToDelete(location);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={location.isDefault}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Location" : "Add New Location"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? "Update the details of this location"
                : "Create a new shop or warehouse location"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Location Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Westlands Shop"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  Location Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: LocationType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="w-4 h-4 text-[#00719C]" />
                        Shop / Store
                      </div>
                    </SelectItem>
                    <SelectItem value="warehouse">
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-purple-600" />
                        Warehouse
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="e.g., Westlands Mall, Ground Floor"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g., Nairobi"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+254 712 345 678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="location@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#00719C] hover:bg-[#00719C]/90"
              >
                {editingLocation ? "Update Location" : "Add Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Location
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the location and all associated data.
            </DialogDescription>
          </DialogHeader>

          {locationToDelete && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                {getLocationIcon(locationToDelete.type)}
                <div>
                  <div className="font-medium">{locationToDelete.name}</div>
                  {locationToDelete.city && (
                    <div className="text-sm text-muted-foreground">{locationToDelete.city}</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t">
                <div>
                  <div className="text-muted-foreground">Products</div>
                  <div className="font-medium">{locationToDelete.totalProducts || 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Stock Value</div>
                  <div className="font-medium">{formatCurrency(locationToDelete.totalStockValue || 0)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Low Stock</div>
                  <div className="font-medium text-orange-600">{locationToDelete.lowStockCount || 0}</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleDeleteConfirm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmText">
                Type <span className="font-mono font-semibold">{locationToDelete?.name}</span> to confirm
              </Label>
              <Input
                id="confirmText"
                placeholder="Enter location name"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoComplete="off"
                autoFocus
              />
              {deleteConfirmText && deleteConfirmText !== locationToDelete?.name && (
                <p className="text-sm text-destructive">Location name doesn't match</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteDialogClose(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteConfirmText !== locationToDelete?.name}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Location
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}