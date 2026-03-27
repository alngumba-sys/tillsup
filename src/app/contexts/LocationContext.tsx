/**
 * LocationContext - Multi-Location Inventory Management
 * Manages shops and warehouses across the business
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../../lib/supabase";
import { isPreviewMode } from "../utils/previewMode";
import { ProductStock, useInventory } from "./InventoryContext";

export type LocationType = "shop" | "warehouse";

export interface Location {
  id: string;
  businessId: string;
  name: string;
  type: LocationType;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Stock summary (computed)
  totalProducts?: number;
  totalStockValue?: number;
  lowStockCount?: number;
}

export interface StockTransfer {
  id: string;
  businessId: string;
  fromLocationId: string;
  toLocationId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: "pending" | "in_transit" | "completed" | "cancelled";
  notes?: string;
  estimatedTime?: string;
  initiatedBy: string;
  initiatedByName: string;
  completedBy?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationStock {
  locationId: string;
  productId: string;
  quantity: number;
  lowStockThreshold?: number;
  lastUpdated: Date;
}

interface LocationContextType {
  locations: Location[];
  transfers: StockTransfer[];
  selectedLocationId: string | "all";
  loading: boolean;
  error: string | null;
  isUsingDemoData: boolean;
  
  // Location management
  setSelectedLocation: (locationId: string | "all") => void;
  addLocation: (location: Omit<Location, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  getLocationById: (id: string) => Location | undefined;
  getShops: () => Location[];
  getWarehouses: () => Location[];
  
  // Stock transfer management
  createTransfer: (transfer: Omit<StockTransfer, "id" | "createdAt" | "updatedAt" | "status">) => Promise<void>;
  updateTransferStatus: (id: string, status: StockTransfer["status"], completedBy?: string) => Promise<void>;
  getTransferHistory: (locationId?: string) => StockTransfer[];
  
  // Stock operations
  getLocationStock: (locationId: string, productId: string) => number;
  updateLocationStock: (locationId: string, productId: string, quantity: number) => Promise<void>;
  transferStock: (fromLocationId: string, toLocationId: string, productId: string, quantity: number, notes?: string) => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Demo data for preview mode
const demoLocations: Location[] = [
  {
    id: "loc-1",
    businessId: "demo-business",
    name: "Westlands Shop",
    type: "shop",
    address: "Westlands Mall, Ground Floor",
    city: "Nairobi",
    phone: "+254 712 345 678",
    isActive: true,
    isDefault: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    totalProducts: 245,
    totalStockValue: 1250000,
    lowStockCount: 12,
  },
  {
    id: "loc-2",
    businessId: "demo-business",
    name: "South B Shop",
    type: "shop",
    address: "South B Shopping Center, Shop 12",
    city: "Nairobi",
    phone: "+254 722 456 789",
    isActive: true,
    isDefault: false,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
    totalProducts: 198,
    totalStockValue: 890000,
    lowStockCount: 8,
  },
  {
    id: "loc-3",
    businessId: "demo-business",
    name: "Eastleigh Shop",
    type: "shop",
    address: "1st Avenue, Eastleigh",
    city: "Nairobi",
    phone: "+254 733 567 890",
    isActive: true,
    isDefault: false,
    createdAt: new Date("2024-03-10"),
    updatedAt: new Date("2024-03-10"),
    totalProducts: 167,
    totalStockValue: 670000,
    lowStockCount: 5,
  },
  {
    id: "loc-4",
    businessId: "demo-business",
    name: "Main Warehouse",
    type: "warehouse",
    address: "Industrial Area, Godown 15",
    city: "Nairobi",
    phone: "+254 744 678 901",
    isActive: true,
    isDefault: false,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
    totalProducts: 412,
    totalStockValue: 3200000,
    lowStockCount: 18,
  },
  {
    id: "loc-5",
    businessId: "demo-business",
    name: "Secondary Warehouse",
    type: "warehouse",
    address: "Mlolongo, Warehouse Complex B",
    city: "Machakos",
    phone: "+254 755 789 012",
    isActive: true,
    isDefault: false,
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-02-20"),
    totalProducts: 289,
    totalStockValue: 1800000,
    lowStockCount: 7,
  },
];

const demoTransfers: StockTransfer[] = [
  {
    id: "transfer-1",
    businessId: "demo-business",
    fromLocationId: "loc-4",
    toLocationId: "loc-1",
    productId: "prod-1",
    productName: "Premium Coffee Beans 1kg",
    quantity: 50,
    status: "completed",
    notes: "Regular restock",
    initiatedBy: "user-1",
    initiatedByName: "Albert Ngumba",
    completedBy: "user-2",
    completedAt: new Date("2024-03-08"),
    createdAt: new Date("2024-03-07"),
    updatedAt: new Date("2024-03-08"),
  },
  {
    id: "transfer-2",
    businessId: "demo-business",
    fromLocationId: "loc-4",
    toLocationId: "loc-2",
    productId: "prod-5",
    productName: "Wireless Earbuds",
    quantity: 25,
    status: "in_transit",
    notes: "High demand item",
    estimatedTime: "2 hours",
    initiatedBy: "user-1",
    initiatedByName: "Albert Ngumba",
    createdAt: new Date("2024-03-11"),
    updatedAt: new Date("2024-03-11"),
  },
  {
    id: "transfer-3",
    businessId: "demo-business",
    fromLocationId: "loc-5",
    toLocationId: "loc-3",
    productId: "prod-12",
    productName: "Sports Sneakers - Size 42",
    quantity: 15,
    status: "pending",
    notes: "Customer pre-orders",
    initiatedBy: "user-3",
    initiatedByName: "Sarah Kimani",
    createdAt: new Date("2024-03-11"),
    updatedAt: new Date("2024-03-11"),
  },
];

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user, business } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationStock, setLocationStock] = useState<Map<string, Map<string, number>>>(new Map());
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);
  const inventoryContext = useInventory();

  // Initialize locations
  useEffect(() => {
    if (isPreviewMode()) {
      setLocations(demoLocations);
      setTransfers(demoTransfers);
      setLoading(false);
      setIsUsingDemoData(true);
      
      // Initialize demo stock data
      const stockMap = new Map<string, Map<string, number>>();
      demoLocations.forEach(loc => {
        const prodMap = new Map<string, number>();
        // Add some demo stock quantities
        for (let i = 1; i <= 20; i++) {
          prodMap.set(`prod-${i}`, Math.floor(Math.random() * 100) + 10);
        }
        stockMap.set(loc.id, prodMap);
      });
      setLocationStock(stockMap);
    } else {
      // In production, load from Supabase
      loadLocations();
      loadTransfers();
    }
  }, [business?.id]);

  // Sync inventory stock with location stock
  useEffect(() => {
    if (!inventoryContext) return;
    
    const { inventory } = inventoryContext;
    if (inventory.length === 0) return;
    if (locations.length === 0) return;

    // Create a map of location stock from inventory data
    const stockMap = new Map<string, Map<string, number>>();
    
    // Initialize all locations with empty stock maps
    locations.forEach(location => {
      stockMap.set(location.id, new Map());
    });
    
    inventory.forEach(product => {
      // For demo data: distribute products across all locations
      // In production: use actual location mappings
      if (isPreviewMode()) {
        // Distribute stock deterministically across locations for demo purposes
        // Use product ID hash to create consistent distribution
        const productHash = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        locations.forEach((location, index) => {
          if (!stockMap.has(location.id)) {
            stockMap.set(location.id, new Map());
          }
          
          // Create deterministic distribution based on product and location IDs
          const locationHash = location.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const seed = (productHash + locationHash) % 100;
          
          // Give warehouses more stock than shops (deterministic)
          const stockMultiplier = location.type === 'warehouse' ? 1.5 : 0.8;
          
          // Distribution percentage based on seed (40% to 90% of total)
          const distributionPercent = 0.4 + (seed / 100) * 0.5;
          
          const locationStock = Math.floor(product.stock * stockMultiplier * distributionPercent);
          stockMap.get(location.id)!.set(product.id, locationStock);
        });
      } else {
        // Production: map products by branchId/locationId
        const locationId = product.branchId;
        
        if (!stockMap.has(locationId)) {
          stockMap.set(locationId, new Map());
        }
        
        stockMap.get(locationId)!.set(product.id, product.stock);
      }
    });
    
    setLocationStock(stockMap);
  }, [inventoryContext?.inventory, locations.length]); // Only re-run when inventory or location count changes

  const loadLocations = async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table doesn't exist - silently fall back to demo data
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          setLocations(demoLocations);
          setIsUsingDemoData(true);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data) {
        const formattedLocations: Location[] = data.map((loc: any) => ({
          id: loc.id,
          businessId: loc.business_id,
          name: loc.name,
          type: loc.type,
          address: loc.address,
          city: loc.city,
          phone: loc.phone,
          email: loc.email,
          isActive: loc.is_active,
          isDefault: loc.is_default,
          createdAt: new Date(loc.created_at),
          updatedAt: new Date(loc.updated_at),
          totalProducts: loc.total_products || 0,
          totalStockValue: loc.total_stock_value || 0,
          lowStockCount: loc.low_stock_count || 0,
        }));
        setLocations(formattedLocations);
        setIsUsingDemoData(false);
      }
    } catch (err: any) {
      console.error('Error loading locations:', err);
      setError(err.message);
      // Fall back to demo data on error
      setLocations(demoLocations);
      setIsUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  const loadTransfers = async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table doesn't exist - silently fall back to demo data
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          setTransfers(demoTransfers);
          return;
        }
        throw error;
      }

      if (data) {
        const formattedTransfers: StockTransfer[] = data.map((transfer: any) => ({
          id: transfer.id,
          businessId: transfer.business_id,
          fromLocationId: transfer.from_location_id,
          toLocationId: transfer.to_location_id,
          productId: transfer.product_id,
          productName: transfer.product_name,
          quantity: transfer.quantity,
          status: transfer.status,
          notes: transfer.notes,
          estimatedTime: transfer.estimated_time,
          initiatedBy: transfer.initiated_by,
          initiatedByName: transfer.initiated_by_name,
          completedBy: transfer.completed_by,
          completedAt: transfer.completed_at ? new Date(transfer.completed_at) : undefined,
          createdAt: new Date(transfer.created_at),
          updatedAt: new Date(transfer.updated_at),
        }));
        setTransfers(formattedTransfers);
      }
    } catch (err: any) {
      console.error('Error loading transfers:', err);
      // Fall back to demo data on error
      setTransfers(demoTransfers);
    }
  };

  const setSelectedLocation = (locationId: string | "all") => {
    setSelectedLocationId(locationId);
  };

  const addLocation = async (location: Omit<Location, "id" | "createdAt" | "updatedAt">) => {
    if (isPreviewMode() || isUsingDemoData) {
      const newLocation: Location = {
        ...location,
        id: `loc-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalProducts: 0,
        totalStockValue: 0,
        lowStockCount: 0,
      };
      setLocations([...locations, newLocation]);
    } else {
      // Supabase creation
      try {
        const { data, error } = await supabase
          .from('locations')
          .insert([{
            business_id: location.businessId,
            name: location.name,
            type: location.type,
            address: location.address,
            city: location.city,
            phone: location.phone,
            email: location.email,
            is_active: location.isActive,
            is_default: location.isDefault,
          }])
          .select()
          .single();

        if (error) throw error;

        // Add to local state
        if (data) {
          const newLocation: Location = {
            id: data.id,
            businessId: data.business_id,
            name: data.name,
            type: data.type,
            address: data.address,
            city: data.city,
            phone: data.phone,
            email: data.email,
            isActive: data.is_active,
            isDefault: data.is_default,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            totalProducts: 0,
            totalStockValue: 0,
            lowStockCount: 0,
          };
          setLocations([newLocation, ...locations]);
        }
      } catch (err: any) {
        console.error('Error adding location:', err);
        throw new Error(err.message || 'Failed to add location');
      }
    }
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    if (isPreviewMode() || isUsingDemoData) {
      setLocations(locations.map(loc => 
        loc.id === id ? { ...loc, ...updates, updatedAt: new Date() } : loc
      ));
    } else {
      // Supabase update
      try {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.address !== undefined) updateData.address = updates.address;
        if (updates.city !== undefined) updateData.city = updates.city;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
        if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

        const { error } = await supabase
          .from('locations')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        // Update local state
        setLocations(locations.map(loc => 
          loc.id === id ? { ...loc, ...updates, updatedAt: new Date() } : loc
        ));
      } catch (err: any) {
        console.error('Error updating location:', err);
        throw new Error(err.message || 'Failed to update location');
      }
    }
  };

  const deleteLocation = async (id: string) => {
    if (isPreviewMode() || isUsingDemoData) {
      setLocations(locations.filter(loc => loc.id !== id));
    } else {
      // Supabase deletion
      try {
        const { error } = await supabase
          .from('locations')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Update local state
        setLocations(locations.filter(loc => loc.id !== id));
      } catch (err: any) {
        console.error('Error deleting location:', err);
        throw new Error(err.message || 'Failed to delete location');
      }
    }
  };

  const getLocationById = (id: string): Location | undefined => {
    return locations.find(loc => loc.id === id);
  };

  const getShops = (): Location[] => {
    return locations.filter(loc => loc.type === "shop");
  };

  const getWarehouses = (): Location[] => {
    return locations.filter(loc => loc.type === "warehouse");
  };

  const createTransfer = async (transfer: Omit<StockTransfer, "id" | "createdAt" | "updatedAt" | "status">) => {
    if (isPreviewMode()) {
      const newTransfer: StockTransfer = {
        ...transfer,
        id: `transfer-${Date.now()}`,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setTransfers([newTransfer, ...transfers]);
    } else {
      // TODO: Implement Supabase creation
    }
  };

  const updateTransferStatus = async (id: string, status: StockTransfer["status"], completedBy?: string) => {
    if (isPreviewMode()) {
      setTransfers(transfers.map(t => 
        t.id === id ? { 
          ...t, 
          status, 
          completedBy,
          completedAt: status === "completed" ? new Date() : t.completedAt,
          updatedAt: new Date() 
        } : t
      ));
    } else {
      // TODO: Implement Supabase update
    }
  };

  const getTransferHistory = (locationId?: string): StockTransfer[] => {
    if (!locationId) return transfers;
    return transfers.filter(t => 
      t.fromLocationId === locationId || t.toLocationId === locationId
    );
  };

  const getLocationStock = (locationId: string, productId: string): number => {
    return locationStock.get(locationId)?.get(productId) || 0;
  };

  const updateLocationStock = async (locationId: string, productId: string, quantity: number) => {
    if (isPreviewMode()) {
      const newStockMap = new Map(locationStock);
      if (!newStockMap.has(locationId)) {
        newStockMap.set(locationId, new Map());
      }
      newStockMap.get(locationId)!.set(productId, quantity);
      setLocationStock(newStockMap);
    } else {
      // TODO: Implement Supabase update
    }
  };

  const transferStock = async (
    fromLocationId: string, 
    toLocationId: string, 
    productId: string, 
    quantity: number,
    notes?: string
  ) => {
    // Validate stock availability
    const fromStock = getLocationStock(fromLocationId, productId);
    if (fromStock < quantity) {
      throw new Error("Insufficient stock at source location");
    }

    // Get product name from inventory context
    const product = inventoryContext?.inventory.find(p => p.id === productId);
    const productName = product?.name || "Unknown Product";

    // Create transfer record
    const transferData = {
      businessId: business?.id || "demo-business",
      fromLocationId,
      toLocationId,
      productId,
      productName,
      quantity,
      notes,
      initiatedBy: user?.id || "demo-user",
      initiatedByName: user ? `${user.firstName} ${user.lastName}` : "Demo User",
    };

    await createTransfer(transferData);

    // Update stock quantities
    await updateLocationStock(fromLocationId, productId, fromStock - quantity);
    const toStock = getLocationStock(toLocationId, productId);
    await updateLocationStock(toLocationId, productId, toStock + quantity);
  };

  const value: LocationContextType = {
    locations,
    transfers,
    selectedLocationId,
    loading,
    error,
    isUsingDemoData,
    setSelectedLocation,
    addLocation,
    updateLocation,
    deleteLocation,
    getLocationById,
    getShops,
    getWarehouses,
    createTransfer,
    updateTransferStatus,
    getTransferHistory,
    getLocationStock,
    updateLocationStock,
    transferStock,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}