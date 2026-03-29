import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase, supabaseUrl, supabaseAnonKey } from "../../lib/supabase";
import { toast } from "sonner";
import { isPreviewMode, mockPreviewUser, mockPreviewBusiness, PreviewModeAuth, mockPreviewStaff } from "../utils/previewMode";
import { resetStaffPasswordWithFallback } from "../utils/passwordReset";
import { Permission } from "../types/permissions";
import { calculateSubscriptionStatus } from "../utils/subscriptionStatus";

// ═══════════════════════════════════════════════════════════════════
// VERSION: 2024-03-05-v6-PREVIEW-MODE-SUPPORT
// NEW: Preview mode for Figma Make with mock data
// PREVIOUS: Skip auth initialization on public routes + silent error handling
// - Preview mode detection and mock data for Figma Make
// - Public routes load instantly without waiting for Supabase
// - 2s emergency timeout for protected routes
// - 4s global fallback timeout
// - No error toasts on network issues for public routes
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// MULTI-TENANT AUTH DATA MODELS
// ══════════════════════════════════════════════════════════════════

export type SubscriptionPlan = "Free Trial" | "Basic" | "Pro" | "Enterprise";
export type SubscriptionStatus = 
  | "active"           // Paid & Current
  | "trial"            // New users
  | "trial_expired"    // Automatic lock
  | "trial_extended"   // Manual admin override
  | "past_due"         // Payment failed, grace period active
  | "suspended"        // Admin-initiated hard lock
  | "cancelled"        // Pending end of cycle
  | "expired";         // Legacy/expired

export interface TaxConfiguration {
  enabled: boolean;
  name: string;
  percentage: number;
  inclusive: boolean;
}

export interface BrandingConfiguration {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  hidePlatformBranding: boolean;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  
  // SaaS Fields
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date;
  subscriptionEndDate?: Date; // New field for subscription end date
  requiresExtensionNotice?: boolean; // Flag for first login after extension
  extensionNotifiedAt?: Date; // When the notice was shown
  maxBranches: number;
  maxStaff: number;
  
  // Business Settings
  currency: string;
  country?: string;
  timezone: string;
  businessType?: string;
  workingHours: {
    start: string;
    end: string;
  };
  
  // Tax Configuration
  taxConfig: TaxConfiguration;
  
  // Branding
  branding: BrandingConfiguration;
  
  // Onboarding
  completedOnboarding: boolean;
}

export type UserRole = 
  | "Business Owner" 
  | "Manager" 
  | "Cashier" 
  | "Accountant" 
  | "Staff";

// ═══════════════════════════════════════════════════════════════════
// SALARY TYPES (HR Layer - Part 1)
// ═══════════════════��═══════════════════════════════════════════════
export type SalaryType = "monthly" | "daily" | "hourly" | "commission" | "mixed";
export type PayFrequency = "monthly" | "weekly" | "biweekly";

export interface StaffSalary {
  salaryType: SalaryType;
  baseSalary: number;
  currency: string;
  payFrequency: PayFrequency;
  effectiveFrom: Date;
  previousSalary?: number;
  lastUpdated?: Date;
  updatedBy?: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  // password: string; // Removed for Supabase Auth
  firstName: string;
  lastName: string;
  role: UserRole;
  roleId: string | null;
  businessId: string;
  branchId: string | null;
  mustChangePassword: boolean;
  createdAt: Date;
  // ═══════��══════════════════════════════════════════════════════════
  // PERMISSION-BASED ACCESS CONTROL - Expense Management
  // ═══════════════════════════════════════════════════════════════════
  canCreateExpense: boolean;
  // ═══════════════════════════════════════════════════════════════════
  // SALARY INFORMATION (HR Layer - Part 1)
  // ══════════════���════════════════════════════════════════════════════
  salary?: StaffSalary;
}

export interface AuthState {
  user: User | null;
  business: Business | null;
  isAuthenticated: boolean;
  loading: boolean;
  schemaError: any | null;
}

interface AuthContextType extends AuthState {
  // Business Management
  registerBusiness: (businessName: string, ownerEmail: string, ownerPassword: string, ownerFirstName: string, ownerLastName: string, ownerPhone: string, country?: string, currency?: string) => Promise<{ success: boolean; error?: string }>;
  updateBusiness: (updates: Partial<Business>) => Promise<{ success: boolean; error?: string }>;
  
  // Authentication
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean; branchDeactivated?: boolean }>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  
  // Profile Management
  updateProfile: (updates: Partial<Pick<User, 'firstName' | 'lastName'>>) => Promise<{ success: boolean; error?: string }>;
  
  // Staff Management
  createStaff: (email: string, firstName: string, lastName: string, role: UserRole, branchId?: string, roleId?: string, password?: string) => Promise<{ success: boolean; error?: string; credentials?: { email: string; password: string }; errorCode?: string }>;
  getStaffMembers: () => Promise<User[]>;
  staffMembers: User[];
  isLoadingStaff: boolean;
  refreshStaffMembers: () => Promise<void>;
  updateStaff: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteStaff: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resendStaffInvite: (inviteId: string) => Promise<{ success: boolean; error?: string }>;
  resetStaffPassword: (userId: string) => Promise<{ success: boolean; error?: string; temporaryPassword?: string }>;
  
  // Utilities
  hasPermission: (requiredRoles: UserRole[], permission?: Permission) => boolean;
}

// Create a default context value to prevent initialization warnings
const defaultAuthContext: AuthContextType = {
  user: null,
  business: null,
  isAuthenticated: false,
  loading: true,
  schemaError: null,
  login: async () => {
    console.error("❌ CRITICAL: Login called on default context! This should never happen.");
    console.error("   This means AuthProvider is not wrapping the component tree properly.");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  logout: async () => {
    console.error("❌ CRITICAL: Logout called on default context!");
  },
  registerBusiness: async () => {
    console.error("❌ CRITICAL: RegisterBusiness called on default context!");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  updateBusiness: async () => {
    console.error("❌ CRITICAL: UpdateBusiness called on default context!");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  changePassword: async () => {
    console.error("❌ CRITICAL: ChangePassword called on default context!");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  updateProfile: async () => {
    console.error("❌ CRITICAL: UpdateProfile called on default context!");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  createStaff: async () => {
    console.error("❌ CRITICAL: CreateStaff called on default context!");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  getStaffMembers: async () => {
    console.error("❌ CRITICAL: GetStaffMembers called on default context!");
    return [];
  },
  updateStaff: async () => {
    console.error("❌ CRITICAL: UpdateStaff called on default context!");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  deleteStaff: async () => {
    console.error("❌ CRITICAL: DeleteStaff called on default context!");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  resendStaffInvite: async () => {
    console.error("❌ CRITICAL: ResendStaffInvite called on default context!");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  resetStaffPassword: async () => {
    console.error("❌ CRITICAL: ResetStaffPassword called on default context!");
    return { success: false, error: "Authentication system not initialized. Please refresh the page." };
  },
  hasPermission: () => {
    console.error("❌ CRITICAL: HasPermission called on default context!");
    return false;
  },
  staffMembers: [],
  isLoadingStaff: false,
  refreshStaffMembers: async () => {
    console.error("❌ CRITICAL: RefreshStaffMembers called on default context!");
  },
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function useAuth() {
  return useContext(AuthContext);
}


// ═══════════════════════════════════════════════════════════════════
// AUTH PROVIDER
// ═══════════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
  console.debug("🚀 AuthProvider initialized - v2.0 (No init warnings)");
  
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<any>(null);
  const isRegistering = useRef(false);
  const isRefreshing = useRef(false); // Prevent concurrent refresh calls

  // Initialize Supabase Auth Listener
  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;
    let globalTimeoutId: NodeJS.Timeout | null = null;
    let emergencyTimeoutId: NodeJS.Timeout | null = null;

    const clearGlobalTimeout = () => {
      if (globalTimeoutId) {
        clearTimeout(globalTimeoutId);
        globalTimeoutId = null;
      }
    };

    // ═══════════════════════════════════════════════════════════════════
    // PREVIEW MODE: Use mock data in Figma Make
    // ═══════════════════════════════════════════════════════════════════
    if (isPreviewMode()) {
      console.log('🎨 Preview Mode Active - Using Mock Data');
      // Set mock user and business immediately
      setUser(mockPreviewUser);
      setBusiness(mockPreviewBusiness);
      setLoading(false);
      // Clear any RLS errors since we're in preview
      sessionStorage.removeItem('rls-recursion-error');
      sessionStorage.removeItem('rls-banner-dismissed');
      return;
    }

    // Check if we're on a public route that doesn't need auth
    const publicRoutes = [
      '/', 
      '/login', 
      '/register', 
      '/recovery', 
      '/who-we-are', 
      '/simple-test', 
      '/test', 
      '/diagnostic', 
      '/public-test',
      '/landing-original', 
      '/landing-simple'
    ];
    const currentPath = window.location.pathname;
    const isPublicRoute = publicRoutes.includes(currentPath);

    if (isPublicRoute) {
      console.debug("🌐 Public route detected, skipping auth initialization");
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      setLoading(true);
      
      // EMERGENCY TIMEOUT: Force stop loading after 2 seconds MAX (reduced from 3s)
      emergencyTimeoutId = setTimeout(() => {
        if (mounted) {
          console.debug("⏱️ Auth initialization timeout (network may be slow or blocked)");
          setLoading(false);
        }
      }, 2000); // 2 seconds emergency timeout
      
      try {
        // CRITICAL FIX: Check session immediately instead of waiting for listener
        console.debug("🚀 Checking initial session...");
        
        let initialSession, sessionError;
        try {
          const result = await supabase.auth.getSession();
          initialSession = result.data?.session;
          sessionError = result.error;
          clearEmergencyTimeout(); // Clear emergency timeout on success
        } catch (getSessionException: any) {
          clearEmergencyTimeout(); // Clear emergency timeout
          
          // Check if it's a network error
          const isNetworkError = getSessionException?.message?.includes("Failed to fetch") || 
                                 getSessionException?.message?.includes("fetch") ||
                                 getSessionException?.name === "TypeError";
          
          if (isNetworkError) {
            console.debug("🌐 Network error during auth initialization - likely offline or blocked");
            // Silently handle network errors on public routes - don't spam user
          } else {
            console.error("🚫 CRITICAL: getSession threw exception:", getSessionException);
            console.error("Exception type:", getSessionException?.constructor?.name);
            // Only show error toast on protected routes
            if (!isPublicRoute) {
              toast.error("Authentication Error", {
                description: "An unexpected error occurred. Please refresh the page.",
                duration: 8000
              });
            }
          }
          
          setLoading(false);
          clearGlobalTimeout();
          return;
        }
        
        if (sessionError) {
          clearEmergencyTimeout(); // Clear emergency timeout
          
          // Check if it's a network error
          const isNetworkError = sessionError.message?.includes("Failed to fetch") || 
                                 sessionError.message?.includes("NetworkError") ||
                                 sessionError.message?.includes("fetch");
          
          if (isNetworkError) {
            // Silently handle network errors - don't spam console or user
            console.debug("Network error during session check - continuing without auth");
          } else {
            // Only log non-network errors
            console.error("❌ Session check error:", sessionError);
          }
          
          setLoading(false);
          clearGlobalTimeout();
          return;
        }

        if (initialSession?.user) {
          console.debug("✅ Initial session found, loading profile...");
          clearEmergencyTimeout(); // Clear emergency timeout
          
          // Load profile without timeout - let it complete naturally
          try {
            await refreshUserProfile(initialSession.user);
            clearGlobalTimeout();
          } catch (err: any) {
            console.warn("⚠️ Profile refresh failed, using fallback user...");
            // Create fallback user to prevent blocking
            if (initialSession.user) {
              const metadata = initialSession.user.user_metadata || {};
              const fallbackUser: User = {
                id: initialSession.user.id,
                email: initialSession.user.email || "",
                firstName: metadata.first_name || "User",
                lastName: metadata.last_name || "",
                role: (metadata.role as UserRole) || "Business Owner",
                roleId: null,
                businessId: metadata.business_id || "PENDING",
                branchId: null,
                mustChangePassword: false,
                createdAt: new Date(initialSession.user.created_at),
                canCreateExpense: true
              };
              setUser(fallbackUser);
            }
            setLoading(false);
            clearGlobalTimeout();
          }
        } else {
          console.debug("🚫 No initial session found");
          clearEmergencyTimeout(); // Clear emergency timeout
          setLoading(false);
          clearGlobalTimeout();
        }

        // Setup listener for future auth changes (login, logout, etc.)
        try {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            
            console.debug("🔐 Auth state change:", event, "Session:", !!session);
            
            // Only handle SIGNED_IN and SIGNED_OUT events (not INITIAL_SESSION since we already handled it)
            if (event === 'SIGNED_IN' && session?.user) {
              console.debug("👤 User signed in, refreshing profile...");
              
              try {
                await refreshUserProfile(session.user);
              } catch (err: any) {
                console.warn("⚠️ Profile refresh failed on sign in, using fallback...");
                // Create fallback user to prevent blocking
                if (session.user && mounted) {
                  const metadata = session.user.user_metadata || {};
                  const fallbackUser: User = {
                    id: session.user.id,
                    email: session.user.email || "",
                    firstName: metadata.first_name || "User",
                    lastName: metadata.last_name || "",
                    role: (metadata.role as UserRole) || "Business Owner",
                    roleId: null,
                    businessId: metadata.business_id || "PENDING",
                    branchId: null,
                    mustChangePassword: false,
                    createdAt: new Date(session.user.created_at),
                    canCreateExpense: true
                  };
                  setUser(fallbackUser);
                  setLoading(false);
                }
              }
            } else if (event === 'SIGNED_OUT') {
              console.debug("👋 User signed out");
              setUser(null);
              setBusiness(null);
              setLoading(false);
            }
          });
          authSubscription = subscription;
        } catch (listenerException: any) {
          console.error("🚫 Failed to setup auth listener:", listenerException);
          console.error("This is likely a network block - continuing without listener");
          // Don't block initialization if listener fails
        }

      } catch (err) {
        console.error("Critical error during auth initialization:", err);
        if (mounted) setLoading(false);
        clearGlobalTimeout();
      }
    };

    // Global fallback timeout as last resort (only if something goes terribly wrong)
    // Reduced to 4s to prevent landing page from being stuck
    globalTimeoutId = setTimeout(() => {
      if (mounted) {
        console.debug("⏰ Global auth timeout reached (likely network issue - continuing silently)");
        setLoading(false);
        // Don't show error toast on public routes - just fail silently
      }
    }, 4000); // 4 seconds - prevent landing page block

    initializeAuth();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      clearGlobalTimeout();
      clearEmergencyTimeout();
    };
  }, []);

  const refreshUserProfile = async (authUser: any, retryCount = 0) => {
    // Prevent concurrent calls (except retries)
    if (retryCount === 0 && isRefreshing.current) {
      console.log("⚠️ refreshUserProfile already running, skipping concurrent call");
      return;
    }
    isRefreshing.current = true;
    
    const userId = authUser.id;
    console.debug(`🔄 refreshUserProfile called for user ${userId}, retry: ${retryCount}`);
    
    try {
      // Fetch User Profile from 'profiles' table
      console.debug("📡 Fetching profile from database...");
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      console.debug("📊 Profile fetch result:", { profileData: !!profileData, error: !!profileError });

      // If we get an error other than "Not Found" (which maybeSingle handles by returning null data), handle it.
      if (profileError && profileError.code !== "406" && profileError.code !== "PGRST116") {
        // LOG ALL ERROR DETAILS TO DIAGNOSE 500 ERRORS
        console.error('🚨 PROFILE FETCH ERROR DETAILS:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          fullError: profileError
        });
        
        // Check for infinite recursion error (RLS policy issue) first
        // 500 errors from Postgres often mean internal server error (could be RLS recursion)
        const isRLSError = 
          profileError.code === '42P17' || 
          String(profileError.code) === '42P17' ||
          profileError.message?.toLowerCase().includes('infinite recursion') ||
          profileError.message?.includes('42P17') ||
          profileError.message?.includes('500') ||
          profileError.message?.includes('Internal Server Error') ||
          String(profileError.code).startsWith('5'); // 500-level errors
        
        if (isRLSError) {
          console.debug("🔄 Using optimized RLS workaround mode");
          
          // Set flag to show banner with fix instructions (non-blocking)
          sessionStorage.setItem('rls-recursion-error', 'true');
          
          // DON'T THROW - Instead create a fallback user profile with correct structure
          const metadata = authUser.user_metadata || {};
          const fallbackUser: User = {
            id: userId,
            email: authUser.email || "unknown@tillsup.com",
            phone: metadata.phone_number || metadata.phone,
            firstName: metadata.first_name || metadata.firstName || "User",
            lastName: metadata.last_name || metadata.lastName || "",
            role: (metadata.role as UserRole) || "Business Owner",
            roleId: null,
            businessId: metadata.business_id || metadata.businessId || "PENDING",
            branchId: metadata.branch_id || metadata.branchId || null,
            mustChangePassword: false,
            createdAt: new Date(metadata.created_at || authUser.created_at || Date.now()),
            canCreateExpense: metadata.role === "Business Owner" || metadata.can_create_expense || false
          };
          
          console.debug("✅ RLS workaround active - all features available");
          setUser(fallbackUser);
          setLoading(false);
          isRefreshing.current = false;
          
          // Try to fetch and set business if businessId exists
          if (fallbackUser.businessId && fallbackUser.businessId !== "PENDING") {
            console.log("🏢 Attempting to fetch business data in fallback mode...");
            try {
              const { data: businessData } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', fallbackUser.businessId)
                .maybeSingle();
              
              if (businessData) {
                const mappedBusiness: Business = {
                  id: businessData.id,
                  name: businessData.name,
                  ownerId: businessData.owner_id,
                  createdAt: new Date(businessData.created_at),
                  subscriptionPlan: businessData.subscription_plan || "Free Trial",
                  subscriptionStatus: businessData.subscription_status || "trial",
                  trialEndsAt: new Date(businessData.trial_ends_at),
                  subscriptionEndDate: businessData.subscription_end_date ? new Date(businessData.subscription_end_date) : undefined,
                  requiresExtensionNotice: businessData.requires_extension_notice || false,
                  extensionNotifiedAt: businessData.extension_notified_at ? new Date(businessData.extension_notified_at) : undefined,
                  maxBranches: businessData.max_branches || 1,
                  maxStaff: businessData.max_staff || 5,
                  currency: businessData.currency || "KES",
                  country: businessData.country || "Kenya",
                  timezone: businessData.timezone || "Africa/Nairobi",
                  businessType: businessData.business_type,
                  workingHours: businessData.working_hours || { start: "09:00", end: "21:00" },
                  taxConfig: businessData.tax_config || { enabled: false, name: "VAT", percentage: 16, inclusive: false },
                  branding: businessData.branding || { hidePlatformBranding: false },
                  completedOnboarding: businessData.completed_onboarding || false
                };
                setBusiness(mappedBusiness);
                console.log("✅ Business data loaded in fallback mode");
              } else {
                console.debug("No business data found, using placeholder");
                setBusiness({
                  id: fallbackUser.businessId,
                  name: `${fallbackUser.firstName}'s Business`,
                  ownerId: userId,
                  createdAt: new Date(),
                  subscriptionPlan: "Free Trial",
                  subscriptionStatus: "trial",
                  trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  maxBranches: 5,
                  maxStaff: 20,
                  currency: "KES",
                  country: "Kenya",
                  timezone: "Africa/Nairobi",
                  workingHours: { start: "09:00", end: "21:00" },
                  taxConfig: { enabled: false, name: "VAT", percentage: 16, inclusive: false },
                  branding: { hidePlatformBranding: false },
                  completedOnboarding: false
                });
              }
            } catch (bizErr) {
              console.error("Error fetching business in fallback mode:", bizErr);
              setBusiness({
                id: fallbackUser.businessId,
                name: `${fallbackUser.firstName}'s Business`,
                ownerId: userId,
                createdAt: new Date(),
                subscriptionPlan: "Free Trial",
                subscriptionStatus: "trial",
                trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                maxBranches: 5,
                maxStaff: 20,
                currency: "KES",
                country: "Kenya",
                timezone: "Africa/Nairobi",
                workingHours: { start: "09:00", end: "21:00" },
                taxConfig: { enabled: false, name: "VAT", percentage: 16, inclusive: false },
                branding: { hidePlatformBranding: false },
                completedOnboarding: false
              });
            }
          } else {
            // No valid businessId, set placeholder
            setBusiness({
              id: "temp-fallback",
              name: `${fallbackUser.firstName}'s Business`,
              ownerId: userId,
              createdAt: new Date(),
              subscriptionPlan: "Free Trial",
              subscriptionStatus: "trial",
              trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              maxBranches: 5,
              maxStaff: 20,
              currency: "KES",
              country: "Kenya",
              timezone: "Africa/Nairobi",
              workingHours: { start: "09:00", end: "21:00" },
              taxConfig: { enabled: false, name: "VAT", percentage: 16, inclusive: false },
              branding: { hidePlatformBranding: false },
              completedOnboarding: false
            });
          }
          
          return;
        }
        
        // RETRY ON NETWORK ERROR
        const isNetworkError = profileError.message?.includes("Failed to fetch") || 
                               profileError.message?.includes("Network request failed") ||
                               profileError.message?.includes("NetworkError") ||
                               profileError.message?.includes("fetch") ||
                               profileError.message?.includes("BLOCKED") ||
                               profileError.message?.includes("blocked") ||
                               !profileError.code; // Often network errors have no PG code

        // If blocked by administrator, don't retry - go straight to fallback
        if ((profileError.message?.includes("BLOCKED") || profileError.message?.includes("blocked")) && retryCount === 0) {
             console.warn("🚫 Request blocked by browser/administrator - using fallback mode");
             // Skip retries, go straight to creating fallback user
             const metadata = authUser.user_metadata || {};
             const fallbackUser: User = {
               id: userId,
               email: authUser.email || "",
               firstName: metadata.first_name || "User",
               lastName: metadata.last_name || "",
               role: (metadata.role as UserRole) || "Business Owner",
               roleId: null,
               businessId: metadata.business_id || "PENDING",
               branchId: null,
               mustChangePassword: false,
               createdAt: new Date(authUser.created_at),
               canCreateExpense: true
             };
             setUser(fallbackUser);
             setLoading(false);
             isRefreshing.current = false;
             
             toast.error("Network Blocked", {
               description: "Your browser or network is blocking requests to Supabase. Some features may not work. Please disable browser extensions or try a different network.",
               duration: 8000
             });
             return;
        }

        if (isNetworkError && retryCount < 2) {
             console.debug(`⚠️ Network error detected during profile fetch, retrying... (${retryCount + 1}/2)`);
             await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1))); // Backoff
             return refreshUserProfile(authUser, retryCount + 1);
        }
        
        // If network error persists after retries, create fallback user
        if (isNetworkError && retryCount >= 2) {
          console.debug("Network error persists after retries, creating fallback user");
          const metadata = authUser.user_metadata || {};
          const fallbackUser: User = {
            id: userId,
            email: authUser.email || "",
            firstName: metadata.first_name || "User",
            lastName: metadata.last_name || "",
            role: (metadata.role as UserRole) || "Business Owner",
            roleId: null,
            businessId: metadata.business_id || "PENDING",
            branchId: null,
            mustChangePassword: false,
            createdAt: new Date(authUser.created_at),
            canCreateExpense: true
          };
          setUser(fallbackUser);
          setLoading(false);
          isRefreshing.current = false;
          
          // Only show toast if not already shown (prevent spam)
          if (!sessionStorage.getItem('connection-error-shown')) {
            sessionStorage.setItem('connection-error-shown', 'true');
            toast.warning("Limited Connectivity", {
              description: "Running in offline mode. Some features may be unavailable.",
              duration: 6000
            });
          }
          return;
        }

        // Handle Schema Error: If 'profiles' table is missing (42P01), set a special error state and temporary user so the dashboard can render and show the fix script.
        if (profileError.code === "42P01") {
            setSchemaError(profileError);
            
            // Create a temporary "Admin" user to allow navigation to Dashboard
            const tempUser: User = {
                id: userId,
                email: authUser.email,
                firstName: "System",
                lastName: "Admin",
                role: "Business Owner",
                businessId: "setup-pending",
                branchId: null,
                roleId: null,
                mustChangePassword: false,
                createdAt: new Date(),
                canCreateExpense: true
            };
            setUser(tempUser);
            
            // Also create a temporary Business object so Dashboard doesn't crash on null business
            const tempBusiness: Business = {
                id: "setup-pending",
                name: "System Setup",
                ownerId: userId,
                createdAt: new Date(),
                subscriptionPlan: "Free Trial",
                subscriptionStatus: "active",
                trialEndsAt: new Date(),
                maxBranches: 1,
                maxStaff: 1,
                currency: "KES",
                country: "Kenya",
                timezone: "Africa/Nairobi",
                workingHours: { start: "09:00", end: "17:00" },
                taxConfig: { enabled: false, name: "VAT", percentage: 16, inclusive: false },
                branding: { hidePlatformBranding: false },
                completedOnboarding: false
            };
            setBusiness(tempBusiness);
        } else {
            setLoading(false);
            isRefreshing.current = false; // Reset flag
            return;
        }
      }

      // If profileData is null (and no error), try to recover or fallback
      if (!profileData) {
        // RETRY MECHANISM:
        if (isRegistering.current) {
            console.log("Registration in progress, ignoring missing profile for now.");
            setLoading(false);
            isRefreshing.current = false; // Reset flag
            return;
        }

        if (retryCount < 1) {
          console.log(`Profile not found, retrying... (${retryCount + 1}/1)`);
          await new Promise(resolve => setTimeout(resolve, 500));
          return refreshUserProfile(authUser, retryCount + 1);
        }

        console.warn("User is authenticated but has no profile record. Using quick fallback to prevent timeout...");
        
        // Quick fallback to prevent timeout - skip auto-heal for now
        if (retryCount > 0) {
          const metadata = authUser?.user_metadata || {};
          const fallbackUser: User = {
            id: userId,
            email: authUser.email || "",
            firstName: metadata.first_name || "Unknown",
            lastName: metadata.last_name || "User",
            role: (metadata.role as UserRole) || "Business Owner",
            roleId: null,
            businessId: "PENDING",
            branchId: null,
            mustChangePassword: false,
            createdAt: new Date(authUser.created_at),
            canCreateExpense: false
          };
          setUser(fallbackUser);
          setLoading(false);
          isRefreshing.current = false; // Reset flag
          return;
        }

        // AUTO-HEAL STRATEGY (only on first attempt): 
        if (authUser && authUser.user_metadata) {
             const metadata = authUser.user_metadata;
             
             // 1. Try to find an existing business owned by this user
             const { data: userBusiness } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_id', userId)
                .maybeSingle();
             
             let businessId = userBusiness?.id;

             // 2. If no business found, CREATE ONE AUTOMATICALLY (Full Recovery)
             if (!businessId) {
                 console.log("No business found during auto-heal. Creating one...");
                 // Use UUID instead of BIZ-... string to match DB schema expectations
                 businessId = crypto.randomUUID();
                 const newBusiness = {
                    id: businessId,
                    name: "My Business (Restored)",
                    owner_id: userId,
                    subscription_plan: "Free Trial",
                    subscription_status: "trial",
                    trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    currency: "KES",
                    country: "Kenya",
                    created_at: new Date().toISOString(),
                 };
                 const { error: bizError } = await supabase.from('businesses').insert(newBusiness);
                 if (bizError) {
                     console.error("Failed to auto-heal business:", bizError);
                     // Fallback to PENDING but don't stop
                     businessId = "PENDING"; 
                 }
             }
             
             if (businessId && businessId !== "PENDING") {
                 console.log("Attempting to recreate profile...");
                 const newProfile = {
                    id: userId,
                    email: authUser.email,
                    first_name: metadata.first_name || "User",
                    last_name: metadata.last_name || "Name",
                    role: (metadata.role as UserRole) || "Business Owner",
                    business_id: businessId,
                    can_create_expense: true, 
                    created_at: new Date().toISOString()
                 };

                 const { error: healError } = await supabase.from('profiles').insert(newProfile);
                 
                 if (!healError) {
                     console.log("Profile successfully recreated! Reloading...");
                     // Manually set user state to avoid recursive fetch loop and race conditions
                     const mappedUser: User = {
                        id: userId,
                        email: authUser.email,
                        phone: authUser.phone,
                        firstName: newProfile.first_name,
                        lastName: newProfile.last_name,
                        role: newProfile.role,
                        roleId: null,
                        businessId: newProfile.business_id,
                        branchId: null,
                        mustChangePassword: false,
                        createdAt: new Date(),
                        canCreateExpense: newProfile.can_create_expense,
                     };
                     setUser(mappedUser);
                     
                     // Fetch business quickly or use placeholder if needed
                     const { data: bData } = await supabase.from('businesses').select('*').eq('id', newProfile.business_id).maybeSingle();
                     if (bData) {
                         // We can reuse the mapping logic but for speed, let's just do a quick map here or call a helper
                         // Since we are inside the component, we can't easily reuse the mapping block below without refactoring.
                         // But we know this business is new/valid.
                         // For simplicity and robustness, let's just let it fall through to the end of the function?
                         // No, we returned early.
                         // Let's call refreshUserProfile with a flag to skip retries?
                         // Or just do a single targeted fetch.
                         return refreshUserProfile(authUser, 0); 
                     }
                 } else {
                     console.error("Failed to auto-heal profile:", healError);
                 }
             }
        }

        console.warn("Auto-recovery failed. Using session fallback to keep user logged in.");
        
        // FINAL FALLBACK: Keep user logged in with session metadata
        if (authUser) {
            const metadata = authUser.user_metadata || {};
            
            const fallbackUser: User = {
                id: authUser.id,
                email: authUser.email || "",
                firstName: metadata.first_name || "Unknown",
                lastName: metadata.last_name || "User",
                role: (metadata.role as UserRole) || "Business Owner",
                roleId: null,
                businessId: "PENDING", 
                branchId: null,
                mustChangePassword: false,
                createdAt: new Date(authUser.created_at),
                canCreateExpense: false
            };
            
            setUser(fallbackUser);
            
            // Try to find business again just in case
            const { data: userBusiness } = await supabase.from('businesses').select('*').eq('owner_id', userId).maybeSingle();
            if (userBusiness) {
                 const mappedBusiness: Business = {
                    id: userBusiness.id,
                    name: userBusiness.name,
                    ownerId: userBusiness.owner_id,
                    createdAt: new Date(userBusiness.created_at),
                    subscriptionPlan: userBusiness.subscription_plan || "Free Trial",
                    subscriptionStatus: userBusiness.subscription_status || "trial",
                    trialEndsAt: new Date(userBusiness.trial_ends_at),
                    maxBranches: userBusiness.max_branches || 1,
                    maxStaff: userBusiness.max_staff || 5,
                    currency: userBusiness.currency || "KES",
                    country: userBusiness.country || "Kenya",
                    timezone: userBusiness.timezone || "Africa/Nairobi",
                    businessType: userBusiness.business_type,
                    workingHours: userBusiness.working_hours || { start: "09:00", end: "21:00" },
                    taxConfig: userBusiness.tax_config || { enabled: false, name: "VAT", percentage: 16, inclusive: false },
                    branding: userBusiness.branding || { hidePlatformBranding: false },
                    completedOnboarding: userBusiness.completed_onboarding || false
                 };
                 setBusiness(mappedBusiness);
                 setUser({ ...fallbackUser, businessId: mappedBusiness.id });
            } else {
                 // CRITICAL FIX: If no business exists in DB (and creation failed), 
                 // redirect to recovery page to complete setup
                 console.warn("No business found in DB. Redirecting to recovery page...");
                 
                 // Show user-friendly message
                 toast.warning("Registration incomplete. Please complete your setup.", {
                   duration: 5000
                 });
                 
                 // Set temporary business so the app doesn't crash during redirect
                 const placeholderBusiness: Business = {
                    id: "temp-setup",
                    name: "⚠️ Setup Incomplete",
                    ownerId: userId,
                    createdAt: new Date(),
                    subscriptionPlan: "Free Trial",
                    subscriptionStatus: "trial",
                    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    maxBranches: 1,
                    maxStaff: 1,
                    currency: "KES",
                    country: "Kenya",
                    timezone: "Africa/Nairobi",
                    workingHours: { start: "09:00", end: "17:00" },
                    taxConfig: { enabled: false, name: "VAT", percentage: 16, inclusive: false },
                    branding: { hidePlatformBranding: false },
                    completedOnboarding: false
                 };
                 setBusiness(placeholderBusiness);
                 setUser({ ...fallbackUser, businessId: placeholderBusiness.id });
                 
                 // Redirect to recovery page after state is set
                 setLoading(false);
                 setTimeout(() => {
                   window.location.href = '/recovery';
                 }, 1000);
                 return;
            }
            
            setLoading(false);
            return;
        }

        // Only if absolutely catastrophic failure
        console.error("Critical: User authenticated but no profile and no session metadata.");
        setUser(null);
        setBusiness(null);
        setLoading(false);
        return;
      }

      // Map snake_case DB fields to camelCase User interface
      const mappedUser: User = {
        id: profileData.id,
        email: profileData.email,
        phone: profileData.phone_number,
        firstName: profileData.first_name || profileData.firstName,
        lastName: profileData.last_name || profileData.lastName,
        role: profileData.role,
        roleId: profileData.role_id || profileData.roleId,
        businessId: profileData.business_id || profileData.businessId,
        branchId: profileData.branch_id || profileData.branchId,
        mustChangePassword: profileData.must_change_password || profileData.mustChangePassword,
        createdAt: new Date(profileData.created_at || profileData.createdAt),
        canCreateExpense: profileData.can_create_expense ?? (profileData.role === "Business Owner"),
      };

      // CHECK FOR INVALID BUSINESS ID (LEGACY MIGRATION)
      // If the business ID is not a valid UUID (e.g. starts with "BIZ-"), we must migrate the user
      // to a new Business record with a valid UUID to satisfy database constraints.
      const isBusinessIdValid = mappedUser.businessId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mappedUser.businessId);

      // 1. LEGACY MIGRATION: Convert old "BIZ-..." ID to UUID
      if (mappedUser.businessId && !isBusinessIdValid) {
        console.warn(`Migrating legacy Business ID ${mappedUser.businessId} to UUID...`);
        
        try {
          if (mappedUser.role === "Business Owner") {
              const oldBusinessId = mappedUser.businessId;
              const newBusinessId = crypto.randomUUID();
              
              // Create new Business with UUID
              const newBusiness = {
                id: newBusinessId,
                name: "My Business (Restored)",
                owner_id: mappedUser.id,
                subscription_plan: "Free Trial",
                subscription_status: "trial",
                trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                currency: "KES",
                country: "Kenya",
                created_at: new Date().toISOString(),
              };
    
              const { error: createBizError } = await supabase.from('businesses').insert(newBusiness);
              
              if (!createBizError) {
                 // Migrate EVERYTHING to new business ID
                 await Promise.all([
                    // Update ALL profiles (owner + staff)
                    supabase.from('profiles').update({ business_id: newBusinessId }).eq('business_id', oldBusinessId),
                    // Update branches
                    supabase.from('branches').update({ business_id: newBusinessId }).eq('business_id', oldBusinessId),
                    // Update products/inventory if possible (best effort)
                    supabase.from('products').update({ business_id: newBusinessId }).eq('business_id', oldBusinessId),
                    supabase.from('sales').update({ business_id: newBusinessId }).eq('business_id', oldBusinessId)
                 ]);

                 console.log("Migration successful. Updating local state.");
                 mappedUser.businessId = newBusinessId;
              } else {
                 console.error("Failed to create new business during migration:", createBizError);
              }
          } else {
              console.warn("User is not Business Owner. Cannot migrate business ID. Please contact support.");
          }
        } catch (migrationError) {
           console.error("Unexpected error during business migration:", migrationError);
        }
      }

      // 2. ORPHANED DATA RESCUE: Check if user has a valid UUID business but old data was left behind
      if (mappedUser.role === "Business Owner" && isBusinessIdValid) {
         try {
            // Find any OTHER businesses owned by this user that are Legacy (start with BIZ-)
            const { data: legacyBusinesses } = await supabase
              .from('businesses')
              .select('id')
              .eq('owner_id', mappedUser.id)
              .neq('id', mappedUser.businessId)
              .like('id', 'BIZ-%');

            if (legacyBusinesses && legacyBusinesses.length > 0) {
               console.log(`Found ${legacyBusinesses.length} legacy business records. Rescuing data...`);
               
               for (const legacyBiz of legacyBusinesses) {
                  const oldId = legacyBiz.id;
                  const newId = mappedUser.businessId;
                  
                  console.log(`Migrating data from ${oldId} to ${newId}...`);
                  
                  await Promise.all([
                    supabase.from('branches').update({ business_id: newId }).eq('business_id', oldId),
                    supabase.from('profiles').update({ business_id: newId }).eq('business_id', oldId),
                    supabase.from('products').update({ business_id: newId }).eq('business_id', oldId),
                    supabase.from('sales').update({ business_id: newId }).eq('business_id', oldId)
                  ]);
                  
                  // Delete the empty shell to prevent future confusion
                  await supabase.from('businesses').delete().eq('id', oldId);
               }
               console.log("Data rescue complete.");
            }
         } catch (rescueError) {
            console.error("Error during orphaned data rescue:", rescueError);
         }
      }

      console.log("✅ Setting user:", mappedUser.email);
      setUser(mappedUser);
      
      // CRITICAL: Set loading to false immediately after user is set
      // This allows the UI to render while business data loads in background
      setLoading(false);
      // Note: clearGlobalTimeout() is called by the caller (in useEffect initialization)

      // Fetch Business in background (non-blocking)
      if (mappedUser.businessId) {
        console.log("🏢 Fetching business in background for ID:", mappedUser.businessId);
        
        try {
          // Wrap business fetching in a timeout to prevent hanging
          const businessFetchPromise = (async () => {
            console.log("🏢 Smart fetch: Trying owner_id first...");
            
            // STRATEGY 1: Fetch by owner_id (RLS-friendly, bypasses the issue)
            let { data: businessData, error: businessError } = await supabase
              .from('businesses')
              .select('*')
              .eq('owner_id', userId)
              .maybeSingle();
            
            if (businessData) {
              console.log("✅ Found via owner_id:", businessData.name);
              // Update profile if needed
              if (businessData.id !== mappedUser.businessId) {
                console.log("🔄 Syncing profile business_id...");
                await supabase.from('profiles').update({ business_id: businessData.id }).eq('id', userId);
              }
            } else {
              // STRATEGY 2: Fetch by business_id
              console.log("🏢 Trying business_id...");
              const result = await supabase
                .from('businesses')
                .select('*')
                .eq('id', mappedUser.businessId)
                .maybeSingle();
              
              businessData = result.data;
              businessError = result.error;
              
              // AUTO-FIX owner_id if needed
              if (businessData && (!businessData.owner_id || businessData.owner_id !== userId)) {
                console.log("🔧 Auto-fixing missing owner_id in business record...");
                await supabase.from('businesses').update({ owner_id: userId }).eq('id', businessData.id);
                businessData.owner_id = userId;
                console.log("✅ Owner ID fixed successfully");
              }
            }
            
            console.log("🏢 Business fetch result:", { businessData: !!businessData, error: businessError });
              
            if (businessData) {
              // Use unified status calculation for consistency
              const statusResult = calculateSubscriptionStatus({
                subscription_status: businessData.subscription_status || businessData.subscriptionStatus,
                trial_ends_at: businessData.trial_ends_at || businessData.trialEndsAt,
                subscription_end_date: businessData.subscription_end_date
              });

              return {
                id: businessData.id,
                name: (mappedUser.email === "demo@test.com" && (businessData.name === "My Business (Restored)" || businessData.name === "Complete Setup")) ? "Tillsup Demo Store" : businessData.name,
                ownerId: businessData.owner_id || businessData.ownerId,
                createdAt: new Date(businessData.created_at || businessData.createdAt),
                subscriptionPlan: businessData.subscription_plan || businessData.subscriptionPlan || "Free Trial",
                subscriptionStatus: statusResult.status,
                trialEndsAt: new Date(businessData.trial_ends_at || businessData.trialEndsAt),
                subscriptionEndDate: businessData.subscription_end_date ? new Date(businessData.subscription_end_date) : undefined,
                requiresExtensionNotice: businessData.requires_extension_notice || false,
                extensionNotifiedAt: businessData.extension_notified_at ? new Date(businessData.extension_notified_at) : undefined,
                maxBranches: businessData.max_branches || businessData.maxBranches || 1,
                maxStaff: businessData.max_staff || businessData.maxStaff || 5,
                currency: businessData.currency || "KES",
                country: businessData.country || "Kenya",
                timezone: businessData.timezone || "Africa/Nairobi",
                businessType: businessData.business_type || businessData.businessType,
                workingHours: businessData.working_hours || businessData.workingHours || { start: "09:00", end: "21:00" },
                taxConfig: businessData.tax_config || businessData.taxConfig || { enabled: false, name: "VAT", percentage: 16, inclusive: false },
                branding: businessData.branding || { hidePlatformBranding: false },
                completedOnboarding: businessData.completed_onboarding || businessData.completedOnboarding || false
              };
            } else {
              // Business data not found - return placeholder
              console.debug("No business data found, using placeholder");
              return {
                id: mappedUser.businessId,
                name: `${mappedUser.firstName}'s Business`,
                ownerId: mappedUser.id,
                createdAt: new Date(),
                subscriptionPlan: "Free Trial" as const,
                subscriptionStatus: "trial" as const,
                trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                maxBranches: 5,
                maxStaff: 20,
                currency: "KES",
                country: "Kenya",
                timezone: "Africa/Nairobi",
                workingHours: { start: "09:00", end: "21:00" },
                taxConfig: { enabled: false, name: "VAT", percentage: 16, inclusive: false },
                branding: { hidePlatformBranding: false },
                completedOnboarding: false
              };
            }
          })();

          // Wait for business fetch (no timeout - it's non-blocking background operation)
          const business = await businessFetchPromise;
          setBusiness(business);
          console.log("✅ Business set:", business.name);
        } catch (err) {
          console.error("❌ Error fetching business:", err);
          // Use placeholder on any error
          setBusiness({
            id: mappedUser.businessId,
            name: `${mappedUser.firstName}'s Business`,
            ownerId: mappedUser.id,
            createdAt: new Date(),
            subscriptionPlan: "Free Trial",
            subscriptionStatus: "trial",
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            maxBranches: 5,
            maxStaff: 20,
            currency: "KES",
            country: "Kenya",
            timezone: "Africa/Nairobi",
            workingHours: { start: "09:00", end: "21:00" },
            taxConfig: { enabled: false, name: "VAT", percentage: 16, inclusive: false },
            branding: { hidePlatformBranding: false },
            completedOnboarding: false
          });
        }
      } else {
        console.warn("���️ User has no business ID");
      }
      console.log("🏁 refreshUserProfile complete (loading already set to false earlier)");
      // Note: setLoading(false) already called earlier after setUser() for faster UI rendering
    } catch (err: any) {
      console.error("Error refreshing user profile:", err);
      console.error("Error type:", err?.constructor?.name);
      console.error("Error message:", err?.message);
      
      // If this is a network blocking error, create fallback user
      const errorMessage = String(err?.message || err || '');
      const isBlocked = errorMessage.includes('BLOCKED') || 
                        errorMessage.includes('blocked') ||
                        errorMessage.includes('Failed to fetch') ||
                        errorMessage.includes('NetworkError');
      
      if (isBlocked) {
        console.warn("🚫 Network blocking detected in catch block - creating fallback user");
        try {
          const metadata = authUser?.user_metadata || {};
          const fallbackUser: User = {
            id: authUser?.id || 'unknown',
            email: authUser?.email || "",
            firstName: metadata.first_name || "User",
            lastName: metadata.last_name || "",
            role: (metadata.role as UserRole) || "Business Owner",
            roleId: null,
            businessId: metadata.business_id || "PENDING",
            branchId: null,
            mustChangePassword: false,
            createdAt: new Date(authUser?.created_at || Date.now()),
            canCreateExpense: true
          };
          setUser(fallbackUser);
          
          toast.error("Limited Access Mode", {
            description: "Network connection is restricted. You can still use basic features, but some data may not load.",
            duration: 8000
          });
        } catch (fallbackErr) {
          console.error("Failed to create fallback user:", fallbackErr);
        }
      }
      
      setLoading(false);
      // Note: clearGlobalTimeout() is called by the caller (in useEffect initialization)
    } finally {
      // Always reset the refresh flag, even on early returns or errors
      isRefreshing.current = false;
    }
  };

  // ──────────────────────────────��────────────────────────────────
  // BUSINESS REGISTRATION
  // ─────────────────────────────────���─────────────────────────────
  const registerBusiness = async (
    businessName: string,
    ownerEmail: string,
    ownerPassword: string,
    ownerFirstName: string,
    ownerLastName: string,
    ownerPhone: string,
    country: string = "Kenya",
    currency: string = "KES"
  ): Promise<{ success: boolean; error?: string }> => {
    isRegistering.current = true;
    try {
      // 1. Create Auth User
      let authUser = null;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ownerEmail,
        password: ownerPassword,
        options: {
          data: {
            first_name: ownerFirstName,
            last_name: ownerLastName,
            role: "Business Owner"
          }
        }
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("already registered") || authError.message.toLowerCase().includes("unique constraint")) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: ownerEmail,
            password: ownerPassword
          });
          
          if (signInError) {
            return { success: false, error: "Account exists but login failed: " + signInError.message };
          }
          
          if (signInData.user) {
             authUser = signInData.user;
             const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', authUser.id).single();
             if (existingProfile) {
                return { success: false, error: "Account already fully registered. Please log in." };
             }
          }
        } else {
          return { success: false, error: authError.message };
        }
      } else {
        authUser = authData.user;
      }

      if (!authUser) {
         const { data: { session } } = await supabase.auth.getSession();
         if (session?.user) {
           authUser = session.user;
         } else {
           return { success: true, error: "Please check your email to confirm your account." };
         }
      }

      const userId = authUser.id;
      // Use UUID instead of BIZ-... string to match DB schema expectations
      const businessId = crypto.randomUUID();

      // 2. Create Business Record
      const { data: existingBusiness } = await supabase.from('businesses').select('id').eq('owner_id', userId).maybeSingle();
      
      let finalBusinessId = businessId;
      
      if (!existingBusiness) {
        // NOTE: Database has triggers that will validate and auto-set owner_id if needed
        // See: /supabase/migrations/fix_owner_id_and_prevent_future_issues.sql
        const newBusiness = {
          id: businessId,
          name: businessName,
          owner_id: userId, // Critical: Must match auth.uid() for RLS policies
          subscription_plan: "Free Trial",
          subscription_status: "trial",
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          currency,
          country,
          created_at: new Date().toISOString(),
        };

        const { error: bizError } = await supabase.from('businesses').insert(newBusiness);
        if (bizError) {
          // If business creation fails, we might still have a user. 
          // We can try to proceed or return error. Returning error stops flow.
          // But authUser is created.
          // Let's assume user tries again later, or we let auto-heal handle it next login.
          console.error("Business creation failed:", bizError);
          console.error("Business creation error details:", {
            code: bizError.code,
            message: bizError.message,
            details: bizError.details,
            hint: bizError.hint
          });
          
          // Provide more helpful error message
          let errorMessage = "Failed to create business record. ";
          if (bizError.message.includes("permission denied")) {
            errorMessage += "Database permissions issue detected. Please contact support or check your database RLS policies.";
          } else if (bizError.code === "23505") {
            errorMessage += "Business already exists. Try logging in instead.";
          } else {
            errorMessage += bizError.message;
          }
          
          return { success: false, error: errorMessage };
        }
      } else {
        finalBusinessId = existingBusiness.id;
      }

      // 3. Create User Profile
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
      
      if (!existingProfile) {
        const newProfile = {
          id: userId,
          email: ownerEmail,
          first_name: ownerFirstName,
          last_name: ownerLastName,
          phone_number: ownerPhone,
          role: "Business Owner",
          business_id: finalBusinessId,
          can_create_expense: true,
          created_at: new Date().toISOString()
        };

        const { error: profileError } = await supabase.from('profiles').insert(newProfile);
        if (profileError) {
          // Check for infinite recursion error first
          const isRLSError = 
            profileError.code === '42P17' || 
            String(profileError.code) === '42P17' ||
            profileError.message?.toLowerCase().includes('infinite recursion') ||
            profileError.message?.includes('42P17');
          
          if (isRLSError) {
            console.debug("RLS policy recursion detected during registration profile creation");
            sessionStorage.setItem('rls-recursion-error', 'true');
            return { 
              success: false, 
              error: "Database policy error (infinite recursion). Please fix your RLS policies in Supabase." 
            };
          }
          
          console.error("Profile creation failed:", profileError);
          console.error("Profile creation error details:", {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          });
          
          let errorMessage = "Failed to create user profile. ";
          if (profileError.message.includes("permission denied")) {
            errorMessage += "Database permissions issue detected. Please contact support.";
          } else if (profileError.code === "23505") {
            errorMessage += "Profile already exists. Try logging in instead.";
          } else {
            errorMessage += profileError.message;
          }
          
          return { success: false, error: errorMessage };
        }
      }
      
      isRegistering.current = false;
      
      // ════════════���══════════════════════════════════════════════════════
      // IMPORTANT: Do NOT auto-login after registration
      // User should be redirected to login page instead
      // ════════════════════════════════════════��══════════════════════════
      // Sign out the user immediately after registration
      await supabase.auth.signOut();
      
      // Do NOT call refreshUserProfile - we want user to login manually
      // await refreshUserProfile(authUser);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      isRegistering.current = false;
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean; branchDeactivated?: boolean }> => {
    console.log("🔐 Starting login process...", { email });
    
    // ═══════════════════════════════════════════════════════════════════
    // PREVIEW MODE: Use mock authentication
    // ═══════════════════════════════════════════════════════════════════
    if (isPreviewMode()) {
      console.log('🎨 Preview Mode: Mock login');
      const result = await PreviewModeAuth.login(email, password);
      if (result.success) {
        setUser(result.user);
        setBusiness(result.business);
        return { success: true, mustChangePassword: false };
      }
      return { success: false, error: 'Invalid credentials' };
    }
    
    try {
      console.log("🔵 Calling Supabase auth.signInWithPassword...");
      console.log("   📧 Email:", email);
      console.log("   🔒 Password length:", password?.length || 0);
      console.log("   🌐 Supabase URL:", supabaseUrl);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("❌ Login error from Supabase:", error);
        console.error("   Error code:", error.status);
        console.error("   Error message:", error.message);
        
        // Handle network errors
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
          return { 
            success: false, 
            error: "Cannot connect to server. Please check your internet connection and try again." 
          };
        }
        
        // Provide clearer feedback for invalid credentials
        if (error.message === "Invalid login credentials") {
          return { 
            success: false, 
            error: "Invalid email or password. If you don't have an account, please register first." 
          };
        }
        
        return { success: false, error: error.message };
      }

      console.log("✅ Supabase authentication successful");

      if (data.user) {
        // CRITICAL FIX: Immediately call refreshUserProfile to set user state
        // This ensures isAuthenticated becomes true BEFORE login() returns
        console.log("🔵 Immediately refreshing user profile to set auth state...");
        try {
          await refreshUserProfile(data.user);
          console.log("✅ User profile refreshed - auth state should be updated");
        } catch (refreshErr) {
          console.warn("⚠️ Profile refresh failed, but continuing with login");
        }
        
        // Optimization: Wrap secondary checks in a short timeout to prevent login hanging
        try {
            console.log("🔵 Fetching user profile and branch status...");
            
            const checkPromise = (async () => {
                // Fetch minimal flags
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('must_change_password, branch_id')
                  .eq('id', data.user.id)
                  .maybeSingle();
                
                if (profileError) {
                  // Check if this is the known RLS infinite recursion error (42P17)
                  const isRLSError = 
                    profileError.code === '42P17' || 
                    profileError.code === 42517 ||
                    String(profileError.code) === '42P17' ||
                    profileError.message?.toLowerCase().includes('infinite recursion') ||
                    profileError.message?.includes('42P17');
                  
                  if (isRLSError) {
                    // Silently handle RLS recursion - this is expected and has a workaround
                    console.debug("RLS policy recursion detected (expected, using workaround)");
                    sessionStorage.setItem('rls-recursion-error', 'true');
                  } else {
                    // Only log non-RLS errors
                    console.error("⚠️  Error fetching profile:", profileError);
                  }
                  // Continue login even if profile fetch fails
                  return { mustChangePassword: false };
                }
                
                console.log("📊 Profile fetched:", { 
                  mustChangePassword: profile?.must_change_password,
                  branchId: profile?.branch_id 
                });
                
                if (profile?.branch_id) {
                   const { data: branch, error: branchError } = await supabase
                     .from('branches')
                     .select('status')
                     .eq('id', profile.branch_id)
                     .single();
                   
                   if (branchError) {
                     console.error("⚠️  Error fetching branch:", branchError);
                     // Continue login even if branch fetch fails
                     return { mustChangePassword: profile?.must_change_password };
                   }
                   
                   if (branch && branch.status === 'inactive') {
                     console.log("❌ Branch is deactivated");
                     return { branchDeactivated: true };
                   }
                }
                
                return { mustChangePassword: profile?.must_change_password };
            })();

            // Increase timeout to 20 seconds for slower connections
            const timeoutPromise = new Promise<{ timeout: true }>((resolve) => 
              setTimeout(() => {
                console.log("⚠���  Secondary login checks timed out - continuing anyway");
                resolve({ timeout: true });
              }, 20000)
            );

            const result = await Promise.race([checkPromise, timeoutPromise]);

            if ('branchDeactivated' in result && result.branchDeactivated) {
                 await supabase.auth.signOut();
                 return { success: false, error: "Your branch has been deactivated. Please contact your administrator.", branchDeactivated: true };
            }
            
            if ('mustChangePassword' in result) {
                console.log("✅ Login successful - must change password:", result.mustChangePassword);
                return { success: true, mustChangePassword: result.mustChangePassword as boolean };
            }

            // If timeout or other issue, just proceed
            console.log("✅ Login successful (secondary checks timed out or skipped)");
            return { success: true };

        } catch (checkErr: any) {
            console.warn("⚠️  Secondary login checks failed:", checkErr);
            console.warn("   Continuing with login anyway...");
            return { success: true };
        }
      }

      console.log("✅ Login successful");
      return { success: true };
    } catch (err: any) {
      console.error("❌ Unexpected login error:", err);
      
      // Handle network errors at top level
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('fetch')) {
        return { 
          success: false, 
          error: "Network error. Please check your internet connection and try again." 
        };
      }
      
      return { success: false, error: err.message || "Login failed. Please try again." };
    }
  };

  const logout = async () => {
    // ═══════════════════════════════════════════════════════════════════
    // PREVIEW MODE: Mock logout
    // ═══════════════════════════════════════════════════════════════════
    if (isPreviewMode()) {
      console.log('🎨 Preview Mode: Mock logout');
      setUser(null);
      setBusiness(null);
      await PreviewModeAuth.logout();
      return;
    }
    
    // Optimistically clear state to prevent "bounce back" from protected routes
    setUser(null);
    setBusiness(null);
    await supabase.auth.signOut();
  };

  const changePassword = async (newPassword: string, retryCount = 0): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("🔐 changePassword called with password length:", newPassword.length, "retry:", retryCount);
      
      // Retry logic for network errors
      let lastError: any = null;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔵 Attempt ${attempt + 1}/${maxRetries + 1} to update password...`);
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          
          if (error) {
            // Check if it's a retryable network error
            const isNetworkError = 
              error.message?.includes('Failed to fetch') || 
              error.message?.includes('NetworkError') ||
              error.message?.includes('fetch') ||
              error.status === 0;
            
            if (isNetworkError && attempt < maxRetries) {
              console.warn(`⚠️ Network error on attempt ${attempt + 1}, retrying...`);
              lastError = error;
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
              continue;
            }
            
            console.error("❌ Supabase updateUser error:", error);
            return { success: false, error: error.message };
          }
          
          // Password updated successfully, now update the profile flag
          console.log("✅ Password updated successfully in Supabase Auth");
          
          if (user) {
            console.log("🔵 Updating profiles table for user:", user.id);
            try {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ must_change_password: false })
                .eq('id', user.id);
              
              if (updateError) {
                // Check for infinite recursion error
                const isRLSError = 
                  updateError.code === '42P17' || 
                  String(updateError.code) === '42P17' ||
                  updateError.message?.toLowerCase().includes('infinite recursion') ||
                  updateError.message?.includes('42P17');
                
                if (isRLSError) {
                  console.debug("⚠️ RLS policy recursion detected during profile update (expected, continuing)");
                  sessionStorage.setItem('rls-recursion-error', 'true');
                } else {
                  console.error("⚠️ Profile update error (non-critical):", updateError);
                  // Don't fail the password change if profile update fails
                }
              } else {
                console.log("✅ Profile flag updated successfully");
              }
            } catch (profileErr) {
              console.warn("⚠️ Profile update failed, but password was changed:", profileErr);
              // Don't fail the password change if profile update fails
            }
            
            // Update local state
            setUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
          }
          
          console.log("✅ Password change completed successfully");
          return { success: true };
          
        } catch (attemptErr: any) {
          lastError = attemptErr;
          
          // Check if it's a retryable error
          const isNetworkError = 
            attemptErr.message?.includes('Failed to fetch') || 
            attemptErr.message?.includes('NetworkError') ||
            attemptErr.message?.includes('fetch') ||
            attemptErr.name === 'AuthRetryableFetchError';
          
          if (isNetworkError && attempt < maxRetries) {
            console.warn(`⚠️ Network error on attempt ${attempt + 1}, retrying in ${(attempt + 1)}s...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          
          throw attemptErr; // Re-throw if not retryable or out of retries
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error('Failed to update password after multiple attempts');
      
    } catch (err: any) {
      console.error("❌ changePassword final error:", err);
      
      // Provide user-friendly error messages
      if (err.message?.includes('Failed to fetch') || err.name === 'AuthRetryableFetchError') {
        return { 
          success: false, 
          error: "Network connection issue. Please check your internet connection and try again. If the problem persists, your network may be blocking this request." 
        };
      }
      
      return { success: false, error: err.message || "Failed to change password. Please try again." };
    }
  };

  const updateProfile = async (
    updates: Partial<Pick<User, 'firstName' | 'lastName'>>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not authenticated" };
    try {
      const dbUpdates: any = {};
      if (updates.firstName) dbUpdates.first_name = updates.firstName;
      if (updates.lastName) dbUpdates.last_name = updates.lastName;
      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
      if (error) return { success: false, error: error.message };
      setUser(prev => prev ? { ...prev, ...updates } : null);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateBusiness = async (updates: Partial<Business>): Promise<{ success: boolean; error?: string }> => {
    if (!user || !business) return { success: false, error: "Not authenticated" };
    if (user.role !== "Business Owner") return { success: false, error: "Permission denied" };
    try {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.currency) dbUpdates.currency = updates.currency;
      const { error } = await supabase.from('businesses').update(dbUpdates).eq('id', business.id);
      if (error) return { success: false, error: error.message };
      setBusiness(prev => prev ? { ...prev, ...updates } : null);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // ═══════════════���═══════════════════════════════════════════════════
  // STAFF MANAGEMENT
  // ═���═════════════════════════════════════════════════════════════════

  const createStaff = async (
    email: string, 
    firstName: string, 
    lastName: string, 
    role: UserRole, 
    branchId?: string, 
    roleId?: string,
    password?: string
  ): Promise<{ success: boolean; error?: string; credentials?: { email: string; password: string }; errorCode?: string }> => {
    if (!user || !business) {
      console.error("❌ Cannot create staff: Not authenticated");
      return { success: false, error: "Not authenticated" };
    }
    
    // ══════════════════════════════════════════════════════════════��════
    // PREVIEW MODE: Mock staff creation
    // ═══════════════════════════════════════════════════════════════════
    if (isPreviewMode()) {
      return await PreviewModeAuth.createStaff({ email, firstName, lastName, role, branchId, roleId });
    }
    
    // Safe string conversion to prevent "R.toLowerCase is not a function" errors
    email = String(email ?? '');
    firstName = String(firstName ?? '');
    lastName = String(lastName ?? '');
    role = String(role ?? '') as UserRole;

    console.log("🟢 Creating staff with data:", { email, firstName, lastName, role, branchId, password: password ? '***' : undefined });
    console.log("👤 Current user:", { id: user.id, email: user.email, role: user.role, businessId: user.businessId });
    console.log("🏢 Current business:", { id: business.id, name: business.name });
    
    // RBAC Check: Ensure user has permission to create staff
    if (!hasPermission(['Business Owner', 'Manager'], "staff.create")) {
      console.error("❌ Permission denied: User role is", user.role);
      return { success: false, error: "Only Business Owners and Managers with 'staff.create' permission can create staff members." };
    }
    
    try {
      // 1. Check if user already exists in profiles
      console.log("����� Checking if user exists with email:", email);
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, business_id')
        .eq('email', email)
        .maybeSingle();
      
      if (checkError) {
        // Check for infinite recursion error first
        const isRLSError = 
          checkError.code === '42P17' || 
          String(checkError.code) === '42P17' ||
          checkError.message?.toLowerCase().includes('infinite recursion') ||
          checkError.message?.includes('42P17');
        
        if (isRLSError) {
          console.debug("RLS policy recursion detected when checking existing profile");
          sessionStorage.setItem('rls-recursion-error', 'true');
          return { 
            success: false, 
            error: "Database policy error (infinite recursion). Please fix your RLS policies in Supabase.",
            errorCode: '42P17'
          };
        }
        
        console.error("❌ Error checking existing profile:", checkError);
        console.error("❌ Error code:", checkError.code);
        console.error("❌ Error message:", checkError.message);
        console.error("❌ Full error object:", JSON.stringify(checkError, null, 2));
        
        // Check if error is network-related (blocked by browser/firewall)
        if (checkError.message.includes('Failed to fetch') || 
            checkError.message.includes('NetworkError') ||
            checkError.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) {
          return { 
            success: false, 
            error: `Network Error: Unable to connect to Supabase database. This is usually caused by:\n\n1. Browser Extensions - Disable ad blockers and privacy extensions\n2. Firewall/Network - Your network may be blocking Supabase\n3. Supabase Project - Check if your project is active in Supabase dashboard\n\nPlease try:\n- Disabling browser extensions\n- Using a different network\n- Checking your Supabase project status`,
            errorCode: 'NETWORK_ERROR'
          };
        }
        
        return { 
          success: false, 
          error: `Database connection error: ${checkError.message}. This might be caused by a browser extension (Ad Blocker) or network firewall blocking the request. Please disable browser extensions and try again.`,
          errorCode: checkError.code 
        };
      }
      
      console.log("✅ Existing profile check result:", { existingProfile, checkError });
        
      if (existingProfile) {
        // Check if it's from the same business
        if (existingProfile.business_id === business.id) {
          console.error("❌ Staff creation failed: User already exists in this business");
          return { 
            success: false, 
            error: `This email is already used by ${existingProfile.first_name} ${existingProfile.last_name} (${existingProfile.role}) in your business. Please use a different email address or update the existing staff member.`,
            errorCode: 'USER_EXISTS_SAME_BUSINESS'
          };
        } else {
          console.error("❌ Staff creation failed: User exists in another business");
          return { 
            success: false, 
            error: `This email is already registered with another business in Tillsup. Each email can only belong to one business. Please use a different email address.`,
            errorCode: 'USER_EXISTS_OTHER_BUSINESS'
          };
        }
      }

      console.log("✅ No existing user found, proceeding with creation");
      
      // ═══════════════════════════════════════════════════════════════════
      // TRY EDGE FUNCTION FIRST (if deployed), FALLBACK TO CLIENT-SIDE
      // ════════════════���═══════════════════════════════════════════��══════
      
      // Generate password if not provided
      const staffPassword = password || `Tillsup${Math.random().toString(36).slice(-8)}!`;
      
      // APPROACH 1: Try Edge Function (bypasses browser blocking)
      console.log("🚀 Attempting Edge Function for staff creation...");
      
      let edgeFunctionWorked = false;
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          console.error("❌ No active session found");
          throw new Error("No session");
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/create-staff`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            password: staffPassword,
            firstName: firstName,
            lastName: lastName,
            role: role,
            roleId: roleId,
            branchId: branchId
          })
        });

        const result = await response.json();

        if (result.success) {
          console.log("✅ Staff created successfully via Edge Function");
          edgeFunctionWorked = true;
          return { 
            success: true, 
            credentials: { email: email.toLowerCase(), password: staffPassword }
          };
        } else {
          console.log("⚠️ Edge Function returned error:", result.error);
          throw new Error(result.error || "Edge Function failed");
        }
      } catch (edgeFunctionError: any) {
        // Edge Function is optional - falling back to client-side is expected
        console.log("📱 Edge Function not deployed, using client-side staff creation (this is normal)");
      }
      
      // If Edge Function worked, we already returned above
      if (edgeFunctionWorked) {
        return { success: true };
      }
      
      // APPROACH 2: Client-side creation (fallback)
      console.log("🔑 Creating staff via client-side approach...");
      console.log("📊 Using business_id:", business.id);
      
      // Create temporary Supabase client for staff signup
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: undefined
        }
      });
      
      console.log("🔐 Signing up new staff user...");
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: email.toLowerCase(),
        password: staffPassword,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role,
            business_id: business.id
          },
          emailRedirectTo: undefined
        }
      });
      
      if (authError) {
        console.error("❌ Auth signup error:", authError);
        
        if (authError.message?.includes('Failed to fetch') || 
            authError.message?.includes('NetworkError') ||
            authError.message?.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) {
          return { 
            success: false, 
            error: `Unable to create staff due to network blocking.\n\n` +
                   `This is usually caused by:\n` +
                   `• Browser extensions (ad blockers, privacy tools)\n` +
                   `• Corporate firewall/network restrictions\n\n` +
                   `Solutions:\n` +
                   `1. Disable browser extensions and try again\n` +
                   `2. Try in Incognito/Private mode\n` +
                   `3. Use a different network\n` +
                   `4. Deploy the Edge Function (see EDGE_FUNCTION_DEPLOYMENT.md)`,
            errorCode: 'NETWORK_BLOCKED'
          };
        }
        
        if (authError.message?.includes('User already registered')) {
          return { 
            success: false, 
            error: "This email is already registered. Please use a different email address.",
            errorCode: 'USER_EXISTS'
          };
        }
        
        return { 
          success: false, 
          error: authError.message,
          errorCode: authError.code 
        };
      }
      
      if (!authData.user) {
        console.error("❌ User creation failed - no user data returned");
        return { 
          success: false, 
          error: "Staff creation failed. Email confirmation might be enabled.\n\n" +
                 "Fix in Supabase Dashboard:\n" +
                 "1. Authentication → Providers → Email\n" +
                 "2. Set 'Confirm email' to OFF\n" +
                 "3. Try again",
          errorCode: 'EMAIL_CONFIRMATION_ENABLED'
        };
      }
      
      console.log("✅ Auth user created:", authData.user.id);
      
      // Create profile in database
      const newProfile = {
        id: authData.user.id,
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        role: role,
        role_id: roleId || null,
        business_id: business.id,
        branch_id: branchId || null,
        must_change_password: true,
        created_at: new Date().toISOString()
      };
      
      console.log("💾 Creating profile in database...");
      const { error: profileError } = await supabase
        .from('profiles')
        .insert(newProfile);
      
      if (profileError) {
        // Check for infinite recursion error first
        const isRLSError = 
          profileError.code === '42P17' || 
          String(profileError.code) === '42P17' ||
          profileError.message?.toLowerCase().includes('infinite recursion') ||
          profileError.message?.includes('42P17');
        
        if (isRLSError) {
          console.debug("RLS policy recursion detected during profile creation (expected, using workaround)");
          sessionStorage.setItem('rls-recursion-error', 'true');
          return { 
            success: false, 
            error: `Database policy error (infinite recursion). Please fix your RLS policies in Supabase.`,
            errorCode: profileError.code
          };
        }
        
        // Only log non-RLS errors
        console.error("❌ Profile creation error:", profileError);
        
        return { 
          success: false, 
          error: `Profile creation failed: ${profileError.message}`,
          errorCode: profileError.code
        };
      }
      
      console.log("✅ Staff profile created successfully");
      
      return { 
        success: true, 
        credentials: { 
          email: email.toLowerCase(), 
          password: staffPassword 
        }
      };
      
    } catch (err: any) {
      console.error("❌ Unexpected error in createStaff:", err);
      return { success: false, error: err.message, errorCode: err.code };
    }
  };

  const getStaffMembers = async (): Promise<User[]> => {
    if (!user || !business) {
      console.warn("Cannot get staff members without user or business context.");
      return [];
    }
    
    // PREVIEW MODE: Use mock staff
    if (isPreviewMode()) {
      return mockPreviewStaff;
    }

    try {
      // RBAC: Non-owner staff should only see staff in their branch
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('business_id', business.id);

      if (user && user.role !== 'Business Owner' && user.branchId) {
        query = query.eq('branch_id', user.branchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching staff members:", error);
        return [];
      }

      // Map snake_case to camelCase
      return data.map((profile: any) => ({
        id: profile.id,
        email: profile.email,
        phone: profile.phone_number,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        roleId: profile.role_id,
        businessId: profile.business_id,
        branchId: profile.branch_id,
        mustChangePassword: profile.must_change_password,
        createdAt: new Date(profile.created_at),
        canCreateExpense: profile.can_create_expense,
        salary: profile.salary,
      }));
    } catch (err) {
      console.error("Unexpected error in getStaffMembers:", err);
      return [];
    }
  };

  const updateStaff = async (userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    console.log("📝 Updating staff member:", userId, updates);
    if (!user || !business) return { success: false, error: "Not authenticated" };
    
    try {
      // Map camelCase to snake_case for database
      const dbUpdates: any = {};
      if (updates.firstName) dbUpdates.first_name = updates.firstName;
      if (updates.lastName) dbUpdates.last_name = updates.lastName;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.phone) dbUpdates.phone_number = updates.phone;
      if (updates.role) dbUpdates.role = updates.role;
      if (updates.roleId) dbUpdates.role_id = updates.roleId;
      if (updates.branchId) dbUpdates.branch_id = updates.branchId;
      if (updates.mustChangePassword !== undefined) dbUpdates.must_change_password = updates.mustChangePassword;
      if (updates.canCreateExpense !== undefined) dbUpdates.can_create_expense = updates.canCreateExpense;
      if (updates.salary !== undefined) dbUpdates.salary = updates.salary;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId)
        .eq('business_id', business.id);

      if (error) {
        console.error("❌ Error updating staff:", error);
        return { success: false, error: error.message };
      }

      // Refresh staff members list
      await refreshStaffMembers();
      console.log("✅ Staff member updated successfully");
      return { success: true };
    } catch (err) {
      console.error("❌ Unexpected error updating staff:", err);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const deleteStaff = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    console.log("🗑️ Deleting staff member:", userId);
    if (!user || !business) return { success: false, error: "Not authenticated" };
    
    try {
      // Check permissions
      if (!hasPermission(['Business Owner', 'Manager'])) {
        return { success: false, error: "Insufficient permissions" };
      }

      // Prevent deleting self
      if (userId === user.id) {
        return { success: false, error: "Cannot delete your own account" };
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
        .eq('business_id', business.id);

      if (error) {
        console.error("❌ Error deleting staff:", error);
        return { success: false, error: error.message };
      }

      // Refresh staff members list
      await refreshStaffMembers();
      console.log("✅ Staff member deleted successfully");
      return { success: true };
    } catch (err) {
      console.error("❌ Unexpected error deleting staff:", err);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const resendStaffInvite = async (inviteId: string): Promise<{ success: boolean; error?: string }> => {
    console.log("📧 Resending staff invite:", inviteId);
    if (!user || !business) return { success: false, error: "Not authenticated" };
    
    try {
      // Check permissions
      if (!hasPermission(['Business Owner', 'Manager'])) {
        return { success: false, error: "Insufficient permissions" };
      }

      // Get the invite details
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('id', inviteId)
        .eq('business_id', business.id)
        .single();

      if (inviteError || !invite) {
        console.error("❌ Error fetching invite:", inviteError);
        return { success: false, error: "Invite not found" };
      }

      // Resend the invite email
      const { error: emailError } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: invite.email,
        data: {
          role: invite.role,
          business_id: business.id,
          branch_id: invite.branch_id,
          role_id: invite.role_id
        }
      });

      if (emailError) {
        console.error("❌ Error resending invite:", emailError);
        return { success: false, error: emailError.message };
      }

      console.log("✅ Invite resent successfully");
      return { success: true };
    } catch (err) {
      console.error("❌ Unexpected error resending invite:", err);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const resetStaffPassword = async (userId: string): Promise<{ success: boolean; error?: string; temporaryPassword?: string }> => {
    console.log("🔑 Resetting staff password:", userId);
    if (!user || !business) return { success: false, error: "Not authenticated" };
    
    try {
      // Use the imported password reset utility
      const result = await resetStaffPasswordWithFallback(userId, user, business, hasPermission);
      return result;
    } catch (err) {
      console.error("❌ Unexpected error resetting staff password:", err);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const hasPermission = (requiredRoles: UserRole[], permission?: Permission): boolean => {
    if (!user) return false;
    
    // Check role
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) return false;
    
    // If no specific permission required, role check is sufficient
    if (!permission) return true;
    
    // Check specific permissions based on user role
    // Business Owner has all permissions
    if (user.role === 'Business Owner') return true;
    
    // Manager has most permissions
    if (user.role === 'Manager') {
      const managerPermissions: Permission[] = [
        'staff.create', 'staff.view', 'staff.edit', 'staff.delete',
        'inventory.create', 'inventory.view', 'inventory.edit', 'inventory.delete',
        'pos.access', 'pos.process_sales', 'pos.apply_discounts', 'pos.void_sales',
        'reports.view_sales', 'reports.view_inventory', 'reports.view_expenses', 'reports.view_staff', 'reports.export',
        'settings.view', 'settings.edit_business', 'settings.manage_branches', 'settings.manage_roles'
      ];
      return managerPermissions.includes(permission);
    }
    
    // Other roles have limited permissions
    const rolePermissions: Record<UserRole, Permission[]> = {
      'Business Owner': [], // Handled above
      'Manager': [], // Handled above
      'Cashier': ['pos.access', 'pos.process_sales', 'pos.apply_discounts', 'inventory.view'],
      'Accountant': ['reports.view_sales', 'reports.view_inventory', 'reports.view_expenses', 'reports.export', 'expenses.view'],
      'Staff': ['inventory.view', 'pos.access']
    };
    
    return rolePermissions[user.role]?.includes(permission) || false;
  };

  const refreshStaffMembers = async () => {
    console.log("🔄 Refreshing staff members...");
    if (isLoadingStaff) {
      console.log("⚠️ Staff refresh already in progress, skipping");
      return;
    }
    setIsLoadingStaff(true);
    try {
      const staff = await getStaffMembers();
      setStaffMembers(staff);
      console.log(`✅ Found ${staff.length} staff members.`);
    } catch (error) {
      console.error("Error refreshing staff members:", error);
      toast.error("Could not load staff", {
        description: "There was a problem fetching the staff list.",
      });
    } finally {
      setIsLoadingStaff(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        // AuthState
        user,
        business,
        isAuthenticated: !!user,
        loading,
        schemaError,
        
        // Business Management
        registerBusiness,
        updateBusiness,
        
        // Authentication
        login,
        logout,
        changePassword,
        
        // Profile Management
        updateProfile,
        
        // Staff Management
        createStaff,
        getStaffMembers,
        staffMembers,
        isLoadingStaff,
        refreshStaffMembers,
        updateStaff,
        deleteStaff,
        resendStaffInvite,
        resetStaffPassword,
        
        // Utilities
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

