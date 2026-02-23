import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Search, UserPlus, Edit, Trash2, Copy, CheckCircle2, Building2, KeyRound, AlertCircle, Shield, DollarSign, Mail } from "lucide-react";
import { useAuth, UserRole, User, SalaryType, PayFrequency, StaffSalary } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";
import { useRole } from "../../contexts/RoleContext";
import { useCurrency } from "../../hooks/useCurrency";
import { useSubscription } from "../../hooks/useSubscription";
import { toast } from "sonner";
import { ConfirmationDialog } from "../ConfirmationDialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { SchemaError } from "../../components/inventory/SchemaError";
import { Separator } from "../ui/separator";
import { useNavigate } from "react-router";

export function StaffManagementTab() {
  const { user, business, getStaffMembers, createStaff, updateStaff, deleteStaff, resetStaffPassword, resendStaffInvite } = useAuth();
  const { branches, getBranchById } = useBranch();
  const { activeRoles, getRoleById } = useRole();
  const { currencyCode, currencySymbol } = useCurrency();
  const { canCreateStaff, plan, usage, limits } = useSubscription();
  const navigate = useNavigate();
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [schemaError, setSchemaError] = useState<any>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoadingStaff(true);
      try {
        const members = await getStaffMembers();
        setStaffMembers(members);
      } catch (error) {
        console.error("Failed to fetch staff members", error);
        toast.error("Failed to load staff members");
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchStaff();
  }, [getStaffMembers]);

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
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; staffId: string; staffName: string; staffRole: string } | null>(null);
  const [resendInviteConfirmation, setResendInviteConfirmation] = useState<{ isOpen: boolean; staffId: string; staffName: string } | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════
  // PASSWORD RESET - Two-step process: Confirmation → Execution
  // ═══════════════════════════════════════════════════════════════════
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState<{ isOpen: boolean; staffId: string; staffName: string } | null>(null);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ isOpen: boolean; staffId: string; staffName: string; temporaryPassword: string } | null>(null);

  const [createMode, setCreateMode] = useState<'invite' | 'password'>('invite');
  const [noEmail, setNoEmail] = useState(false);
  const [manualPassword, setManualPassword] = useState("");
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [username, setUsername] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "Cashier" as UserRole,
    branchId: "", // Add branch assignment
    // ═══════════════════════════════════════════════════════════════════
    // COMPENSATION (HR DATA) - Optional but recommended
    // ═══════════════════════════════════════════════════════════════════
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
    // ═══════════════════════════════════════════════════════���═══════════
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
         finalEmail = `${username.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@no-email.tillsup.com`;
       } else {
         if (!formData.email.trim() || !formData.email.includes("@")) {
            toast.error("Valid email is required");
            return;
         }
       }

       if (autoGeneratePassword) {
          const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
          let retVal = "";
          for (let i = 0, n = charset.length; i < 12; ++i) {
              retVal += charset.charAt(Math.floor(Math.random() * n));
          }
          finalPassword = retVal;
       } else {
          if (!manualPassword || manualPassword.length < 6) {
             toast.error("Password must be at least 6 characters");
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
      const result = await createStaff(
        finalEmail,
        formData.firstName,
        formData.lastName,
        formData.role,
        formData.branchId,
        undefined,
        finalPassword
      );

      if (result.success) {
        if (result.credentials) {
           // ═══════════════════════════════════════════════════════════════════
           // CREDENTIALS FLOW (Admin API)
           // ═══════════════════════════════════════════════════════════════════
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
           // ═══════════════════════════════════════════════════════════════════
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
        // Handle Schema Error
        if (result.errorCode || result.error?.includes("staff_invites")) {
            setSchemaError({ code: result.errorCode || 'PGRST204', message: result.error });
            toast.error("Database Schema Error: Missing Table");
        } else {
            toast.error(result.error || "Failed to create staff member");
        }
      }
    } catch (error: any) {
       toast.error("An unexpected error occurred");
    } finally {
       setIsLoadingStaff(false);
    }
  };

  const handleEditStaff = async () => {
    if (editingMember) {
      // ══════════════════════════════════════════════════════════════════
      // BRANCH VALIDATION
      // ═══════════════════════════════════════════════════════════════════
      if (!formData.branchId) {
        toast.error("Branch assignment is required");
        return;
      }

      // ═══════════════════════════════════════════════════════════════════
      // SALARY VALIDATION (if enabled)
      // ═══════════════════════════════════════════════════════════��═══════
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

  const copyToClipboard = (text: string) => {
    // Fallback method for environments where Clipboard API is restricted
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          toast.success("Copied to clipboard!");
        }).catch(() => {
          // Fallback to execCommand
          fallbackCopyTextToClipboard(text);
        });
      } else {
        // Use fallback method
        fallbackCopyTextToClipboard(text);
      }
    } catch (err) {
      fallbackCopyTextToClipboard(text);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success("Copied to clipboard!");
      } else {
        toast.error("Failed to copy to clipboard");
      }
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
    
    document.body.removeChild(textArea);
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

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Manage your team members and their roles ({staffMembers.length}/{limits.maxStaff === 999 ? "Unlimited" : limits.maxStaff})</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { 
          if (!open) closeAddDialog();
          else handleOpenAddDialog();
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddDialog}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
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
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
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
                          value={generatedCredentials.email} 
                          readOnly 
                          className="font-mono text-sm"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => copyToClipboard(generatedCredentials.email)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          value={generatedCredentials.password} 
                          readOnly 
                          className="font-mono text-sm"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => copyToClipboard(generatedCredentials.password)}
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
                                 Auto-generate secure password
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
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
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
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="staff-branch">Branch</Label>
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
                ═══════════���═════════════════════��═════════════════════════════════ */}
            <DialogFooter className="pt-4">
              {generatedCredentials ? (
                <Button onClick={closeAddDialog} className="w-full">
                  Done
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={closeAddDialog}>
                    Cancel
                  </Button>
                  <Button onClick={editingMember ? handleEditStaff : handleAddStaff}>
                    {editingMember ? "Save Changes" : "Create Staff"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
              const result = await resetStaffPassword(resetPasswordConfirmation.staffId);
              if (result.success && result.temporaryPassword) {
                setResetPasswordDialog({
                  isOpen: true,
                  staffId: resetPasswordConfirmation.staffId,
                  staffName: resetPasswordConfirmation.staffName,
                  temporaryPassword: result.temporaryPassword
                });
                toast.success("Password reset successfully!");
                // Refresh list not strictly needed for password reset but good practice if status changes
                const updatedList = await getStaffMembers();
                setStaffMembers(updatedList);
              } else {
                toast.error(result.error || "Failed to reset password");
              }
            } catch (error) {
              toast.error("An unexpected error occurred");
            }
          }}
        />
      )}

      {/* Reset Password Dialog */}
      {resetPasswordDialog && (
        <Dialog open={resetPasswordDialog.isOpen} onOpenChange={(open) => setResetPasswordDialog(open ? resetPasswordDialog : null)}>
          <DialogContent>
            <DialogHeader>
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
                      value={resetPasswordDialog.temporaryPassword} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(resetPasswordDialog.temporaryPassword)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
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
    </div>
  );
}