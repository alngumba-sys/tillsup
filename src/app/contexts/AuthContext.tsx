import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

// ═══════════════════════════════════════════════════════════════════
// MULTI-TENANT AUTH DATA MODELS
// ═══════════════════════════════════════════════════════════════════

export type SubscriptionPlan = "Free Trial" | "Basic" | "Pro" | "Enterprise";
export type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled";

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
// ═══════════════════════════════════════════════════════════════════
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
  // ═══════════════════════════════════════════════════════════════════
  // PERMISSION-BASED ACCESS CONTROL - Expense Management
  // ═══════════════════════════════════════════════════════════════════
  canCreateExpense: boolean;
  // ═══════════════════════════════════════════════════════════════════
  // SALARY INFORMATION (HR Layer - Part 1)
  // ═══════════════════════════════════════════════════════════════════
  salary?: StaffSalary;
}

export interface AuthState {
  user: User | null;
  business: Business | null;
  isAuthenticated: boolean;
  loading: boolean;
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
  createStaff: (email: string, firstName: string, lastName: string, role: UserRole, branchId?: string, roleId?: string) => Promise<{ success: boolean; error?: string; credentials?: { email: string; password: string } }>;
  getStaffMembers: () => Promise<User[]>;
  updateStaff: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteStaff: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetStaffPassword: (userId: string) => Promise<{ success: boolean; error?: string; temporaryPassword?: string }>;
  
  // Utilities
  hasPermission: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════
// AUTH PROVIDER
// ═══════════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const isRegistering = useRef(false);

  // Initialize Supabase Auth Listener
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await refreshUserProfile(session.user);
      } else {
        setLoading(false);
      }

      // Listen for changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await refreshUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setBusiness(null);
          setLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  const refreshUserProfile = async (authUser: any, retryCount = 0) => {
    const userId = authUser.id;
    try {
      // Fetch User Profile from 'profiles' table (mapped to User interface)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // If we get an error other than "Not Found" (which maybeSingle handles by returning null data), handle it.
      if (profileError && profileError.code !== "406" && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
        setLoading(false);
        return;
      }

      // If profileData is null, try to recover or fallback
      if (!profileData) {
        // RETRY MECHANISM:
        if (isRegistering.current) {
            console.log("Registration in progress, ignoring missing profile for now.");
            return;
        }

        if (retryCount < 5) {
          console.log(`Profile not found, retrying... (${retryCount + 1}/5)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return refreshUserProfile(authUser, retryCount + 1);
        }

        console.warn("User is authenticated but has no profile record. Attempting auto-recovery...");

        // AUTO-HEAL STRATEGY: 
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
                 businessId = `BIZ-${Date.now()}`;
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
                     return refreshUserProfile(authUser, 0); 
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
                 // create a temporary placeholder business in state so the UI can render.
                 console.warn("No business found in DB. Using placeholder business state.");
                 
                 const placeholderBusiness: Business = {
                    id: "temp-setup",
                    name: "Complete Setup",
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

      setUser(mappedUser);

      // Fetch Business
      if (mappedUser.businessId) {
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', mappedUser.businessId)
          .single();
          
        if (businessData) {
          const mappedBusiness: Business = {
            id: businessData.id,
            name: businessData.name,
            ownerId: businessData.owner_id || businessData.ownerId,
            createdAt: new Date(businessData.created_at || businessData.createdAt),
            subscriptionPlan: businessData.subscription_plan || businessData.subscriptionPlan || "Free Trial",
            subscriptionStatus: businessData.subscription_status || businessData.subscriptionStatus || "trial",
            trialEndsAt: new Date(businessData.trial_ends_at || businessData.trialEndsAt),
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
          setBusiness(mappedBusiness);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error("Error refreshing user profile:", err);
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────────
  // BUSINESS REGISTRATION
  // ───────────────────────────────────────────────────────────────
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
      const businessId = `BIZ-${Date.now()}`;

      // 2. Create Business Record
      const { data: existingBusiness } = await supabase.from('businesses').select('id').eq('owner_id', userId).maybeSingle();
      
      let finalBusinessId = businessId;
      
      if (!existingBusiness) {
        const newBusiness = {
          id: businessId,
          name: businessName,
          owner_id: userId,
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
          return { success: false, error: "Failed to create business record: " + bizError.message };
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
          return { success: false, error: "Failed to create user profile: " + profileError.message };
        }
      }
      
      isRegistering.current = false;
      await refreshUserProfile(authUser);

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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Provide clearer feedback for invalid credentials
        if (error.message === "Invalid login credentials") {
          return { success: false, error: "Invalid email or password" };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Fetch minimal flags, don't block login if profile missing (let context auto-heal handle it)
        const { data: profile } = await supabase.from('profiles').select('must_change_password, branch_id').eq('id', data.user.id).maybeSingle();
        
        if (profile?.branch_id) {
           const { data: branch } = await supabase.from('branches').select('status').eq('id', profile.branch_id).single();
           if (branch && branch.status === 'inactive') {
             await supabase.auth.signOut();
             return { success: false, error: "Branch deactivated", branchDeactivated: true };
           }
        }

        return { 
          success: true, 
          mustChangePassword: profile?.must_change_password 
        };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    // Optimistically clear state to prevent "bounce back" from protected routes
    setUser(null);
    setBusiness(null);
    await supabase.auth.signOut();
  };

  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      if (user) {
        await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);
        setUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
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

  const createStaff = async (
    email: string, 
    firstName: string, 
    lastName: string, 
    role: UserRole, 
    branchId?: string, 
    roleId?: string
  ): Promise<{ success: boolean; error?: string; credentials?: { email: string; password: string } }> => {
    if (!user || !business) return { success: false, error: "Not authenticated" };
    try {
      return { success: false, error: "Staff creation requires Supabase Admin privileges or Invite flow (not implemented in this frontend-only context)" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const getStaffMembers = async (): Promise<User[]> => {
    if (!business) return [];
    const { data } = await supabase.from('profiles').select('*').eq('business_id', business.id);
    if (!data) return [];
    return data.map((p: any) => ({
      id: p.id,
      email: p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      role: p.role,
      roleId: p.role_id,
      businessId: p.business_id,
      branchId: p.branch_id,
      mustChangePassword: p.must_change_password,
      createdAt: new Date(p.created_at),
      canCreateExpense: p.can_create_expense
    }));
  };

  const updateStaff = async (userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
     return { success: false, error: "Not implemented" };
  };

  const deleteStaff = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     return { success: false, error: "Not implemented" };
  };

  const resetStaffPassword = async (userId: string): Promise<{ success: boolean; error?: string; temporaryPassword?: string }> => {
     return { success: false, error: "Not implemented" };
  };

  const hasPermission = (requiredRoles: UserRole[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      business,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      registerBusiness,
      updateBusiness,
      changePassword,
      updateProfile,
      createStaff,
      getStaffMembers,
      updateStaff,
      deleteStaff,
      resetStaffPassword,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
