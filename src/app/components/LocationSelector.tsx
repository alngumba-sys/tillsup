/**
 * LocationSelector - Global location switcher for multi-location management
 * Shows in header for Owners and Managers only
 */

import { Building2, Warehouse, MapPin, Store as StoreIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { useLocation } from "../contexts/LocationContext";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "./ui/utils";

export function LocationSelector() {
  const { user } = useAuth();
  
  // Only show for Business Owner and Manager
  if (!user?.role || (user.role !== "Business Owner" && user.role !== "Manager")) {
    return null;
  }

  // Lazy load the location context only when needed
  try {
    return <LocationSelectorInner />;
  } catch (error) {
    console.error("LocationSelector error:", error);
    return null;
  }
}

function LocationSelectorInner() {
  const { locations, selectedLocationId, setSelectedLocation, getShops, getWarehouses } = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  // Managers can only see their assigned location + linked warehouses
  const visibleLocations = user.role === "Manager" && user.branchId
    ? locations.filter(loc => 
        loc.id === user.branchId || 
        (loc.type === "warehouse" && loc.isActive)
      )
    : locations.filter(loc => loc.isActive);

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
  const shops = getShops().filter(loc => loc.isActive);
  const warehouses = getWarehouses().filter(loc => loc.isActive);

  const getLocationIcon = (type: "shop" | "warehouse") => {
    return type === "shop" ? (
      <StoreIcon className="w-4 h-4 text-[#0891b2]" />
    ) : (
      <Warehouse className="w-4 h-4 text-purple-600" />
    );
  };

  const getLocationBadge = (location: typeof selectedLocation) => {
    if (!location) return null;
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "ml-2",
          location.type === "shop" ? "border-[#0891b2] text-[#0891b2]" : "border-purple-600 text-purple-600"
        )}
      >
        {location.type === "shop" ? "Shop" : "Warehouse"}
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-sm">
      <MapPin className="w-4 h-4 text-muted-foreground" />
      
      <Select value={selectedLocationId} onValueChange={setSelectedLocation}>
        <SelectTrigger className="w-[240px] border-0 shadow-none focus:ring-0 h-auto p-0">
          <SelectValue>
            <div className="flex items-center gap-2">
              {selectedLocationId === "all" ? (
                <>
                  <Building2 className="w-4 h-4 text-[#0891b2]" />
                  <span className="font-medium">All Locations</span>
                  <Badge variant="secondary" className="ml-1">
                    {visibleLocations.length}
                  </Badge>
                </>
              ) : selectedLocation ? (
                <>
                  {getLocationIcon(selectedLocation.type)}
                  <span className="font-medium">{selectedLocation.name}</span>
                  {getLocationBadge(selectedLocation)}
                </>
              ) : (
                "Select Location"
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent className="w-[280px]">
          {/* All Locations - Only for Business Owner */}
          {user.role === "Business Owner" && (
            <>
              <SelectItem value="all" className="font-medium">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0891b2]" />
                  <span>All Locations</span>
                  <Badge variant="secondary" className="ml-auto">
                    {locations.filter(loc => loc.isActive).length}
                  </Badge>
                </div>
              </SelectItem>
              <div className="h-px bg-border my-1" />
            </>
          )}
          
          {/* Shops Section */}
          {shops.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                SHOPS ({shops.length})
              </div>
              {shops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  <div className="flex items-center gap-2">
                    <StoreIcon className="w-4 h-4 text-[#0891b2]" />
                    <div className="flex-1">
                      <div className="font-medium">{shop.name}</div>
                      {shop.city && (
                        <div className="text-xs text-muted-foreground">{shop.city}</div>
                      )}
                    </div>
                    {shop.lowStockCount && shop.lowStockCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {shop.lowStockCount} low
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          
          {/* Warehouses Section */}
          {warehouses.length > 0 && (
            <>
              <div className="h-px bg-border my-1" />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                WAREHOUSES ({warehouses.length})
              </div>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-purple-600" />
                    <div className="flex-1">
                      <div className="font-medium">{warehouse.name}</div>
                      {warehouse.city && (
                        <div className="text-xs text-muted-foreground">{warehouse.city}</div>
                      )}
                    </div>
                    {warehouse.totalProducts !== undefined && (
                      <Badge variant="outline" className="ml-auto border-purple-200 text-purple-700">
                        {warehouse.totalProducts} items
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}