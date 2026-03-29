import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Search, UserPlus, Edit, Trash2, Copy, CircleCheck, Building2, KeyRound, AlertCircle, Shield, DollarSign, Mail, Upload, Download, FileSpreadsheet, XCircle } from "lucide-react";
import { useAuth, UserRole, User, SalaryType, PayFrequency, StaffSalary } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";
import { useRole } from "../../contexts/RoleContext";
import { useCurrency } from "../../hooks/useCurrency";
import { useSubscription } from "../../hooks/useSubscription";
import { useBranding } from "../../contexts/BrandingContext";
import { toast } from "sonner";
import { ConfirmationDialog } from "../ConfirmationDialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { SchemaError } from "../../components/inventory/SchemaError";
import { Separator } from "../ui/separator";
import { useNavigate } from "react-router";
import * as XLSX from "xlsx";
import { DatabaseSetupAlert } from "../DatabaseSetupAlert";
import { validateSubscriptionForImport } from "../../utils/subscriptionGuard";

interface StaffManagementTabProps {
  showImportDialog?: boolean;
  setShowImportDialog?: (open: boolean) => void;
  showAddDialog?: boolean;
  setShowAddDialog?: (open: boolean) => void;
}

export function StaffManagementTab({ 
  showImportDialog: externalShowImport, 
  setShowImportDialog: externalSetShowImport,
  showAddDialog: externalShowAdd,
  setShowAddDialog: externalSetShowAdd
}: StaffManagementTabProps = {}) {
  const { user, business, getStaffMembers, createStaff, updateStaff, deleteStaff, resetStaffPassword, resendStaffInvite } = useAuth();
  const { branches, getBranchById } = useBranch();
  const { activeRoles, getRoleById } = useRole();
  const { currencyCode, currencySymbol } = useCurrency();
  const { canCreateStaff, plan, usage, limits } = useSubscription();
  const { assets, loading: brandingLoading } = useBranding();
  const navigate = useNavigate();
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [schemaError, setSchemaError] = useState<any>(null);
  const [databaseSetupError, setDatabaseSetupError] = useState<string | null>(null);

  const hasFetchedStaff = useRef(false);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchStaff = async () => {
      if (hasFetchedStaff.current) return;
      hasFetchedStaff.current = true;
      
      setIsLoadingStaff(true);
      try {
        const members = await getStaffMembers();
        if (isMounted) {
          setStaffMembers(members);
        }
      } catch (error) {
        console.error("Failed to fetch staff members", error);
        if (isMounted) {
          toast.error("Failed to load staff members");
        }
      } finally {
        if (isMounted) {
          setIsLoadingStaff(false);
        }
      }
    };
    
    fetchStaff();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  // ════════════════════════════════════════════════════════���══════════
  // BRANCH FILTER STATE - Source of Truth
  // ═══════════════════════════════════════════════════════════════════
  const [filterBranchId, setFilterBranchId] = useState<string>(() => {
    // Business Owner: Defaults to "ALL_BRANCHES"
    // Manager: Auto-locked to their assigned branch
    if (user?.role === "Business Owner") {
      return "ALL_BRANCHES";
    } else if (user?.branchId) {
      return user.branchId;
    }
    return "ALL_BRANCHES";
  });
  
  const [isAddDialogOpenInternal, setIsAddDialogOpenInternal] = useState(false);
  const isAddDialogOpen = externalShowAdd ?? isAddDialogOpenInternal;
  const setIsAddDialogOpen = externalSetShowAdd ?? setIsAddDialogOpenInternal;
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; staffId: string; staffName: string; staffRole: string } | null>(null);
  const [resendInviteConfirmation, setResendInviteConfirmation] = useState<{ isOpen: boolean; staffId: string; staffName: string } | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════
  // PASSWORD RESET - Two-step process: Confirmation → Execution
  // ═══════════════════════════════════════════════════════════════════
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState<{ isOpen: boolean; staffId: string; staffName: string } | null>(null);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ isOpen: boolean; staffId: string; staffName: string; temporaryPassword: string } | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // EXCEL IMPORT STATE
  // ═══════════════════════════════════════════════════════════════════
  const [isImportDialogOpenInternal, setIsImportDialogOpenInternal] = useState(false);
  const isImportDialogOpen = externalShowImport ?? isImportDialogOpenInternal;
  const setIsImportDialogOpen = externalSetShowImport ?? setIsImportDialogOpenInternal;
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importValidation, setImportValidation] = useState<{
    errors: string[];
    warnings: string[];
    success: string[];
    totalRows: number;
  } | null>(null);

  const [createMode, setCreateMode] = useState<'invite' | 'password'>('invite');
  const [noEmail, setNoEmail] = useState(false);
  const [manualPassword, setManualPassword] = useState("");
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [username, setUsername] = useState("");
  const [isDebugging, setIsDebugging] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "Cashier" as UserRole,
    roleId: "", // Store the UUID of the role
    branchId: "", // Add branch assignment
    // ═══════════════════════════════════════════════════════════════════
    // COMPENSATION (HR DATA) - Optional but recommended
    // ═══════════════��═══════════════════════════════════════════════════
    salaryEnabled: false,
    salaryType: "monthly" as SalaryType,
    baseSalary: "",
    payFrequency: "monthly" as PayFrequency,
    effectiveFrom: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
  });

  // ══════════════════════════════════��════════════════════════════════
  // ROLE-BASED BRANCH FILTERING
  // ══════════════════════════════════════════════════════════════════
  // Get available branches based on user role
  const availableBranches = user?.role === "Business Owner" 
    ? branches.filter(b => b.businessId === business?.id && b.status === "active")
    : branches.filter(b => b.id === user?.branchId && b.status === "active");

  const filteredStaff = staffMembers.filter((member) => {
    const matchesSearch =
      member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "All" || member.role === filterRole;
    const matchesBranch = filterBranchId === "ALL_BRANCHES" || member.branchId === filterBranchId;
    return matchesSearch && matchesRole && matchesBranch;
  });

  const handleAddStaff = async () => {
    // ══════════════════════��════════════════════════════════���═══════════
    // BRANCH VALIDATION
    // ═══════════════════════════════════════════════════════════════════
    let finalEmail = formData.email;
    let finalPassword: string | undefined = undefined;

    if (createMode === 'password') {
       if (noEmail) {
         if (!username.trim()) {
            toast.error("Username is required");
            return;
         }
         const normalizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
         finalEmail = `${normalizedUsername || 'staff'}@noemail.tillsup.com`;
       } else {
         if (!formData.email.trim() || !formData.email.includes("@")) {
            toast.error("Valid email is required");
            return;
         }
       }

       if (autoGeneratePassword) {
          // Use a simpler, easy-to-share numeric temporary code (6 digits)
          finalPassword = String(Math.floor(100000 + Math.random() * 900000));
       } else {
          if (!manualPassword || manualPassword.length < 4) {
             toast.error("Password must be at least 4 characters");
             return;
          }
          finalPassword = manualPassword;
       }
    } else {
       if (!formData.email.trim() || !formData.email.includes("@")) {
          toast.error("Valid email is required");
          return;
       }
    }

    if (!formData.branchId) {
      toast.error("Branch assignment is required");
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SALARY VALIDATION (if enabled)
    // ═══════════════════════════════════════════════════════════════════
    if (formData.salaryEnabled) {
      if (!formData.baseSalary || parseFloat(formData.baseSalary) <= 0) {
        toast.error("Base salary must be greater than 0");
        return;
      }
    }

    setIsLoadingStaff(true);
    try {
      console.log("🚀 Starting staff creation process...");
      console.log("📧 Email:", finalEmail);
      console.log("👤 Name:", formData.firstName, formData.lastName);
      console.log("🎭 Role:", formData.role);
      console.log("🏢 Branch ID:", formData.branchId);
      console.log("🔐 Password mode:", finalPassword ? "YES" : "NO (invite)");
      
      const result = await createStaff(
        finalEmail,
        formData.firstName,
        formData.lastName,
        formData.role,
        formData.branchId,
        formData.roleId || undefined,
        finalPassword
      );

      console.log("📊 createStaff result:", result);
      
      // Handle undefined result (should never happen, but added for safety)
      if (!result) {
        console.error("❌ createStaff returned undefined result");
        toast.error("Staff creation failed", {
          description: "No response from server. Please try again.",
          duration: 5000
        });
        return;
      }

      if (result.success) {
        console.log("✅ Staff creation successful!");
        if (result.credentials) {
           // ════════════════════���══════════════════════════════════════════════
           // CREDENTIALS FLOW (Admin API)
           // ═══════════════════════════════════���═══════════════════════════════
           if (formData.salaryEnabled) {
              const updatedStaffMembers = await getStaffMembers();
              setStaffMembers(updatedStaffMembers);
              const newStaff = updatedStaffMembers.find(s => s.email === finalEmail);
              if (newStaff) {
                const salary: StaffSalary = {
                  salaryType: formData.salaryType,
                  baseSalary: parseFloat(formData.baseSalary),
                  currency: currencyCode,
                  payFrequency: formData.payFrequency,
                  effectiveFrom: new Date(formData.effectiveFrom),
                  lastUpdated: new Date(),
                  updatedBy: user?.id,
                };
                await updateStaff(newStaff.id, { salary });
              }
           } else {
               const updatedStaffMembers = await getStaffMembers();
               setStaffMembers(updatedStaffMembers);
           }
           setGeneratedCredentials(result.credentials);
           toast.success("Staff member created successfully!");
        } else {
           // ══════════════════════════════════════════════���════════════════════
           // INVITE FLOW (Frontend/Supabase)
           // ═══════════════════════════════════════════════════════════════════
           setIsAddDialogOpen(false);
           resetForm();
           
           if (formData.salaryEnabled) {
               toast.success("Staff invitation sent!", {
                 description: "Note: Salary details can be added after the staff member signs up."
               });
           } else {
               toast.success("Staff invitation sent successfully!", {
                 description: "Ask the staff member to sign up with this email."
               });
           }
           
           // Refresh list (might not show new user unless we update getStaffMembers)
           const updatedStaffMembers = await getStaffMembers();
           setStaffMembers(updatedStaffMembers);
        }
      } else {
        // Handle error cases - only log if there's actual content
        if (result.error) {
          console.error("❌ Staff creation failed");
          console.error("❌ Error:", result.error);
        }
        if (result.errorCode) {
          console.error("❌ Error code:", result.errorCode);
        }
        
        // Handle specific error codes
        if (result.errorCode === 'NETWORK_ERROR' || result.errorCode === 'NETWORK_BLOCKED') {
            // Network/Connection Error (includes proxy/WebSocket issues)
            toast.error("Network Connection Error", {
              description: "Unable to connect to Supabase. This may be caused by browser extensions, firewall, or network restrictions. Please check the 'Connection Test' tab for troubleshooting steps.",
              duration: 10000
            });
        } else if (result.errorCode === 'USER_EXISTS_SAME_BUSINESS') {
            // User already exists in this business
            toast.error("Email Already in Use", {
              description: result.error,
              duration: 6000
            });
        } else if (result.errorCode === 'USER_EXISTS_OTHER_BUSINESS' || result.errorCode === 'USER_EXISTS') {
            // User exists in another business
            toast.error("Email Already Registered", {
              description: result.error,
              duration: 6000
            });
        } else if (result.errorCode || result.error?.includes("staff_invites")) {
            // Schema Error
            setSchemaError({ code: result.errorCode || 'PGRST204', message: result.error });
            toast.error("Database Schema Error: Missing Table");
        } else if (result.errorCode === '42501') {
            // RLS Policy Error
            toast.error("Permission Error", {
              description: result.error || "Please run the FIX_RLS_FINAL.sql script to fix database permissions."
            });
        } else if (result.error?.includes('infinite recursion')) {
            // Infinite Recursion Error
            toast.error("RLS Policy Error: Infinite Recursion", {
              description: "Your Supabase profiles table has circular dependencies in RLS policies. Please run the FIX_INFINITE_RECURSION.sql script in your Supabase SQL Editor."
            });
        } else if (result.error?.includes('Failed to fetch') || result.error?.includes('NetworkError')) {
            // Catch additional network errors that might not have specific error codes
            toast.error("Connection Failed", {
              description: "Unable to reach Supabase. Please check your internet connection and disable browser extensions that might block requests.",
              duration: 10000
            });
        } else {
            // Generic error - always show something to the user
            toast.error("Failed to Create Staff", {
              description: result.error || "An unknown error occurred. Please try again or check the console for details.",
              duration: 6000
            });
        }
      }
    } catch (error: any) {
       console.error("💥 Unexpected error in handleAddStaff:", error);
       
       // Provide detailed error message
       const errorMessage = error?.message || String(error) || "Unknown error";
       toast.error("Unexpected Error", {
         description: errorMessage.includes('fetch') || errorMessage.includes('network')
           ? "Network error occurred. Please check your connection and try again."
           : errorMessage.substring(0, 200), // Limit error message length
         duration: 8000
       });
    } finally {
       setIsLoadingStaff(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // DEBUG VERSION - Logs timing and errors for each step
  // ═══════════════════════════════════════════════════════════════════
  const handleAddStaffDebug = async () => {
    console.clear(); // Clear console for clean debug output
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🐛 DEBUG: Starting staff creation flow");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.time("⏱️  TOTAL_STAFF_CREATION_TIME");
    
    const debugLog = (step: string, data?: any) => {
      console.log(`\n${"═".repeat(60)}`);
      console.log(`📍 STEP: ${step}`);
      if (data) console.log("📊 Data:", data);
      console.log(`${"═".repeat(60)}\n`);
    };

    try {
      // ═══════════════════════════════════════════════════════════════════
      // STEP 1: Validation & State Preparation
      // ═══════════════════════════════════════════════════════════════════
      console.time("⏱️  1_VALIDATION");
      debugLog("1. VALIDATION & STATE CHECKS", {
        createMode,
        noEmail,
        autoGeneratePassword,
        username,
        formData: { ...formData, email: formData.email || '(empty)' }
      });

      let finalEmail = formData.email;
      let finalPassword: string | undefined = undefined;

      if (createMode === 'password') {
         if (noEmail) {
           if (!username.trim()) {
              console.error("❌ Validation failed: Username is required");
              toast.error("Username is required");
              console.timeEnd("⏱️  1_VALIDATION");
              console.timeEnd("⏱️  TOTAL_STAFF_CREATION_TIME");
              return;
           }
           finalEmail = `${username.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@no-email.tillsup.com`;
           console.log("✅ Generated no-email address:", finalEmail);
         } else {
           if (!formData.email.trim() || !formData.email.includes("@")) {
              console.error("❌ Validation failed: Valid email is required");
              toast.error("Valid email is required");
              console.timeEnd("⏱️  1_VALIDATION");
              console.timeEnd("⏱️  TOTAL_STAFF_CREATION_TIME");
              return;
           }
         }

         if (autoGeneratePassword) {
            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let retVal = "";
            for (let i = 0, n = charset.length; i < 5; ++i) {
                retVal += charset.charAt(Math.floor(Math.random() * n));
            }
            finalPassword = retVal;
            console.log("✅ Auto-generated password (5 chars, alphanumeric)");
         } else {
            if (!manualPassword || manualPassword.length < 5) {
               console.error("❌ Validation failed: Password must be at least 5 characters");
               toast.error("Password must be at least 5 characters");
               console.timeEnd("⏱️  1_VALIDATION");
               console.timeEnd("⏱️  TOTAL_STAFF_CREATION_TIME");
               return;
            }
            finalPassword = manualPassword;
            console.log("✅ Using manual password");
         }
      } else {
         if (!formData.email.trim() || !formData.email.includes("@")) {
            console.error("❌ Validation failed: Valid email is required for invite mode");
            toast.error("Valid email is required");
            console.timeEnd("⏱️  1_VALIDATION");
            console.timeEnd("⏱️  TOTAL_STAFF_CREATION_TIME");
            return;
         }
      }

      if (!formData.branchId) {
        console.error("❌ Validation failed: Branch assignment is required");
        toast.error("Branch assignment is required");
        console.timeEnd("⏱️  1_VALIDATION");
        console.timeEnd("⏱️  TOTAL_STAFF_CREATION_TIME");
        return;
      }

      if (formData.salaryEnabled) {
        if (!formData.baseSalary || parseFloat(formData.baseSalary) <= 0) {
          console.error("❌ Validation failed: Base salary must be greater than 0");
          toast.error("Base salary must be greater than 0");
          console.timeEnd("⏱️  1_VALIDATION");
          console.timeEnd("⏱️  TOTAL_STAFF_CREATION_TIME");
          return;
        }
      }

      console.log("✅ All validations passed");
      console.timeEnd("⏱️  1_VALIDATION");

      // ═══════════════════════════════════════════════════════════════════
      // STEP 2: Set Loading State
      // ═══════════════════════════════════════════════════════════════════
      console.time("⏱️  2_SET_LOADING");
      debugLog("2. SETTING LOADING STATE");
      setIsLoadingStaff(true);
      console.log("✅ Loading state set to true");
      console.timeEnd("⏱️  2_SET_LOADING");

      // ═══════════════════════════════════════════════════════════════════
      // STEP 3: Call createStaff API
      // ═══════════════════════════════════════════════════════════════════
      console.time("⏱️  3_CREATE_STAFF_API");
      debugLog("3. CALLING createStaff API", {
        email: finalEmail,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        branchId: formData.branchId,
        hasPassword: !!finalPassword
      });

      const result = await createStaff(
        finalEmail,
        formData.firstName,
        formData.lastName,
        formData.role,
        formData.branchId,
        formData.roleId || undefined,
        finalPassword
      );

      console.timeEnd("⏱️  3_CREATE_STAFF_API");
      debugLog("4. createStaff RESULT", result);

      // Handle result (same logic as original handleAddStaff)
      if (!result) {
        console.error("❌ createStaff returned undefined");
        toast.error("Staff creation failed - No response");
        return;
      }

      if (result.success) {
        console.log("✅ SUCCESS!");
        if (result.credentials) {
          console.time("⏱️  5_POST_SUCCESS_CREDENTIALS");
          if (formData.salaryEnabled) {
            const updatedStaffMembers = await getStaffMembers();
            setStaffMembers(updatedStaffMembers);
            const newStaff = updatedStaffMembers.find(s => s.email === finalEmail);
            if (newStaff) {
              const salary: StaffSalary = {
                salaryType: formData.salaryType,
                baseSalary: parseFloat(formData.baseSalary),
                currency: currencyCode,
                payFrequency: formData.payFrequency,
                effectiveFrom: new Date(formData.effectiveFrom),
                lastUpdated: new Date(),
                updatedBy: user?.id,
              };
              await updateStaff(newStaff.id, { salary });
            }
          } else {
            const updatedStaffMembers = await getStaffMembers();
            setStaffMembers(updatedStaffMembers);
          }
          setGeneratedCredentials(result.credentials);
          toast.success("Staff member created successfully!");
          console.timeEnd("⏱️  5_POST_SUCCESS_CREDENTIALS");
        } else {
          console.time("⏱️  5_POST_SUCCESS_INVITE");
          setIsAddDialogOpen(false);
          resetForm();
          toast.success("Staff invitation sent successfully!");
          const updatedStaffMembers = await getStaffMembers();
          setStaffMembers(updatedStaffMembers);
          console.timeEnd("⏱️  5_POST_SUCCESS_INVITE");
        }
      } else {
        console.error("❌ FAILED:", result.error, result.errorCode);
        // Show same errors as original
        if (result.errorCode === 'NETWORK_ERROR' || result.errorCode === 'NETWORK_BLOCKED') {
          toast.error("Network Connection Error", {
            description: "Unable to connect to Supabase.",
            duration: 10000
          });
        } else {
          toast.error("Failed to Create Staff", {
            description: result.error || "Unknown error",
            duration: 6000
          });
        }
      }

    } catch (error: any) {
      console.error("💥 EXCEPTION:");
      console.error("Type:", error?.constructor?.name);
      console.error("Message:", error?.message);
      console.error("Stack:", error?.stack);
      console.error("Full:", error);
      
      toast.error("Unexpected Error (Debug)", {
        description: error?.message || "Check console",
        duration: 8000
      });
    } finally {
      setIsLoadingStaff(false);
      console.timeEnd("⏱️  TOTAL_STAFF_CREATION_TIME");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      toast.info("Debug Complete - Check console for timing details", {
        duration: 5000
      });
    }
  };

  const handleEditStaff = async () => {
    if (editingMember) {
      // ═══════════════════���══════════════════════════════════════════════
      // BRANCH VALIDATION
      // ═══════════════════════════════════════════════════════════════════
      if (!formData.branchId) {
        toast.error("Branch assignment is required");
        return;
      }

      // ═══════════════════════════════════════════════════════════════════
      // SALARY VALIDATION (if enabled)
      // ══════════════════════════════════���════════════════════════��═══════
      if (formData.salaryEnabled) {
        if (!formData.baseSalary || parseFloat(formData.baseSalary) <= 0) {
          toast.error("Base salary must be greater than 0");
          return;
        }
      }

      // Prepare salary data
      setIsLoadingStaff(true);
      try {
        let salary: StaffSalary | undefined = undefined;
        if (formData.salaryEnabled) {
          salary = {
            salaryType: formData.salaryType,
            baseSalary: parseFloat(formData.baseSalary),
            currency: currencyCode,
            payFrequency: formData.payFrequency,
            effectiveFrom: new Date(formData.effectiveFrom),
            // Preserve salary history
            previousSalary: editingMember.salary?.baseSalary,
            lastUpdated: new Date(),
            updatedBy: user?.id,
          };
        }

        const result = await updateStaff(editingMember.id, {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          roleId: formData.roleId || undefined,
          branchId: formData.branchId,
          salary, // Include salary in updates
        });

        if (result.success) {
          setEditingMember(null);
          setIsAddDialogOpen(false);
          resetForm();

          // Refresh list
          const updatedStaffMembers = await getStaffMembers();
          setStaffMembers(updatedStaffMembers);

          toast.success("Staff member updated successfully!");
        } else {
          toast.error(result.error || "Failed to update staff member");
        }
      } catch (error) {
        toast.error("An unexpected error occurred");
      } finally {
        setIsLoadingStaff(false);
      }
    }
  };

  const handleDelete = (staffId: string, staffName: string, staffRole: string) => {
    setDeleteConfirmation({ isOpen: true, staffId, staffName, staffRole });
  };

  const handleResetPassword = (staffId: string, staffName: string) => {
    setResetPasswordConfirmation({ isOpen: true, staffId, staffName });
  };

  const handleResendInvite = (staffId: string, staffName: string) => {
    setResendInviteConfirmation({ isOpen: true, staffId, staffName });
  };

  const openEditDialog = (member: User) => {
    setEditingMember(member);
    
    // Populate salary data if it exists
    const hasSalary = !!member.salary;
    const effectiveDate = member.salary?.effectiveFrom 
      ? new Date(member.salary.effectiveFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setFormData({
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      roleId: member.roleId || "",
      branchId: member.branchId || "",
      // Populate salary data
      salaryEnabled: hasSalary,
      salaryType: member.salary?.salaryType || "monthly",
      baseSalary: member.salary?.baseSalary?.toString() || "",
      payFrequency: member.salary?.payFrequency || "monthly",
      effectiveFrom: effectiveDate,
    });
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      role: "Cashier",
      roleId: "",
      branchId: "",
      // Reset salary fields
      salaryEnabled: false,
      salaryType: "monthly",
      baseSalary: "",
      payFrequency: "monthly",
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
    setCreateMode('invite');
    setNoEmail(false);
    setManualPassword("");
    setAutoGeneratePassword(true);
    setUsername("");
    setGeneratedCredentials(null);
  };

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
    setEditingMember(null);
    resetForm();
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      "Business Owner": "default",
      "Manager": "default",
      "Cashier": "secondary",
      "Accountant": "outline",
      "Staff": "outline"
    };
    return variants[role] || "outline";
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  };

  const copyToClipboard = async (text: string, inputRef?: HTMLInputElement) => {
    // Enhanced copy method specifically for restricted environments (like Figma)
    // This prioritizes selecting the actual input field which works better than programmatic copying
    
    // Method 1: If we have a reference to the input, select it directly (most reliable in restricted environments)
    if (inputRef) {
      try {
        inputRef.focus();
        inputRef.select();
        inputRef.setSelectionRange(0, inputRef.value.length);
        
        // Try to copy the selection
        const successful = document.execCommand('copy');
        if (successful) {
          toast.success("Copied to clipboard!", {
            description: "Password copied successfully"
          });
          return;
        }
      } catch (err) {
        console.log("Direct input copy failed:", err);
      }
    }
    
    // Method 2: Try modern Clipboard API (works in secure contexts)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!", {
          description: "Password copied successfully"
        });
        return;
      } catch (err) {
        console.log("Clipboard API blocked, trying fallback method...");
      }
    }
    
    // Method 3: Fallback to execCommand with textarea (works in more environments)
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Make invisible but functional
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      
      // iOS Safari compatibility
      if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        textArea.setSelectionRange(0, text.length);
      } else {
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);
      }
      
      // Try to copy
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success("Copied to clipboard!", {
          description: "Password copied successfully"
        });
        return;
      }
    } catch (err) {
      console.log("execCommand failed:", err);
    }
    
    // Method 4: If all else fails, show a helpful message (never show error)
    toast.warning("Please copy manually", {
      description: "Click the password field and press Ctrl+C (or Cmd+C on Mac)"
    });
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    // Legacy function - now redirects to improved copyToClipboard
    copyToClipboard(text);
  };

  const activeStaff = staffMembers.filter(m => !m.mustChangePassword).length;
  const pendingStaff = staffMembers.filter(m => m.mustChangePassword).length;
  const managers = staffMembers.filter(m => m.role === "Manager").length;

  const handleOpenAddDialog = () => {
    if (!canCreateStaff()) {
      toast.error("Staff Limit Reached", {
        description: `Your ${plan.name} plan is limited to ${limits.maxStaff} staff members. Please upgrade to add more.`
      });
      return;
    }
    resetForm();
    setEditingMember(null);
    setIsAddDialogOpen(true);
  };

  // ═══════════════════════════════════════════════════════════════════
  // EXCEL IMPORT FUNCTIONS
  // ══════════════════════════════════════════════════════════════════��
  const downloadStaffImportTemplate = () => {
    const templateData = [
      {
        "Full Name": "John Doe",
        "Email": "john@example.com",
        "Phone Number": "0712345678",
        "Role": "Manager",
        "Branch Name": "Thika"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Style the header row (bold, light gray background)
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "F0F0F0" } }
    };

    // Apply header styling
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = headerStyle;
    }

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Full Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone Number
      { wch: 15 }, // Role
      { wch: 20 }  // Branch Name
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff Template");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_import_template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded successfully");
  };

  const handleStaffImportFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportValidation(null);
    }
  };

  const validateAndImportStaff = async () => {
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

      // Find header row
      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length > 0 && row.includes("Full Name")) {
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

      // Create header map
      const headerMap: Record<string, number> = {};
      headers.forEach((header: string, index: number) => {
        if (header) headerMap[header.trim()] = index;
      });

      // Validate required headers
      const requiredHeaders = ["Full Name", "Email"];
      for (const reqHeader of requiredHeaders) {
        if (!(reqHeader in headerMap)) {
          errors.push(`Missing required column: ${reqHeader}`);
        }
      }

      if (errors.length > 0) {
        setImportValidation({ errors, warnings, success, totalRows: 0 });
        setIsProcessingImport(false);
        return;
      }

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = headerRowIndex + i + 2;

        try {
          const fullName = String(row[headerMap["Full Name"]] ?? '').trim();
          const email = String(row[headerMap["Email"]] ?? '').trim().toLowerCase();
          const phoneNumber = String(row[headerMap["Phone Number"]] ?? '').trim();
          const role = String(row[headerMap["Role"]] ?? '').trim();
          const branchName = row[headerMap["Branch Name"]]?.toString().trim() || "";

          // Validation
          if (!fullName) {
            errors.push(`Row ${rowNum}: Full name is required`);
            continue;
          }

          // Split full name into first and last name
          const nameParts = fullName.split(' ').filter(part => part.trim() !== '');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          if (!firstName) {
            errors.push(`Row ${rowNum}: First name is required`);
            continue;
          }

          if (!email) {
            errors.push(`Row ${rowNum}: Email is required`);
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push(`Row ${rowNum}: Invalid email format`);
            continue;
          }

          // Check for existing staff with same email
          const existingStaff = staffMembers.find(s => s.email.toLowerCase() === email);
          if (existingStaff) {
            warnings.push(`Row ${rowNum}: Staff with email "${email}" already exists, skipped`);
            continue;
          }

          // Find branch ID
          let branchId = "";
          if (branchName) {
            const branch = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase() && b.status === "active");
            if (branch) {
              branchId = branch.id;
            } else {
              warnings.push(`Row ${rowNum}: Branch "${branchName}" not found, using default`);
            }
          }

          // If no branch found, use user's branch or first available branch
          if (!branchId) {
            if (user?.branchId) {
              branchId = user.branchId;
            } else if (branches.length > 0) {
              const activeBranches = branches.filter(b => b.status === "active");
              if (activeBranches.length > 0) {
                branchId = activeBranches[0].id;
              }
            }
          }

          // Validate role
          const validRoles: UserRole[] = ["Cashier", "Manager", "Business Owner"];
          const staffRole = validRoles.includes(role as UserRole) ? (role as UserRole) : "Cashier";
          if (role && !validRoles.includes(role as UserRole)) {
            warnings.push(`Row ${rowNum}: Invalid role "${role}", defaulting to Cashier`);
          }

          // Create staff
          const result = await createStaff(email, firstName, lastName, staffRole, branchId || business?.id);

          if (result.success) {
            // Add salary if provided
            if (salaryType && baseSalary) {
              const validSalaryTypes: SalaryType[] = ["monthly", "hourly", "daily", "weekly"];
              if (validSalaryTypes.includes(salaryType as SalaryType)) {
                // Find the created staff to update with salary
                try {
                  const updatedStaffMembers = await getStaffMembers();
                  const newStaff = updatedStaffMembers.find(s => s.email.toLowerCase() === email);
                  if (newStaff) {
                    const salary: StaffSalary = {
                      salaryType: salaryType as SalaryType,
                      baseSalary: parseFloat(baseSalary),
                      currency: currencyCode,
                      payFrequency: (salaryType === "monthly" ? "monthly" : "weekly") as PayFrequency,
                      effectiveFrom: new Date(),
                      lastUpdated: new Date(),
                      updatedBy: user?.id,
                    };
                    await updateStaff(newStaff.id, { salary });
                  }
                } catch (salaryError) {
                  console.error("Error updating salary:", salaryError);
                  warnings.push(`Row ${rowNum}: Staff created but salary update failed`);
                }
              }
            }
            success.push(`Row ${rowNum}: Created staff "${firstName} ${lastName}"`);
          } else {
            errors.push(`Row ${rowNum}: ${result.error || "Failed to create staff"}`);
          }
        } catch (error) {
          console.error(`Error processing row ${rowNum}:`, error);
          errors.push(`Row ${rowNum}: Failed to process row`);
        }
      }

      // Refresh staff list
      try {
        const members = await getStaffMembers();
        setStaffMembers(members);
      } catch (refreshError) {
        console.error("Error refreshing staff list:", refreshError);
      }

      setImportValidation({ errors, warnings, success, totalRows: dataRows.length });

      if (errors.length === 0 && (success.length > 0 || warnings.length > 0)) {
        toast.success(`Successfully processed ${success.length} staff members`);
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
    <div className="space-y-6">
      {/* Header - buttons now in parent Staff.tsx header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Manage your team members and their roles ({staffMembers.length}/{limits.maxStaff === 999 ? "Unlimited" : limits.maxStaff})</p>
      </div>

      {/* Import Excel Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          setImportFile(null);
          setImportValidation(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Staff from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file to bulk import staff members
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
                  <Button size="sm" onClick={downloadStaffImportTemplate} className="flex items-center gap-2 bg-[#00719C] hover:bg-[#005d81] text-white">
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
                onChange={handleStaffImportFileUpload}
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
                    <li>Required columns: First Name, Last Name, Email</li>
                    <li>Optional columns: Role, Branch, Salary Type, Base Salary</li>
                    <li>Valid roles: Cashier, Manager, Business Owner</li>
                    <li>Existing staff (by email) will be skipped</li>
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
              onClick={validateAndImportStaff}
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
                  Import Staff
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { 
        if (!open) closeAddDialog();
        else handleOpenAddDialog();
      }}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "Edit Staff Member" : "Add New Staff Member"}
              </DialogTitle>
              <DialogDescription>
                {editingMember 
                  ? "Update the details of the staff member." 
                  : "Enter the details of the new team member. Default credentials will be generated."}
              </DialogDescription>
            </DialogHeader>

            {/* ═══════════════════════════════════════════════════════════════════
                SCROLLABLE CONTENT AREA
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="overflow-y-auto overflow-x-hidden flex-1 px-1">
              {schemaError && <div className="mb-4"><SchemaError error={schemaError} /></div>}
              {generatedCredentials ? (
                <div className="space-y-4 py-4">
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CircleCheck className="w-4 h-4 text-green-600" />
                      <p className="font-semibold text-green-900">Staff member created successfully!</p>
                    </div>
                    <p className="text-sm text-green-700">
                      Please share these credentials with the new staff member.
                    </p>
                  </div>

                  <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          id="new-staff-email-input"
                          value={generatedCredentials.email} 
                          readOnly 
                          className="font-mono text-sm cursor-pointer select-all"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => {
                            const input = document.getElementById('new-staff-email-input') as HTMLInputElement;
                            copyToClipboard(generatedCredentials.email, input);
                          }}
                          className="shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          id="new-staff-password-input"
                          value={generatedCredentials.password} 
                          readOnly 
                          className="font-mono text-lg font-bold cursor-pointer select-all bg-white border-2 border-primary/20"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => {
                            const input = document.getElementById('new-staff-password-input') as HTMLInputElement;
                            copyToClipboard(generatedCredentials.password, input);
                          }}
                          className="shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ The staff member will be required to change their password on first login.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 py-4">
                  {/* ACCESS METHOD TOGGLE */}
                  {!editingMember && (
                    <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-lg border">
                       <Label className="text-xs font-semibold uppercase text-muted-foreground">Access Method</Label>
                       <div className="flex items-center gap-6">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="radio" 
                              id="mode-invite" 
                              checked={createMode === 'invite'} 
                              onChange={() => setCreateMode('invite')}
                              className="accent-primary w-4 h-4"
                            />
                            <Label htmlFor="mode-invite" className="cursor-pointer font-normal">Send Invite via Email</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="radio" 
                              id="mode-password" 
                              checked={createMode === 'password'} 
                              onChange={() => setCreateMode('password')}
                              className="accent-primary w-4 h-4"
                            />
                            <Label htmlFor="mode-password" className="cursor-pointer font-normal">Create Password Now</Label>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="staff-firstName">First Name</Label>
                      <Input
                        id="staff-firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="John"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="staff-lastName">Last Name</Label>
                      <Input
                        id="staff-lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  {createMode === 'password' && !editingMember ? (
                     <div className="space-y-4 border rounded-md p-3">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="no-email" 
                            checked={noEmail} 
                            onChange={(e) => setNoEmail(e.target.checked)}
                            className="accent-primary w-4 h-4 rounded"
                          />
                          <Label htmlFor="no-email" className="text-sm font-normal cursor-pointer">
                             Staff member does not have an email address
                          </Label>
                        </div>

                        {noEmail ? (
                           <div className="grid gap-2 pl-6">
                             <Label htmlFor="staff-username">Username</Label>
                             <div className="flex">
                                <Input
                                  id="staff-username"
                                  value={username}
                                  onChange={(e) => setUsername(e.target.value)}
                                  placeholder="john.doe"
                                  className="rounded-r-none"
                                />
                                <div className="bg-muted px-3 flex items-center border border-l-0 rounded-r-md text-sm text-muted-foreground whitespace-nowrap">
                                  @no-email.tillsup.com
                                </div>
                             </div>
                             <p className="text-xs text-muted-foreground">System-generated email for login purposes.</p>
                           </div>
                        ) : (
                           <div className="grid gap-2 pl-6">
                             <Label htmlFor="staff-email-manual">Email</Label>
                             <Input
                               id="staff-email-manual"
                               type="email"
                               value={formData.email}
                               onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                               placeholder="email@example.com"
                             />
                           </div>
                        )}

                        <div className="space-y-3 pt-2 border-t">
                           <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id="auto-gen" 
                                checked={autoGeneratePassword} 
                                onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                                className="accent-primary w-4 h-4 rounded"
                              />
                              <Label htmlFor="auto-gen" className="text-sm font-normal cursor-pointer">
                                 Auto-generate password (6-digit code)
                              </Label>
                           </div>

                           {!autoGeneratePassword && (
                              <div className="grid gap-2 pl-6">
                                <Label htmlFor="manual-password">Password</Label>
                                <Input
                                  id="manual-password"
                                  type="text"
                                  value={manualPassword}
                                  onChange={(e) => setManualPassword(e.target.value)}
                                  placeholder="Enter password"
                                />
                              </div>
                           )}
                        </div>
                     </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor="staff-email">Email</Label>
                      <Input
                        id="staff-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        disabled={!!editingMember}
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="staff-role">Role</Label>
                    <Select 
                      value={formData.roleId || formData.role} 
                      onValueChange={(value) => {
                        // Value could be Name (legacy) or ID (new)
                        const selectedRole = activeRoles.find(r => r.id === value || r.name === value);
                        if (selectedRole) {
                          setFormData({ 
                            ...formData, 
                            role: selectedRole.name as UserRole,
                            roleId: selectedRole.id 
                          });
                        } else {
                          setFormData({ ...formData, role: value as UserRole });
                        }
                      }}
                    >
                      <SelectTrigger id="staff-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeRoles.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No roles available
                          </div>
                        ) : (
                          activeRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="staff-branch">Branch</Label>
                    {availableBranches.length === 0 ? (
                      <div className="space-y-2">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No branches available. Please create a branch first before adding staff.
                          </AlertDescription>
                        </Alert>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => navigate('/branches')}
                          className="w-full"
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Go to Branch Management
                        </Button>
                      </div>
                    ) : (
                      <Select value={formData.branchId} onValueChange={(value) => setFormData({ ...formData, branchId: value })}>
                        <SelectTrigger id="staff-branch">
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* ═══════════════════════════════════════════════════════════════════
                      COMPENSATION SECTION (HR DATA)
                      Only Business Owner and Manager can set salary
                      ═══════════════════════════════════════════════════════════════════ */}
                  {(user?.role === "Business Owner" || user?.role === "Manager") && (
                    <>
                      <Separator className="my-2" />
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <Label className="text-base font-semibold">Compensation (Optional)</Label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Set salary information for this staff member
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant={formData.salaryEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFormData({ ...formData, salaryEnabled: !formData.salaryEnabled })}
                          >
                            {formData.salaryEnabled ? "Enabled" : "Enable"}
                          </Button>
                        </div>

                        {formData.salaryEnabled && (
                          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                Salary is HR data only. It will NOT automatically create expenses or affect reports.
                              </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="salary-type">Salary Type</Label>
                                <Select 
                                  value={formData.salaryType} 
                                  onValueChange={(value) => setFormData({ ...formData, salaryType: value as SalaryType })}
                                >
                                  <SelectTrigger id="salary-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="hourly">Hourly</SelectItem>
                                    <SelectItem value="commission">Commission</SelectItem>
                                    <SelectItem value="mixed">Monthly + Commission</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor="base-salary">Base Salary ({currencySymbol})</Label>
                                <Input
                                  id="base-salary"
                                  type="number"
                                  min="0"
                                  step="100"
                                  value={formData.baseSalary}
                                  onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                                  placeholder="50000"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="pay-frequency">Pay Frequency</Label>
                                <Select 
                                  value={formData.payFrequency} 
                                  onValueChange={(value) => setFormData({ ...formData, payFrequency: value as PayFrequency })}
                                >
                                  <SelectTrigger id="pay-frequency">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor="effective-from">Effective From</Label>
                                <Input
                                  id="effective-from"
                                  type="date"
                                  value={formData.effectiveFrom}
                                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <Label className="text-xs text-muted-foreground">Currency</Label>
                              <Input
                                value={currencyCode}
                                readOnly
                                disabled
                                className="bg-muted"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                FIXED FOOTER - Always visible
                ═══════════���═════��═══════════════��═════════════════════════════════ */}
            <DialogFooter className="pt-4">
              {generatedCredentials ? (
                <Button onClick={closeAddDialog} className="w-full">
                  Done
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={closeAddDialog} disabled={isLoadingStaff}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={editingMember ? handleEditStaff : handleAddStaff}
                    disabled={isLoadingStaff}
                  >
                    {isLoadingStaff ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {editingMember ? "Saving..." : "Creating..."}
                      </>
                    ) : (
                      editingMember ? "Save Changes" : "Create Staff"
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-semibold">{staffMembers.length}</div>
            <p className="text-sm text-muted-foreground">Total Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-semibold text-green-600">
              {activeStaff}
            </div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-semibold text-amber-600">
              {pendingStaff}
            </div>
            <p className="text-sm text-muted-foreground">Pending Setup</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-semibold text-blue-600">
              {managers}
            </div>
            <p className="text-sm text-muted-foreground">Managers</p>
          </CardContent>
        </Card>
      </div>

      {/* Business Owner: Branch Filter Indicator */}
      {user?.role === "Business Owner" && filterBranchId !== "ALL_BRANCHES" && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Filtered View</p>
                <p className="text-xs text-blue-700">
                  Showing staff for: <span className="font-semibold">{getBranchById(filterBranchId)?.name || "Unknown Branch"}</span>
                </p>
              </div>
              <Badge variant="secondary" className="h-6 bg-blue-100 text-blue-800 border-blue-300">
                {filteredStaff.length} {filteredStaff.length === 1 ? 'member' : 'members'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manager: Branch Lock Indicator */}
      {user?.role === "Manager" && user?.branchId && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Branch View</p>
                <p className="text-xs text-amber-700">
                  You can only view staff from: <span className="font-semibold">{getBranchById(user.branchId)?.name || "Your Branch"}</span>
                </p>
              </div>
              <Badge variant="secondary" className="h-6 bg-amber-100 text-amber-800 border-amber-300">
                {filteredStaff.length} {filteredStaff.length === 1 ? 'member' : 'members'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Search and filter your staff</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Roles</SelectItem>
                <SelectItem value="Business Owner">Business Owner</SelectItem>
                {activeRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Branch Filter */}
            {user?.role === "Business Owner" && (
              <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_BRANCHES">All Branches</SelectItem>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => {
                    const isOwner = member.id === business?.ownerId;
                    const branch = member.branchId ? getBranchById(member.branchId) : null;
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(member.firstName, member.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {member.firstName} {member.lastName}
                              </p>
                              {isOwner && (
                                <Badge variant="outline" className="text-xs mt-1">Owner</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {branch ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{branch.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.mustChangePassword ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                              Pending Setup
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!isOwner && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(member)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(member.id, `${member.firstName} ${member.lastName}`, member.role)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {member.id.startsWith('invite-') ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleResendInvite(member.id, `${member.firstName} ${member.lastName}`)}
                                      title="Resend Invitation"
                                    >
                                      <Mail className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleResetPassword(member.id, `${member.firstName} ${member.lastName}`)}
                                      title="Reset Password"
                                    >
                                      <KeyRound className="w-4 h-4" />
                                    </Button>
                                )}
                              </>
                            )}
                            {isOwner && (
                              <span className="text-xs text-muted-foreground px-2">
                                Cannot edit
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
              {filterBranchId !== "ALL_BRANCHES" ? (
                <>
                  <p className="font-medium">No staff assigned to this branch yet</p>
                  <p className="text-sm mt-1">
                    Branch: {getBranchById(filterBranchId)?.name || "Selected Branch"}
                  </p>
                </>
              ) : searchQuery || filterRole !== "All" ? (
                <p>No staff members match your search criteria</p>
              ) : (
                <p>No staff members found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {deleteConfirmation && (
        <ConfirmationDialog
          open={deleteConfirmation.isOpen}
          onOpenChange={(open) => setDeleteConfirmation(open ? deleteConfirmation : null)}
          title="Remove Staff Member"
          description="Are you sure you want to remove this staff member? This action cannot be undone."
          confirmLabel="Remove Staff"
          cancelLabel="Cancel"
          variant="destructive"
          details={[
            { label: "Name", value: deleteConfirmation.staffName },
            { label: "Role", value: deleteConfirmation.staffRole }
          ]}
          onConfirm={async () => {
            try {
              const result = await deleteStaff(deleteConfirmation.staffId);
              if (result.success) {
                toast.success("Staff member removed successfully!");
                // Refresh list
                const updatedList = await getStaffMembers();
                setStaffMembers(updatedList);
              } else {
                toast.error(result.error || "Failed to remove staff member");
              }
            } catch (error) {
              toast.error("An unexpected error occurred");
            }
          }}
        />
      )}

      {/* Resend Invite Confirmation Dialog */}
      {resendInviteConfirmation && (
        <ConfirmationDialog
          open={resendInviteConfirmation.isOpen}
          onOpenChange={(open) => setResendInviteConfirmation(open ? resendInviteConfirmation : null)}
          title="Resend Invitation"
          description="Are you sure you want to resend the invitation to this staff member?"
          confirmLabel="Resend Invite"
          cancelLabel="Cancel"
          details={[
            { label: "Name", value: resendInviteConfirmation.staffName }
          ]}
          onConfirm={async () => {
            try {
              const result = await resendStaffInvite(resendInviteConfirmation.staffId);
              if (result.success) {
                toast.success("Invitation resent successfully!");
              } else {
                toast.error(result.error || "Failed to resend invitation");
              }
            } catch (error) {
              toast.error("An unexpected error occurred");
            }
          }}
        />
      )}

      {/* Reset Password Confirmation Dialog */}
      {resetPasswordConfirmation && (
        <ConfirmationDialog
          open={resetPasswordConfirmation.isOpen}
          onOpenChange={(open) => setResetPasswordConfirmation(open ? resetPasswordConfirmation : null)}
          title="Confirm Password Reset"
          description="Are you sure you want to reset the password for this staff member? This action will immediately invalidate their current password. The staff member will be required to use the new password to log in."
          confirmLabel="Confirm Reset"
          cancelLabel="Cancel"
          variant="destructive"
          details={[
            { label: "Name", value: resetPasswordConfirmation.staffName }
          ]}
          onConfirm={async () => {
            try {
              console.log("Resetting password for staff:", resetPasswordConfirmation.staffId);
              const result = await resetStaffPassword(resetPasswordConfirmation.staffId);
              console.log("Password reset result:", result);
              
              if (result.success && result.temporaryPassword) {
                if (result.temporaryPassword === "CHECK_EMAIL" || result.temporaryPassword === "EMAIL_SENT") {
                  // Email-based reset (automatic workaround when database not setup)
                  toast.success("Password reset email sent! Staff member should check their email.", {
                    description: "A password reset link has been sent. This is an automatic workaround."
                  });
                  setResetPasswordConfirmation(null);
                  // Refresh list to show updated status
                  const updatedList = await getStaffMembers();
                  setStaffMembers(updatedList);
                } else {
                  // Direct password reset (works when database is setup)
                  setResetPasswordDialog({
                    isOpen: true,
                    staffId: resetPasswordConfirmation.staffId,
                    staffName: resetPasswordConfirmation.staffName,
                    temporaryPassword: result.temporaryPassword
                  });
                  toast.success("Password reset successfully! Staff member can now login with the temporary password.");
                  // Refresh list to show updated status
                  const updatedList = await getStaffMembers();
                  setStaffMembers(updatedList);
                }
              } else {
                console.error("Password reset failed:", result.error);
                // Show detailed error message
                if (result.error?.includes("pgcrypto") || result.error?.includes("gen_salt") || result.error?.includes("DATABASE SETUP REQUIRED") || result.error?.includes("function") && result.error?.includes("does not exist")) {
                  // Show visual database setup alert
                  setDatabaseSetupError(result.error || "Database setup required");
                } else if (result.error?.includes("Database function missing")) {
                  // Show visual database setup alert
                  setDatabaseSetupError(result.error || "Database setup required");
                } else if (result.error?.includes("Insufficient permissions")) {
                  toast.error("You don't have permission to reset passwords. Only Business Owners and Managers can reset passwords.");
                } else if (result.error?.includes("different business")) {
                  toast.error("Cannot reset password for staff in a different business.");
                } else {
                  toast.error(result.error || "Failed to reset password. Check console for details.");
                }
              }
            } catch (error: any) {
              console.error("Password reset exception:", error);
              toast.error(`An unexpected error occurred: ${error.message || "Unknown error"}`);
            }
          }}
        />
      )}

      {/* Reset Password Dialog */}
      {resetPasswordDialog && (
        <Dialog open={resetPasswordDialog.isOpen} onOpenChange={(open) => setResetPasswordDialog(open ? resetPasswordDialog : null)}>
          <DialogContent>
            <DialogHeader>
              {/* Tillsup Logo */}
              {!brandingLoading && assets.logoMain && (
                <div className="flex justify-center mb-4">
                  <img src={assets.logoMain} alt="Tillsup Logo" className="h-12 w-auto object-contain" />
                </div>
              )}
              <DialogTitle>Password Reset Successful</DialogTitle>
              <DialogDescription>
                A temporary password has been generated for {resetPasswordDialog.staffName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <p className="font-semibold text-amber-900">Temporary Password Generated</p>
                </div>
                <p className="text-sm text-amber-700">
                  Please share this password with the staff member. They will be required to change it on their next login.
                </p>
              </div>

              <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Staff Member</Label>
                  <Input 
                    value={resetPasswordDialog.staffName} 
                    readOnly 
                    className="mt-1 font-medium"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      id="temp-password-input"
                      value={resetPasswordDialog.temporaryPassword} 
                      readOnly 
                      className="font-mono text-lg font-bold select-all cursor-pointer bg-white border-2 border-primary/20"
                      onClick={(e) => {
                        // Auto-select on click for easy manual copying
                        e.currentTarget.select();
                      }}
                      title="Click to select, then Ctrl+C to copy"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        const input = document.getElementById('temp-password-input') as HTMLInputElement;
                        copyToClipboard(resetPasswordDialog.temporaryPassword, input);
                      }}
                      title="Copy to clipboard"
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    💡 Tip: Click the password to select it, then press Ctrl+C (or Cmd+C) to copy
                  </p>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ The staff member will be forced to change their password on their next login and cannot access the system until they do so.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setResetPasswordDialog(null)} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Database Setup Alert */}
      {databaseSetupError && (
        <DatabaseSetupAlert 
          error={databaseSetupError} 
          onClose={() => setDatabaseSetupError(null)} 
        />
      )}
    </div>
  );
}