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
  Palette,
  DollarSign,
  Layers,
  Crown,
  CheckCircle,
  AlertCircle,
  Save,
  Calendar,
  KeyRound
} from "lucide-react";
import { NumericInput } from "../components/ui/NumericInput";
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
import { calculateSubscriptionStatus, getBadgeClassName, SubscriptionStatus } from "../utils/subscriptionStatus";

interface BusinessData {
  id: string;
  name: string;
  owner_name: string;
  owner_phone: string;
  country: string;
  created_at: string;
  sales_count: number;
  total_volume: number;
  last_active: string | null;
  status: "active" | "trial" | "expired" | "trial_extended" | "past_due" | "suspended" | "cancelled";
  trial_ends_at: string | null;
  subscription_plan: string | null;
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
    id: "platform-logo-footer",
    label: "Footer Logo",
    description: "Used in website footers and bottom sections. Recommended: PNG, 200x50px.",
    icon: Layers,
    previewClass: "bg-slate-800"
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

// Helper function to format time ago in short format
function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1D';
  if (diffDays < 30) return `${diffDays}D`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1M' : `${months}M`;
  }
  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1Y' : `${years}Y`;
}

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

  // Dashboard metric pop-up state
  const [selectedMetricCard, setSelectedMetricCard] = useState<string | null>(null);
  const [isMetricDialogOpen, setIsMetricDialogOpen] = useState(false);

  const metricDetails: Record<string, { description: string; insights: string; nextSteps: string }> = {
    'Total Businesses': {
      description: 'All businesses currently active in your platform marketplace, including trial and subscribed accounts.',
      insights: 'Strong growth in this metric indicates successful acquisition and onboarding of new business customers.',
      nextSteps: 'Check the businesses page for activation funnel and retention details.'
    },
    'Total Sales': {
      description: 'Total completed sales transactions across your merchant network in the chosen time filter.',
      insights: 'Rapid increases in sales volume typically correspond to high adoption and transaction efficiency.',
      nextSteps: 'Analyze location-wise and product-wise sales in the Reports section.'
    },
    'Total Volume': {
      description: 'Total gross sales volume represents the actual revenue processed through your merchants.',
      insights: 'High volume with stable growth suggests strong market confidence and pricing alignment.',
      nextSteps: 'Review average order value and repeat customer cohorts in analytics.'
    },
    'Active Subs': {
      description: 'Active subscription count for premium or paid packages on the platform.',
      insights: 'Higher conversion rate means customers find value in premium features.',
      nextSteps: 'Investigate churn drivers or upsell opportunities for low-conversion segments.'
    },
    'Growth Rate': {
      description: 'Percentage growth across the selected metric baseline (period to period).',
      insights: 'Consistent growth rate is a leading indicator for scaling and business sustainability.',
      nextSteps: 'Drill into top-performing regions and campaigns as the source of growth.'
    }
  };

  // Pricing State - Load from Supabase or localStorage
  const [pricingData, setPricingData] = useState<Record<string, any>>({});
  const [loadingPricing, setLoadingPricing] = useState(true);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        // Try to load from Supabase first
        const { data, error } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'subscription_pricing')
          .single();

        if (data && data.value) {
          setPricingData(JSON.parse(data.value));
        } else {
          // Fall back to localStorage
          const saved = localStorage.getItem('tillsup-pricing-data');
          if (saved) {
            setPricingData(JSON.parse(saved));
          } else {
            // Use default values
            setPricingData({
              KE: {
                basic_monthly: 999,
                basic_quarterly: 2697,
                basic_annual: 9588,
                professional_monthly: 2499,
                professional_quarterly: 6747,
                professional_annual: 23988,
                ultra_monthly: 4999,
                ultra_quarterly: 13497,
                ultra_annual: 47988,
                quarterly_discount: 10,
                annual_discount: 20
              },
              GH: {
                basic_monthly: 150,
                basic_quarterly: 405,
                basic_annual: 1440,
                professional_monthly: 350,
                professional_quarterly: 945,
                professional_annual: 3360,
                ultra_monthly: 700,
                ultra_quarterly: 1890,
                ultra_annual: 6720,
                quarterly_discount: 10,
                annual_discount: 20
              },
              ET: {
                basic_monthly: 500,
                basic_quarterly: 1350,
                basic_annual: 4800,
                professional_monthly: 1200,
                professional_quarterly: 3240,
                professional_annual: 11520,
                ultra_monthly: 2500,
                ultra_quarterly: 6750,
                ultra_annual: 24000,
                quarterly_discount: 10,
                annual_discount: 20
              },
            });
          }
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
        // Use default values on error
        setPricingData({
          KE: {
            basic_monthly: 999,
            basic_quarterly: 2697,
            basic_annual: 9588,
            professional_monthly: 2499,
            professional_quarterly: 6747,
            professional_annual: 23988,
            ultra_monthly: 4999,
            ultra_quarterly: 13497,
            ultra_annual: 47988,
            quarterly_discount: 10,
            annual_discount: 20
          },
          GH: {
            basic_monthly: 150,
            basic_quarterly: 405,
            basic_annual: 1440,
            professional_monthly: 350,
            professional_quarterly: 945,
            professional_annual: 3360,
            ultra_monthly: 700,
            ultra_quarterly: 1890,
            ultra_annual: 6720,
            quarterly_discount: 10,
            annual_discount: 20
          },
          ET: {
            basic_monthly: 500,
            basic_quarterly: 1350,
            basic_annual: 4800,
            professional_monthly: 1200,
            professional_quarterly: 3240,
            professional_annual: 11520,
            ultra_monthly: 2500,
            ultra_quarterly: 6750,
            ultra_annual: 24000,
            quarterly_discount: 10,
            annual_discount: 20
          },
        });
      } finally {
        setLoadingPricing(false);
      }
    };

    loadPricing();
  }, []);
  const [selectedPricingCountry, setSelectedPricingCountry] = useState('KE');
  const [savingPricing, setSavingPricing] = useState(false);

  // Extend Subscription Modal State
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessData | null>(null);
  const [extendDays, setExtendDays] = useState('');
  const [extendingSubscription, setExtendingSubscription] = useState(false);

  // Reset Password Modal State
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated. Please log in to the admin panel.");
        navigate('/admin-login');
        setLoading(false);
        return;
      }

      console.log('Admin Dashboard - Authenticated as:', session.user.email);

      // 1. Fetch Businesses
      const { data: businessesData, error: bizError } = await supabase
        .from('businesses')
        .select(`
          id, 
          name, 
          owner_id,
          country, 
          created_at, 
          subscription_status,
          trial_ends_at,
          subscription_plan
        `);

      if (bizError) {
        console.error('Admin Dashboard - Error fetching businesses:', bizError);
        if (bizError.message.includes('permission denied') || bizError.code === 'PGRST301') {
          toast.error(
            'Access denied. Please run the RLS policy SQL from ADMIN_RLS_SETUP.md',
            { duration: 10000 }
          );
        }
        throw bizError;
      }

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

      // DEBUG: Log businesses data
      console.log('Admin Dashboard - Businesses fetched:', businessesData);

      // 2. Fetch Profiles (Owner Names & Phones) manually
      const ownerIds = businessesData.map(b => b.owner_id).filter(Boolean);
      let profilesMap: Record<string, { name: string; phone: string }> = {};

      console.log('Admin Dashboard - Owner IDs to fetch:', ownerIds);

      if (ownerIds.length > 0) {
        // Try to fetch all profiles without RLS restrictions
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ownerIds);

        console.log('Admin Dashboard - Profiles fetched:', profilesData);
        if (profileError) {
          console.error('Admin Dashboard - Profile error:', profileError);
          toast.error('Failed to fetch owner profiles: ' + profileError.message);
        }

        if (profilesData && profilesData.length > 0) {
          profilesData.forEach((p: any) => {
            const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            const phone = p.phone_number || p.phone || p.mobile || '';

            profilesMap[p.id] = {
              name: fullName || p.email || 'Unknown',
              phone: phone || 'Not provided'
            };

            console.log(`Profile mapped for ${p.id}:`, {
              first_name: p.first_name,
              last_name: p.last_name,
              phone_number: p.phone_number,
              email: p.email,
              final_name: profilesMap[p.id].name,
              final_phone: profilesMap[p.id].phone
            });
          });
          console.log('Admin Dashboard - Final profiles map:', profilesMap);
        } else {
          console.warn('Admin Dashboard - No profiles found for owner IDs:', ownerIds);
        }
      }

      // 3. Fetch Real Metrics
      let salesCounts: Record<string, number> = {};
      let volumeCounts: Record<string, number> = {};
      let lastActiveDates: Record<string, string> = {};

      // Count sales transactions and get last activity from sales table
      try {
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('business_id, total, created_at');

        if (salesError) {
          console.warn("Error fetching sales data:", salesError);
        }

        if (salesData) {
          console.log(`Admin Dashboard: Found ${salesData.length} total sales across all businesses`);

          salesData.forEach((s: any) => {
            if (s.business_id) {
              // Count total sales transactions
              salesCounts[s.business_id] = (salesCounts[s.business_id] || 0) + 1;

              // Sum total volume
              volumeCounts[s.business_id] = (volumeCounts[s.business_id] || 0) + (Number(s.total) || 0);

              // Track most recent sale date
              if (s.created_at) {
                if (!lastActiveDates[s.business_id] || s.created_at > lastActiveDates[s.business_id]) {
                  lastActiveDates[s.business_id] = s.created_at;
                }
              }
            }
          });

          console.log(`Admin Dashboard: Sales counts per business:`, salesCounts);
          console.log(`Admin Dashboard: Last active dates:`, lastActiveDates);
        }
      } catch (e) {
        console.warn("Failed to fetch sales for stats", e);
      }

      // 4. Map Data - use unified status calculation
      const mappedBusinesses: BusinessData[] = businessesData.map((b: any) => {
        // Use unified status calculation
        const statusResult = calculateSubscriptionStatus({
          subscription_status: b.subscription_status,
          trial_ends_at: b.trial_ends_at,
          subscription_end_date: b.subscription_end_date
        });

        const mapped = {
          id: b.id,
          name: b.name || "Unnamed Business",
          owner_name: profilesMap[b.owner_id]?.name || "Unknown",
          owner_phone: profilesMap[b.owner_id]?.phone || "Not provided",
          country: b.country || "Global",
          created_at: b.created_at,
          sales_count: salesCounts[b.id] || 0,
          total_volume: volumeCounts[b.id] || 0,
          last_active: lastActiveDates[b.id] || null,
          status: statusResult.status as any,
          trial_ends_at: b.trial_ends_at,
          subscription_plan: b.subscription_plan
        };
        console.log(`Admin Dashboard - Mapped business ${b.name}:`, {
          db_status: b.subscription_status,
          calculated_status: statusResult.status,
          days_remaining: statusResult.daysRemaining
        });
        return mapped;
      });

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
      const totalSales = filteredData.reduce((sum, b) => sum + b.sales_count, 0);
      const totalVol = filteredData.reduce((sum, b) => sum + b.total_volume, 0);

      setMetrics({
        totalBusinesses: totalBiz,
        totalCustomers: totalSales, // This will be used to show total sales in the UI
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

      console.log('Uploading file to platform-assets bucket:', fileName);
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);

      // Upload without timeout - let it take as long as needed
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
      } else if (error.message && error.message.includes("timeout")) {
        toast.error("Upload Timeout", {
          description: "Upload took too long. Check your internet connection and try again with a smaller file."
        });
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
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        // Handle null values (put them at the end)
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return data;
  }, [businesses, searchQuery, sortConfig, statusFilter, countryFilter]);

  const totalSales = processedData.reduce((sum, item) => sum + (item.sales_count || 0), 0);
  const totalVolume = processedData.reduce((sum, item) => sum + (item.total_volume || 0), 0);

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
  const bgClass = "bg-[#14213d]";
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

  // Export business data to CSV
  const handleExportData = () => {
    try {
      // Create CSV headers
      const headers = ['Business Name', 'Owner', 'Phone', 'Country', 'Status', 'Subscription Plan', 'Total Volume', 'Sales Count', 'Registered', 'Last Active', 'Expiry Date'];

      // Create CSV rows using processedData (which includes all current filters)
      const rows = processedData.map(biz => [
        biz.name,
        biz.owner_name,
        biz.owner_phone,
        biz.country,
        biz.status,
        biz.subscription_plan || 'N/A',
        biz.total_volume,
        biz.sales_count,
        new Date(biz.created_at).toLocaleDateString(),
        biz.last_active ? formatTimeAgo(biz.last_active) : 'Never',
        biz.trial_ends_at ? new Date(biz.trial_ends_at).toLocaleDateString() : 'N/A'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `businesses_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(url);

      toast.success(`Exported ${processedData.length} businesses to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  // Reset password for business owner
  const handleResetPassword = async () => {
    if (!selectedBusiness) return;

    setResettingPassword(true);
    try {
      // Generate a 4-digit numeric temporary password
      const tempPassword = String(Math.floor(1000 + Math.random() * 9000));

      // Find the owner's profile ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('business_id', selectedBusiness.id)
        .eq('role', 'Business Owner')
        .single();

      if (profileError || !profileData) {
        throw new Error('Could not find business owner profile');
      }

      // Update the password using Supabase Admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        profileData.id,
        { password: tempPassword }
      );

      if (updateError) {
        throw updateError;
      }

      // Mark profile as must_change_password
      await supabase
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', profileData.id);

      setTemporaryPassword(tempPassword);
      toast.success('Password reset successfully!');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password: ' + error.message);
    } finally {
      setResettingPassword(false);
    }
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
              <TabsTrigger value="pricing" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Pricing Management</TabsTrigger>
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
              {[
                { id: 'Total Businesses', title: 'Total Businesses', value: metrics.totalBusinesses.toLocaleString(), icon: <Building2 className="w-5 h-5 text-blue-400 mb-1" />, detail: 'Total active businesses on the platform and recent activation trends.' },
                { id: 'Total Sales', title: 'Total Sales', value: metrics.totalCustomers.toLocaleString(), icon: <Activity className="w-5 h-5 text-emerald-400 mb-1" />, detail: 'Aggregate number of sales transactions processed this period.' },
                { id: 'Total Volume', title: 'Total Volume', value: `$${(metrics.totalVolume / 1000000).toFixed(1)}M`, icon: <CreditCard className="w-5 h-5 text-violet-400 mb-1" />, detail: 'Gross sales volume indicating business scale and revenue velocity.' },
                { id: 'Active Subs', title: 'Active Subs', value: metrics.activeSubscriptions, icon: <Activity className="w-5 h-5 text-amber-400 mb-1" />, detail: 'Number of active subscriptions currently running; conversion from total businesses.' },
                { id: 'Growth Rate', title: 'Growth Rate', value: `${metrics.growthRate}%`, icon: <TrendingUp className="w-5 h-5 text-rose-400 mb-1" />, detail: 'Growth rate measured using recent period vs previous period.', },
              ].map(card => (
                <button
                  key={card.id}
                  type="button"
                  className="w-full text-left"
                  aria-label={`Open details for ${card.title}`}
                  onClick={() => {
                    setSelectedMetricCard(card.id);
                    setIsMetricDialogOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedMetricCard(card.id);
                      setIsMetricDialogOpen(true);
                    }
                  }}
                >
                  <Card className={`${glassClass} border-white/5 shadow-xl hover:shadow-2xl transition-shadow duration-200 cursor-pointer`}>
                    <CardContent className="p-4 flex flex-col gap-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.title}</p>
                      <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-bold text-white">{card.value}</h3>
                        {card.icon}
                      </div>
                      <p className="text-xs text-emerald-400 flex items-center gap-1 mt-2">
                        <ArrowUpRight className="w-3 h-3" /> Real-time
                      </p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search businesses..."
                  className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
                      <Filter className="w-4 h-4" />
                      Filters
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-white border-gray-200 text-gray-900 shadow-lg">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Filter Businesses</h4>
                        <p className="text-sm text-gray-500">Apply filters to refine the list</p>
                      </div>
                      <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Label htmlFor="status" className="text-gray-700">Status</Label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="col-span-2 h-8 bg-white border-gray-300 text-gray-900">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="trial">Trial</SelectItem>
                              <SelectItem value="trial_expired">Trial Expired</SelectItem>
                              <SelectItem value="trial_extended">Trial Extended</SelectItem>
                              <SelectItem value="past_due">Past Due</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Label htmlFor="country" className="text-gray-700">Country</Label>
                          <Select value={countryFilter} onValueChange={setCountryFilter}>
                            <SelectTrigger className="col-span-2 h-8 bg-white border-gray-300 text-gray-900">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
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

                <Button
                  variant="outline"
                  className="gap-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={handleExportData}
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </Button>
              </div>
            </div>

            {/* Data Table */}
            <div className={`${glassClass} rounded-lg overflow-hidden`}>
              <div className="max-h-[600px] overflow-y-auto">
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
                        onClick={() => handleSort('total_volume')}
                      >
                        <div className="flex items-center justify-end">
                          Total Volume
                          <SortIcon column="total_volume" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right text-slate-400 cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleSort('sales_count')}
                      >
                        <div className="flex items-center justify-end">
                          Sales done
                          <SortIcon column="sales_count" />
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
                      <TableHead
                        className="text-right text-slate-400 cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleSort('last_active')}
                      >
                        <div className="flex items-center justify-end">
                          Last active
                          <SortIcon column="last_active" />
                        </div>
                      </TableHead>
                      <TableHead className="text-slate-400 w-32">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell colSpan={9} className="h-24 text-center text-slate-400">Loading data...</TableCell>
                      </TableRow>
                    ) : processedData.length === 0 ? (
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell colSpan={9} className="h-24 text-center text-slate-400">No businesses found</TableCell>
                      </TableRow>
                    ) : (
                      processedData.map((biz) => (
                        <TableRow key={biz.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="font-medium text-white">
                            {biz.name}
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
                          <TableCell className="text-right font-mono text-xs text-indigo-300">
                            {formatCurrency(biz.total_volume, biz.country)}
                          </TableCell>
                          <TableCell className="text-right text-slate-300">{(biz.sales_count || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={getBadgeClassName(biz.status as SubscriptionStatus)}
                            >
                              {biz.status === "trial_extended" ? "Extended"
                                : biz.status === "past_due" ? "Past Due"
                                  : biz.status === "trial_expired" ? "Trial Expired"
                                    : biz.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {new Date(biz.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right text-slate-400">
                            {formatTimeAgo(biz.last_active)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBusiness(biz);
                                  setExtendModalOpen(true);
                                }}
                                className="bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 text-xs"
                              >
                                Extend
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBusiness(biz);
                                  setResetPasswordModalOpen(true);
                                }}
                                className="bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs"
                              >
                                <KeyRound className="w-3 h-3 mr-1" />
                                Reset
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="border-white/10 bg-slate-900/80 font-bold hover:bg-slate-900/90">
                      <TableCell colSpan={4} className="text-right text-white text-[#ffffff]">Totals</TableCell>
                      <TableCell className="text-right text-white">
                        {/* Displaying raw sum here for simplicity, or we could show a mixed currency note */}
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalVolume)}
                      </TableCell>
                      <TableCell className="text-right text-white">{totalSales.toLocaleString()}</TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1 text-white">Pricing Management</h2>
                <p className="text-slate-400">Manage subscription tier pricing for all countries</p>
              </div>
            </div>

            {/* Country Selector */}
            <Card className={`${glassClass} border-white/10`}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  Select Country
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Choose a country to manage its pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedPricingCountry} onValueChange={setSelectedPricingCountry}>
                  <SelectTrigger className="bg-slate-950/30 border-white/10 text-white w-64">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="KE" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white cursor-pointer">Kenya (KES)</SelectItem>
                    <SelectItem value="GH" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white cursor-pointer">Ghana (GH¢)</SelectItem>
                    <SelectItem value="ET" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white cursor-pointer">Ethiopia (ETB)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Three-Card Pricing Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-center">
              {/* Helper to format currency */}
              {(() => {
                const symbol = selectedPricingCountry === 'KE' ? 'KES' : selectedPricingCountry === 'GH' ? 'GH¢' : 'ETB';
                const countryData = pricingData[selectedPricingCountry] || {};
                const qDiscount = (countryData.quarterly_discount || 10) / 100;
                const aDiscount = (countryData.annual_discount || 20) / 100;

                const tiers = [
                  {
                    key: 'basic',
                    name: 'Starter',
                    iconColor: 'text-blue-400',
                    borderColor: 'border-white/5',
                    badge: null,
                    features: ['2 Branch Locations', 'Up to 10 Staff Members', 'Basic POS & Inventory', 'Basic Reports'],
                  },
                  {
                    key: 'professional',
                    name: 'Pro',
                    iconColor: 'text-indigo-400',
                    borderColor: 'border-indigo-500/30',
                    badge: 'Most Popular',
                    features: ['5 Branch Locations', 'Up to 25 Staff Members', 'Advanced Reports & Analytics', 'Expense Management', 'Priority Support'],
                  },
                  {
                    key: 'ultra',
                    name: 'Enterprise',
                    iconColor: 'text-purple-400',
                    borderColor: 'border-white/5',
                    badge: null,
                    features: ['Unlimited Branches', 'Unlimited Staff', 'AI-Powered Forecasting', 'API Access', 'Dedicated Account Manager'],
                  },
                ];

                return tiers.map((tier) => {
                  const monthly = countryData[`${tier.key}_monthly`] || 0;
                  const quarterly = Math.round(monthly * 3 * (1 - qDiscount));
                  const annual = Math.round(monthly * 12 * (1 - aDiscount));

                  const updateMonthly = (val: number | null) => {
                    const m = val ?? 0;
                    setPricingData({
                      ...pricingData,
                      [selectedPricingCountry]: {
                        ...countryData,
                        [`${tier.key}_monthly`]: m,
                        [`${tier.key}_quarterly`]: Math.round(m * 3 * (1 - qDiscount)),
                        [`${tier.key}_annual`]: Math.round(m * 12 * (1 - aDiscount)),
                      }
                    });
                  };

                  return (
                    <Card key={tier.key} className={`flex flex-col relative bg-slate-900/50 backdrop-blur ${tier.borderColor} border shadow-xl hover:shadow-2xl transition-shadow duration-200`}>
                      {tier.badge && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <Badge className="bg-indigo-600 text-white h-5 text-[10px] px-2 shadow-sm">{tier.badge}</Badge>
                        </div>
                      )}
                      <CardHeader className="p-4 pb-3 text-center">
                        <CardTitle className="text-base font-bold text-white flex items-center justify-center gap-2">
                          <Crown className={`w-4 h-4 ${tier.iconColor}`} />
                          {tier.name}
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs">
                          {tier.key === 'basic' ? 'Up to 2 branches, basic features' : tier.key === 'professional' ? 'Up to 5 branches, advanced features' : 'Unlimited branches, enterprise features'}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                        <div className="space-y-3 mb-4">
                          {/* Monthly - Editable */}
                          <div>
                            <Label className="text-slate-300 text-xs">Monthly Price</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm z-10">{symbol}</span>
                              <NumericInput
                                value={monthly}
                                onChange={updateMonthly}
                                allowEmpty={true}
                                className="bg-slate-950/30 border-white/10 text-white pl-16"
                              />
                            </div>
                          </div>

                          {/* Quarterly - Auto-calculated, read-only */}
                          <div>
                            <Label className="text-slate-300 text-xs">Quarterly Price (auto)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm z-10">{symbol}</span>
                              <input
                                type="text"
                                value={monthly > 0 ? quarterly.toLocaleString() : '—'}
                                readOnly
                                className="w-full h-10 rounded-md border border-white/10 bg-slate-900/50 px-3 py-2 pl-16 text-white/60 cursor-not-allowed"
                              />
                            </div>
                            <p className="text-[10px] text-green-400 mt-0.5">10% off monthly rate</p>
                          </div>

                          {/* Annual - Auto-calculated, read-only */}
                          <div>
                            <Label className="text-slate-300 text-xs">Annual Price (auto)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm z-10">{symbol}</span>
                              <input
                                type="text"
                                value={monthly > 0 ? annual.toLocaleString() : '—'}
                                readOnly
                                className="w-full h-10 rounded-md border border-white/10 bg-slate-900/50 px-3 py-2 pl-16 text-white/60 cursor-not-allowed"
                              />
                            </div>
                            <p className="text-[10px] text-green-400 mt-0.5">20% off monthly rate</p>
                          </div>
                        </div>

                        {/* Feature List */}
                        <div className="space-y-2 flex-1 mb-4">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Key Features:</p>
                          <ul className="space-y-1.5">
                            {tier.features.map((f) => (
                              <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                                <span className="leading-tight">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>

            {/* Discount Settings */}
            <Card className={`${glassClass} border-white/10`}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Discount Settings
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure discount percentages for longer billing cycles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Quarterly Discount (%)</Label>
                    <NumericInput
                      value={pricingData[selectedPricingCountry]?.quarterly_discount || 0}
                      onChange={(val) => {
                        setPricingData({
                          ...pricingData,
                          [selectedPricingCountry]: {
                            ...pricingData[selectedPricingCountry],
                            quarterly_discount: val ?? 0
                          }
                        });
                      }}
                      min={0}
                      max={100}
                      allowEmpty={true}
                      className="bg-slate-950/30 border-white/10 text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">Save X% when customers pay quarterly</p>
                  </div>
                  <div>
                    <Label className="text-slate-300">Annual Discount (%)</Label>
                    <NumericInput
                      value={pricingData[selectedPricingCountry]?.annual_discount || 0}
                      onChange={(val) => {
                        setPricingData({
                          ...pricingData,
                          [selectedPricingCountry]: {
                            ...pricingData[selectedPricingCountry],
                            annual_discount: val ?? 0
                          }
                        });
                      }}
                      min={0}
                      max={100}
                      allowEmpty={true}
                      className="bg-slate-950/30 border-white/10 text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">Save X% when customers pay annually</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  setSavingPricing(true);
                  try {
                    // Save to Supabase platform_settings table
                    const { error } = await supabase
                      .from('platform_settings')
                      .upsert({
                        key: 'subscription_pricing',
                        value: JSON.stringify(pricingData),
                        updated_at: new Date().toISOString()
                      });

                    if (error) {
                      // If table doesn't exist, fall back to localStorage
                      console.warn('Supabase save failed, using localStorage:', error);
                      localStorage.setItem('tillsup-pricing-data', JSON.stringify(pricingData));
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));
                    toast.success('Pricing updated successfully! Changes will reflect on the Subscription & Billing page for all business users.');
                  } catch (error) {
                    console.error('Error saving pricing:', error);
                    toast.error('Failed to save pricing data');
                  } finally {
                    setSavingPricing(false);
                  }
                }}
                disabled={savingPricing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {savingPricing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Pricing Changes
                  </>
                )}
              </Button>
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

        <Dialog open={isMetricDialogOpen} onOpenChange={setIsMetricDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-white text-slate-900 border border-slate-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle>{selectedMetricCard || 'Metric Details'}</DialogTitle>
              <DialogDescription className="text-slate-500">
                Deep-dive insights for the selected dashboard metric.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-slate-700">
                {selectedMetricCard ? metricDetails[selectedMetricCard]?.description : 'Select a card for metric details.'}
              </p>
              <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key Insight</h4>
                <p className="text-sm text-slate-700 mt-1">{selectedMetricCard ? metricDetails[selectedMetricCard]?.insights : '-'}</p>
              </div>
              <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested Next Steps</h4>
                <p className="text-sm text-slate-700 mt-1">{selectedMetricCard ? metricDetails[selectedMetricCard]?.nextSteps : '-'}</p>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button className="w-full" onClick={() => setSelectedMetricCard(null)}>Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

      {/* Reset Password Modal */}
      <Dialog open={resetPasswordModalOpen} onOpenChange={(open) => {
        setResetPasswordModalOpen(open);
        if (!open) {
          setTemporaryPassword(null);
          setSelectedBusiness(null);
        }
      }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Reset password for {selectedBusiness?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!temporaryPassword ? (
              <>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-sm text-amber-200">
                    <strong>Warning:</strong> This will reset the business owner's password to a new 4-digit temporary password.
                    They will be required to change it on their next login.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Business Owner</Label>
                  <p className="text-white font-medium">{selectedBusiness?.owner_name}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Business Name</Label>
                  <p className="text-white font-medium">{selectedBusiness?.name}</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-200">
                    <strong>Success!</strong> Password has been reset. Share this temporary password with the business owner.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Temporary Password</Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-800 px-4 py-3 rounded-lg text-2xl font-mono text-amber-400 tracking-widest border border-amber-500/30">
                      {temporaryPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(temporaryPassword);
                        toast.success("Password copied to clipboard");
                      }}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-blue-200">
                    The business owner will be prompted to change this password on their next login.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-3 pt-2">
            {!temporaryPassword ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResetPasswordModalOpen(false);
                    setSelectedBusiness(null);
                  }}
                  className="bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resettingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setResetPasswordModalOpen(false);
                  setTemporaryPassword(null);
                  setSelectedBusiness(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium w-full"
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Modal */}
      <Dialog open={extendModalOpen} onOpenChange={setExtendModalOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription className="text-slate-400">
              Extend subscription for {selectedBusiness?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Current Status</Label>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={
                    selectedBusiness?.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : selectedBusiness?.status === "trial"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }
                >
                  {selectedBusiness?.status === "expired" ? "Trial Expired" : selectedBusiness?.status}
                </Badge>
                {selectedBusiness?.trial_ends_at && (
                  <span className="text-xs text-slate-400">
                    Expires: {new Date(selectedBusiness.trial_ends_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Days to Extend</Label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={extendDays}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow only digits, or empty string
                  if (val === '' || /^\d+$/.test(val)) {
                    setExtendDays(val);
                  }
                }}
                className="w-full h-10 rounded-md border border-white/20 bg-slate-900/50 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter days"
              />
              <p className="text-xs text-slate-400">
                {extendDays && parseInt(extendDays, 10) > 0
                  ? `New end date: ${new Date(Date.now() + parseInt(extendDays, 10) * 24 * 60 * 60 * 1000).toLocaleDateString()}`
                  : "Enter days to calculate new end date"
                }
              </p>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
              <p className="text-sm text-indigo-200">
                <strong>Note:</strong> The new subscription end date will be calculated from today's date,
                regardless of when the previous subscription expired.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setExtendModalOpen(false);
                setSelectedBusiness(null);
                setExtendDays('');
              }}
              className="bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedBusiness) return;

                const daysNum = parseInt(extendDays, 10);

                // Validate days before submitting
                if (isNaN(daysNum) || daysNum < 1) {
                  toast.error("Please enter a valid number of days (minimum 1)");
                  return;
                }

                setExtendingSubscription(true);
                try {
                  const newEndDate = new Date(Date.now() + daysNum * 24 * 60 * 60 * 1000);
                  const newEndDateISO = newEndDate.toISOString();

                  console.log('Extending subscription:', {
                    businessId: selectedBusiness.id,
                    newEndDate: newEndDateISO,
                    extendDays: daysNum
                  });

                  // Update the business subscription
                  const { data, error } = await supabase
                    .from('businesses')
                    .update({
                      trial_ends_at: newEndDateISO,
                      subscription_end_date: newEndDateISO,
                      subscription_status: 'trial_extended',
                      requires_extension_notice: true
                    })
                    .eq('id', selectedBusiness.id)
                    .select();

                  if (error) {
                    console.error('Supabase update error:', error);
                    throw error;
                  }

                  // Check if update actually modified any rows
                  if (!data || data.length === 0) {
                    console.error('Update returned empty data - likely RLS policy blocking the update');
                    throw new Error('Update blocked by security policy. Please run the Super Admin RLS migration in Supabase SQL Editor.');
                  }

                  console.log('Update successful:', data);

                  // Verify the update by re-fetching this specific business
                  const { data: verifyData, error: verifyError } = await supabase
                    .from('businesses')
                    .select('id, name, subscription_status, subscription_end_date, trial_ends_at, requires_extension_notice')
                    .eq('id', selectedBusiness.id)
                    .single();

                  console.log('Verification after update:', verifyData);
                  if (verifyError) {
                    console.error('Verification error:', verifyError);
                  }

                  // Verify the status was actually updated
                  if (verifyData && verifyData.subscription_status !== 'trial_extended') {
                    console.error('Status was not updated! Current status:', verifyData.subscription_status);
                    throw new Error('Database did not update the status. Current status: ' + verifyData.subscription_status);
                  }

                  toast.success(`Subscription successfully extended to ${newEndDate.toLocaleDateString()}`);
                  setExtendModalOpen(false);
                  setSelectedBusiness(null);
                  setExtendDays('');

                  // Force refresh all data immediately
                  await fetchData();
                } catch (error: any) {
                  console.error('Error extending subscription:', error);
                  toast.error('Failed to extend subscription: ' + error.message);
                } finally {
                  setExtendingSubscription(false);
                }
              }}
              disabled={extendingSubscription || !extendDays || parseInt(extendDays, 10) < 1}
              className="bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {extendingSubscription ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extending...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Extend Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
