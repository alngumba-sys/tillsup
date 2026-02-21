import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { 
  Users, 
  Building2, 
  TrendingUp, 
  CreditCard, 
  Activity, 
  Search, 
  Download,
  LogOut,
  ArrowUpRight,
  Globe,
  ArrowUpDown,
  Filter,
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  FileIcon,
  Loader2,
  Phone,
  LayoutTemplate,
  Monitor,
  Moon,
  Sun,
  Palette
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "../components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { COUNTRIES } from "../utils/countries";

interface BusinessData {
  id: string;
  name: string;
  owner_name: string;
  owner_phone: string;
  country: string;
  created_at: string;
  customer_count: number;
  total_volume: number;
  status: "active" | "trial" | "expired";
}

type SortConfig = {
  key: keyof BusinessData;
  direction: 'asc' | 'desc';
} | null;

interface AssetFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
  };
}

const BRANDING_SLOTS = [
  {
    id: "platform-logo-main",
    label: "Main Platform Logo",
    description: "Used in the navigation bar and primary headers (Light Mode). Recommended: PNG, 200x50px.",
    icon: Sun,
    previewClass: "bg-white"
  },
  {
    id: "platform-logo-dark",
    label: "Dark Mode Logo",
    description: "Used in dark mode navigation and footers. Recommended: White text PNG, 200x50px.",
    icon: Moon,
    previewClass: "bg-slate-950"
  },
  {
    id: "platform-favicon",
    label: "Favicon",
    description: "Browser tab icon. Recommended: Square PNG or ICO, 32x32px or 64x64px.",
    icon: LayoutTemplate,
    previewClass: "bg-slate-200"
  },
  {
    id: "platform-auth-bg",
    label: "Auth Background",
    description: "Background image for Login and Register pages. Recommended: JPG/WebP, 1920x1080px.",
    icon: Monitor,
    previewClass: "bg-slate-800"
  },
  {
    id: "platform-og-image",
    label: "Social Share Image",
    description: "Open Graph image for social media links. Recommended: JPG/PNG, 1200x630px.",
    icon: Globe,
    previewClass: "bg-slate-800"
  }
];

import { useBranding } from "../contexts/BrandingContext";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { refreshBranding } = useBranding();
  
  // Dashboard State
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  
  // Advanced filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");

  // Metrics
  const [metrics, setMetrics] = useState({
    totalBusinesses: 0,
    totalCustomers: 0,
    totalVolume: 0,
    activeSubscriptions: 0,
    growthRate: 0
  });

  // Assets State
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slotUploading, setSlotUploading] = useState<string | null>(null);
  const [showRLSDialog, setShowRLSDialog] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Businesses
      const { data: businessesData, error: bizError } = await supabase
        .from('businesses')
        .select(`
          id, 
          name, 
          owner_id,
          country, 
          created_at, 
          subscription_status
        `);

      if (bizError) throw bizError;

      if (!businessesData || businessesData.length === 0) {
        setBusinesses([]);
        setMetrics({
          totalBusinesses: 0,
          totalCustomers: 0,
          totalVolume: 0,
          activeSubscriptions: 0,
          growthRate: 0
        });
        setLoading(false);
        return;
      }

      // 2. Fetch Profiles (Owner Names & Phones) manually
      const ownerIds = businessesData.map(b => b.owner_id).filter(Boolean);
      let profilesMap: Record<string, { name: string; phone: string }> = {};

      if (ownerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ownerIds);
        
        if (profilesData) {
          profilesData.forEach((p: any) => {
             profilesMap[p.id] = {
               name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
               phone: p.phone_number || p.phone || p.mobile || 'N/A'
             };
          });
        }
      }

      // 3. Fetch Real Metrics
      let customerCounts: Record<string, number> = {};
      let volumeCounts: Record<string, number> = {};

      try {
          const { data: customersData } = await supabase.from('customers').select('business_id');
          if (customersData) {
              customersData.forEach((c: any) => {
                  if (c.business_id) customerCounts[c.business_id] = (customerCounts[c.business_id] || 0) + 1;
              });
          }
      } catch (e) { console.warn("Failed to fetch customers for stats", e); }

      try {
          const { data: salesData } = await supabase.from('sales').select('business_id, total');
          if (salesData) {
              salesData.forEach((s: any) => {
                  if (s.business_id) volumeCounts[s.business_id] = (volumeCounts[s.business_id] || 0) + (Number(s.total) || 0);
              });
          }
      } catch (e) { console.warn("Failed to fetch sales for stats", e); }

      // 4. Map Data
      const mappedBusinesses: BusinessData[] = businessesData.map((b: any) => ({
        id: b.id,
        name: b.name || "Unnamed Business",
        owner_name: profilesMap[b.owner_id]?.name || "Unknown",
        owner_phone: profilesMap[b.owner_id]?.phone || "N/A",
        country: b.country || "Global",
        created_at: b.created_at,
        customer_count: customerCounts[b.id] || 0,
        total_volume: volumeCounts[b.id] || 0,
        status: b.subscription_status === 'active' ? 'active' : 'trial'
      }));

      // 5. Apply Time Filter
      let filteredData = mappedBusinesses;
      const now = new Date();
      
      if (timeFilter === "24h") {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        filteredData = filteredData.filter(b => new Date(b.created_at) >= oneDayAgo);
      } else if (timeFilter === "7d") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredData = filteredData.filter(b => new Date(b.created_at) >= sevenDaysAgo);
      } else if (timeFilter === "30d") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredData = filteredData.filter(b => new Date(b.created_at) >= thirtyDaysAgo);
      }

      setBusinesses(filteredData);

      // 6. Calculate Metrics
      const totalBiz = filteredData.length;
      const activeSubs = filteredData.filter(b => b.status === "active").length;
      const totalCust = filteredData.reduce((sum, b) => sum + b.customer_count, 0);
      const totalVol = filteredData.reduce((sum, b) => sum + b.total_volume, 0);

      setMetrics({
        totalBusinesses: totalBiz,
        totalCustomers: totalCust,
        totalVolume: totalVol,
        activeSubscriptions: activeSubs,
        growthRate: 0
      });

    } catch (err) {
      console.error("Error fetching admin data:", err);
      toast.error("Failed to load business data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      const { data, error } = await supabase.storage.from('platform-assets').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) {
         if (error.message.includes("Bucket not found")) {
             toast.error("Bucket 'platform-assets' not found. Please create it in Supabase.");
         } else {
             throw error;
         }
      }
      
      setAssets((data as AssetFile[]) || []);
    } catch (err: any) {
      console.error("Error fetching assets:", err);
      toast.error("Failed to load assets: " + err.message);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, customName?: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (customName) setSlotUploading(customName);
    else setUploading(true);
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop() || '';
    
    try {
        // --- 1. Ensure Bucket Exists (Attempt Creation) ---
        // If the bucket doesn't exist, uploads will fail. We try to create it if we get a specific error,
        // or just proactively check/create if possible. Since we can't always check existence cheaply without erroring,
        // we'll wrap the logic.
        
        // However, a simpler way is to handle the specific error if upload fails, or try a list first.
        // Let's try to list first. If list fails with "Bucket not found", we create it.
        const { error: listError } = await supabase.storage.from('platform-assets').list('', { limit: 1 });
        
        if (listError && listError.message.includes("Bucket not found")) {
            // Attempt to create the bucket
            const { error: createError } = await supabase.storage.createBucket('platform-assets', {
                public: true,
                fileSizeLimit: 5242880, // 5MB
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/x-icon']
            });
            
            if (createError) {
                console.error("Failed to create bucket:", createError);
                toast.error("Error: Bucket 'platform-assets' missing. Please create a Public bucket named 'platform-assets' in your Supabase Dashboard > Storage.");
                return;
            }
            toast.success("Created 'platform-assets' storage bucket.");
        }

        if (customName) {
            // 2. Delete existing assets for this slot to avoid conflicts (e.g. logo.png vs logo.jpg)
            const { data: existingFiles } = await supabase.storage.from('platform-assets').list('', {
                search: customName
            });
            
            if (existingFiles && existingFiles.length > 0) {
                const filesToDelete = existingFiles
                    .filter(f => f.name.startsWith(customName))
                    .map(f => f.name);
                
                if (filesToDelete.length > 0) {
                    await supabase.storage.from('platform-assets').remove(filesToDelete);
                }
            }
        }

        let fileName;
        if (customName) {
            fileName = `${customName}.${fileExt}`;
        } else {
            fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        }

        const { error: uploadError } = await supabase.storage
            .from('platform-assets')
            .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
            });

        if (uploadError) throw uploadError;
        
        toast.success("Image uploaded successfully");
        await fetchAssets();
        await refreshBranding(); // Update app-wide branding
    } catch (error: any) {
        console.error("Upload error:", error);
        
        // specific handling for bucket not found if it slipped through
        if (error.message && (error.message.includes("Bucket not found") || error.statusCode === "404")) {
             toast.error("Bucket 'platform-assets' not found. Please create a PUBLIC bucket named 'platform-assets' in your Supabase Storage.");
        } else if (error.message && error.message.includes("row-level security")) {
             setStorageError(true);
             toast.error("Upload failed: Storage policies not configured.");
             setShowRLSDialog(true);
        } else {
             toast.error("Error uploading image: " + error.message);
        }
    } finally {
        setUploading(false);
        setSlotUploading(null);
        e.target.value = "";
    }
  };

  const handleDeleteAsset = async (name: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
        const { error } = await supabase.storage
            .from('platform-assets')
            .remove([name]);
        
        if (error) throw error;
        toast.success("Asset deleted");
        fetchAssets();
    } catch (error: any) {
        toast.error("Error deleting asset: " + error.message);
    }
  };

  const copyAssetUrl = (name: string) => {
      const { data } = supabase.storage.from('platform-assets').getPublicUrl(name);
      if (data.publicUrl) {
          navigator.clipboard.writeText(data.publicUrl);
          toast.success("URL copied to clipboard");
      }
  };

  const handleLogout = () => {
    navigate("/");
  };

  const handleSort = (key: keyof BusinessData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    let data = [...businesses];

    // Search Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = data.filter(b => 
        b.name.toLowerCase().includes(lowerQuery) || 
        b.country.toLowerCase().includes(lowerQuery) ||
        b.owner_name.toLowerCase().includes(lowerQuery) ||
        b.owner_phone.toLowerCase().includes(lowerQuery)
      );
    }

    // Status Filter
    if (statusFilter !== "all") {
      data = data.filter(b => b.status === statusFilter);
    }

    // Country Filter
    if (countryFilter !== "all") {
      data = data.filter(b => b.country === countryFilter);
    }

    // Sorting
    if (sortConfig) {
      data.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return data;
  }, [businesses, searchQuery, sortConfig, statusFilter, countryFilter]);

  const totalCustomers = processedData.reduce((sum, item) => sum + item.customer_count, 0);
  const totalVolume = processedData.reduce((sum, item) => sum + item.total_volume, 0);

  const formatCurrency = (amount: number, country: string) => {
    let currency = "USD";
    let locale = "en-US";
    if (country === "Kenya") { currency = "KES"; locale = "en-KE"; }
    else if (country === "Nigeria") { currency = "NGN"; locale = "en-NG"; }
    else if (country === "South Africa") { currency = "ZAR"; locale = "en-ZA"; }
    else if (country === "Ghana") { currency = "GHS"; locale = "en-GH"; }
    else if (country === "Rwanda") { currency = "RWF"; locale = "en-RW"; }
    else if (country === "Tanzania") { currency = "TZS"; locale = "en-TZ"; }
    else if (country === "Egypt") { currency = "EGP"; locale = "ar-EG"; }
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency, maximumFractionDigits: 0 }).format(amount);
  };

  // Styles reused from Landing.tsx for consistency
  const bgClass = "bg-[linear-gradient(135deg,#000000_0%,#14213d_60%,#0479A1_100%)]";
  const glassClass = "backdrop-blur-xl bg-slate-950/40 border border-white/10";
  const glassHeaderClass = "backdrop-blur-xl bg-slate-950/60 border-b border-white/10";

  const SortIcon = ({ column }: { column: keyof BusinessData }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUpDown className="ml-2 h-3 w-3 text-indigo-400 rotate-180" /> 
      : <ArrowUpDown className="ml-2 h-3 w-3 text-indigo-400" />;
  };

  // Helper to find asset by slot prefix
  const getAssetForSlot = (slotId: string) => {
    return assets.find(a => a.name.startsWith(slotId));
  };

  return (
    <div className={`min-h-screen ${bgClass} text-slate-50 font-sans`}>
      {/* Top Bar */}
      <header className={`${glassHeaderClass} sticky top-0 z-30`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
                <Building2 className="w-5 h-5 text-indigo-400" />
             </div>
             <h1 className="text-xl font-bold text-white tracking-tight">
               Super Admin Dashboard
             </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Logged in as <span className="font-semibold text-slate-200">Admin</span></span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-slate-300 hover:text-white hover:bg-white/10">
              <LogOut className="w-4 h-4" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <Tabs defaultValue="overview" className="space-y-6">
            <div className="flex items-center justify-between">
                <TabsList className="bg-slate-950/40 border border-white/10">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Overview</TabsTrigger>
                    <TabsTrigger value="assets" onClick={fetchAssets} className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Platform Assets</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-8">
                {/* Controls */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 text-white">Platform Overview</h2>
                    <p className="text-slate-400">Monitor business performance and growth metrics</p>
                  </div>
                  
                  <div className={`flex items-center gap-2 ${glassClass} p-1 rounded-lg`}>
                     <Button 
                       variant={timeFilter === "24h" ? "secondary" : "ghost"} 
                       size="sm" 
                       onClick={() => setTimeFilter("24h")}
                       className={`text-xs ${timeFilter === "24h" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                     >
                       Last 24h
                     </Button>
                     <Button 
                       variant={timeFilter === "7d" ? "secondary" : "ghost"} 
                       size="sm" 
                       onClick={() => setTimeFilter("7d")}
                       className={`text-xs ${timeFilter === "7d" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                     >
                       Last 7 Days
                     </Button>
                     <Button 
                       variant={timeFilter === "30d" ? "secondary" : "ghost"} 
                       size="sm" 
                       onClick={() => setTimeFilter("30d")}
                       className={`text-xs ${timeFilter === "30d" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                     >
                       Last 30 Days
                     </Button>
                     <Button 
                       variant={timeFilter === "all" ? "secondary" : "ghost"} 
                       size="sm" 
                       onClick={() => setTimeFilter("all")}
                       className={`text-xs ${timeFilter === "all" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                     >
                       All Time
                     </Button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className={`${glassClass} border-white/5 shadow-xl`}>
                    <CardContent className="p-4 flex flex-col gap-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Businesses</p>
                      <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold text-white">{metrics.totalBusinesses.toLocaleString()}</h3>
                        <Building2 className="w-5 h-5 text-blue-400 mb-1" />
                      </div>
                      <p className="text-xs text-emerald-400 flex items-center gap-1 mt-2">
                        <ArrowUpRight className="w-3 h-3" /> Real-time
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`${glassClass} border-white/5 shadow-xl`}>
                    <CardContent className="p-4 flex flex-col gap-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Customers</p>
                      <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold text-white">{metrics.totalCustomers.toLocaleString()}</h3>
                        <Users className="w-5 h-5 text-emerald-400 mb-1" />
                      </div>
                      <p className="text-xs text-emerald-400 flex items-center gap-1 mt-2">
                         <ArrowUpRight className="w-3 h-3" /> Real-time
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`${glassClass} border-white/5 shadow-xl`}>
                    <CardContent className="p-4 flex flex-col gap-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Volume</p>
                      <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold text-white">${(metrics.totalVolume / 1000000).toFixed(1)}M</h3>
                        <CreditCard className="w-5 h-5 text-violet-400 mb-1" />
                      </div>
                      <p className="text-xs text-emerald-400 flex items-center gap-1 mt-2">
                         <ArrowUpRight className="w-3 h-3" /> Real-time
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`${glassClass} border-white/5 shadow-xl`}>
                    <CardContent className="p-4 flex flex-col gap-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Subs</p>
                      <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold text-white">{metrics.activeSubscriptions}</h3>
                        <Activity className="w-5 h-5 text-amber-400 mb-1" />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {metrics.totalBusinesses > 0 ? (metrics.activeSubscriptions / metrics.totalBusinesses * 100).toFixed(1) : 0}% conversion
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`${glassClass} border-white/5 shadow-xl`}>
                    <CardContent className="p-4 flex flex-col gap-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Growth Rate</p>
                      <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold text-white">{metrics.growthRate}%</h3>
                        <TrendingUp className="w-5 h-5 text-rose-400 mb-1" />
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                        Needs history
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search businesses..."
                      className="pl-9 bg-slate-950/30 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="gap-2 bg-slate-950/30 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
                            <Filter className="w-4 h-4" />
                            Filters
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-slate-900 border-white/10 text-white">
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Filter Businesses</h4>
                              <p className="text-sm text-slate-400">Apply filters to refine the list</p>
                            </div>
                            <div className="grid gap-2">
                              <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="status">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                  <SelectTrigger className="col-span-2 h-8">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="trial">Trial</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="country">Country</Label>
                                <Select value={countryFilter} onValueChange={setCountryFilter}>
                                  <SelectTrigger className="col-span-2 h-8">
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Countries</SelectItem>
                                    {COUNTRIES.map((c) => (
                                      <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                     </Popover>
                  
                     <Button variant="outline" className="gap-2 bg-slate-950/30 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
                       <Download className="w-4 h-4" />
                       Export Data
                     </Button>
                  </div>
                </div>

                {/* Data Table */}
                <div className={`${glassClass} rounded-lg overflow-hidden`}>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead 
                          className="text-slate-400 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center">
                            Business Name
                            <SortIcon column="name" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-slate-400 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort('owner_name')}
                        >
                          <div className="flex items-center">
                            Owner
                            <SortIcon column="owner_name" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-slate-400 cursor-pointer hover:text-white transition-colors"
                        >
                          <div className="flex items-center">
                            Phone
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-slate-400 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort('country')}
                        >
                          <div className="flex items-center">
                            Country
                            <SortIcon column="country" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right text-slate-400 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort('customer_count')}
                        >
                          <div className="flex items-center justify-end">
                            Customers
                            <SortIcon column="customer_count" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right text-slate-400 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort('total_volume')}
                        >
                          <div className="flex items-center justify-end">
                            Total Volume
                            <SortIcon column="total_volume" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-slate-400 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort('status')}
                        >
                           <div className="flex items-center">
                            Status
                            <SortIcon column="status" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right text-slate-400 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort('created_at')}
                        >
                           <div className="flex items-center justify-end">
                            Registered
                            <SortIcon column="created_at" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow className="border-white/10 hover:bg-white/5">
                          <TableCell colSpan={8} className="h-24 text-center text-slate-400">Loading data...</TableCell>
                        </TableRow>
                      ) : processedData.length === 0 ? (
                        <TableRow className="border-white/10 hover:bg-white/5">
                          <TableCell colSpan={8} className="h-24 text-center text-slate-400">No businesses found</TableCell>
                        </TableRow>
                      ) : (
                        processedData.map((biz) => (
                          <TableRow key={biz.id} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="font-medium text-white">
                              <div className="flex flex-col">
                                <span>{biz.name}</span>
                                <span className="text-xs text-slate-500">{biz.id}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">{biz.owner_name}</TableCell>
                            <TableCell className="text-slate-300 text-sm font-mono">
                                <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-slate-500" />
                                    {biz.owner_phone}
                                </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-slate-300">
                                <Globe className="w-3 h-3 text-slate-500" />
                                {biz.country}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-slate-300">{biz.customer_count.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-indigo-300">
                              {formatCurrency(biz.total_volume, biz.country)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={
                                  biz.status === "active" 
                                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20" 
                                    : biz.status === "trial"
                                    ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                }
                              >
                                {biz.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-slate-500">
                              {new Date(biz.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="border-white/10 bg-slate-900/80 font-bold hover:bg-slate-900/90">
                        <TableCell colSpan={4} className="text-right text-white text-[#ffffff]">Totals</TableCell>
                        <TableCell className="text-right text-white">{totalCustomers.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-white">
                           {/* Displaying raw sum here for simplicity, or we could show a mixed currency note */}
                           {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalVolume)}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
            </TabsContent>

            <TabsContent value="assets" className="space-y-8">


                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 text-white">Platform Assets</h2>
                    <p className="text-slate-400">Manage public images and branding files</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                     <Button 
                       variant="outline" 
                       onClick={() => setShowRLSDialog(true)}
                       className="bg-indigo-500/10 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300"
                     >
                       Config Storage
                     </Button>
                     <Button 
                       variant="outline" 
                       onClick={fetchAssets}
                       className="bg-slate-950/30 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                     >
                       Refresh Assets
                     </Button>
                  </div>
                </div>

                {/* Branding Slots */}
                <div className="grid gap-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Palette className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-lg font-semibold text-white">System Branding</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                        {BRANDING_SLOTS.map((slot) => {
                            const asset = getAssetForSlot(slot.id);
                            const SlotIcon = slot.icon;
                            
                            return (
                                <Card key={slot.id} className={`${glassClass} border-white/5 relative group overflow-hidden`}>
                                    <CardContent className="p-4 flex flex-col gap-3 h-full">
                                        <div className="flex items-start justify-between">
                                            <div className="p-2 rounded-lg bg-indigo-500/10">
                                                <SlotIcon className="w-4 h-4 text-indigo-400" />
                                            </div>
                                            {asset && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-0">Active</Badge>}
                                        </div>
                                        
                                        <div>
                                            <h4 className="font-medium text-white text-sm">{slot.label}</h4>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2" title={slot.description}>{slot.description}</p>
                                        </div>
                                        
                                        <div className={`mt-auto rounded-lg overflow-hidden border border-white/5 aspect-video flex items-center justify-center relative ${slot.previewClass}`}>
                                            {asset ? (
                                                <img 
                                                    src={supabase.storage.from('platform-assets').getPublicUrl(asset.name).data.publicUrl + `?t=${Date.now()}`} // Bust cache
                                                    alt={slot.label}
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">No image set</span>
                                            )}
                                            
                                            {/* Hover Upload Overlay */}
                                            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                                                <Upload className="w-6 h-6 text-white mb-2" />
                                                <span className="text-xs text-white font-medium">Click to Upload</span>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={(e) => handleUpload(e, slot.id)}
                                                    disabled={slotUploading === slot.id}
                                                />
                                            </label>
                                            
                                            {slotUploading === slot.id && (
                                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* General Assets */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileIcon className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-lg font-semibold text-white">General Gallery</h3>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <input 
                                    type="file" 
                                    id="general-upload" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => handleUpload(e)}
                                    disabled={uploading}
                                />
                                <label htmlFor="general-upload">
                                    <Button 
                                        variant="secondary" 
                                        disabled={uploading} 
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 cursor-pointer pointer-events-none h-8 text-xs"
                                        asChild
                                    >
                                        <span className="pointer-events-auto flex items-center gap-2">
                                            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                            Upload New File
                                        </span>
                                    </Button>
                                </label>
                            </div>
                            <Button
                                variant="outline"
                                className="h-8 text-xs bg-slate-800 text-slate-300 border-white/10 hover:bg-white/10"
                                onClick={() => setShowRLSDialog(true)}
                            >
                                <span className="flex items-center gap-2">
                                    Config Storage
                                </span>
                            </Button>
                        </div>
                    </div>
                
                    {loadingAssets ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : assets.length === 0 ? (
                        <Card className={`${glassClass} border-white/5 border-dashed`}>
                            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                 <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                    <ImageIcon className="w-8 h-8 text-slate-500" />
                                 </div>
                                 <h3 className="text-lg font-medium text-white mb-2">No assets found</h3>
                                 <p className="text-slate-400 max-w-sm">
                                     Upload images to the <code>platform-assets</code> bucket to see them here.
                                 </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {assets.map((asset) => {
                                const publicUrl = supabase.storage.from('platform-assets').getPublicUrl(asset.name).data.publicUrl;
                                const isImage = asset.metadata?.mimetype?.startsWith('image/') || asset.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
                                
                                return (
                                    <div key={asset.id} className="group relative rounded-lg overflow-hidden bg-slate-900 border border-white/10 hover:border-indigo-500/50 transition-all">
                                        <div className="aspect-square bg-slate-950 flex items-center justify-center relative">
                                            {isImage ? (
                                                <img 
                                                    src={publicUrl} 
                                                    alt={asset.name} 
                                                    className="w-full h-full object-cover" 
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <FileIcon className="w-12 h-12 text-slate-600" />
                                            )}
                                            
                                            {/* Overlay Actions */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button 
                                                    size="icon" 
                                                    variant="secondary" 
                                                    className="h-8 w-8 rounded-full bg-white text-slate-900 hover:bg-slate-200"
                                                    onClick={() => copyAssetUrl(asset.name)}
                                                    title="Copy URL"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    size="icon" 
                                                    variant="destructive" 
                                                    className="h-8 w-8 rounded-full"
                                                    onClick={() => handleDeleteAsset(asset.name)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-2 bg-slate-900/90 border-t border-white/5">
                                            <p className="text-xs font-medium text-slate-300 truncate" title={asset.name}>{asset.name}</p>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[10px] text-slate-500">{(asset.metadata?.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </TabsContent>
        </Tabs>

        <Dialog open={showRLSDialog} onOpenChange={setShowRLSDialog}>
          <DialogContent className="sm:max-w-2xl bg-slate-900 text-white border-white/10">
            <DialogHeader>
              <DialogTitle>Storage Setup Required</DialogTitle>
              <DialogDescription className="text-slate-400">
                Your Supabase Storage bucket exists, but it's missing access policies (RLS). 
                Run this SQL script in your Supabase Dashboard &gt; SQL Editor to fix it.
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-slate-950 p-4 rounded-md border border-white/10 overflow-x-auto my-4 max-h-[300px]">
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
{`-- 1. Create the bucket (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

-- 3. Allow PUBLIC read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'platform-assets' );

-- 4. Allow PUBLIC uploads (Simplifies permissions for this dashboard)
CREATE POLICY "Public Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'platform-assets' );

-- 5. Allow PUBLIC update/delete
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'platform-assets' );

CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'platform-assets' );`}
              </pre>
            </div>

            <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-4">
              <div className="text-xs text-slate-500 self-center">
                Copy this and run it in the Supabase SQL Editor.
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(`-- 1. Create the bucket (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

-- 3. Allow PUBLIC read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'platform-assets' );

-- 4. Allow PUBLIC uploads (Simplifies permissions for this dashboard)
CREATE POLICY "Public Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'platform-assets' );

-- 5. Allow PUBLIC update/delete
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'platform-assets' );

CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'platform-assets' );`);
                    toast.success("SQL copied to clipboard");
                  }}
                  className="border-white/10 text-slate-300 hover:text-white"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy SQL
                </Button>
                <DialogClose asChild>
                  <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Close
                  </Button>
                </DialogClose>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
