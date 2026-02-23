import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { User, Edit, KeyRound, LogOut, AlertCircle, Building2 } from "lucide-react";
import { ProfileViewModal } from "./ProfileViewModal";
import { ProfileEditModal } from "./ProfileEditModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { Badge } from "./ui/badge";

export function ProfileDropdown() {
  const { user, business, logout } = useAuth();
  
  // Safe branch context access
  let getBranchById: (id: string) => any | undefined = () => undefined;
  try {
    const branchContext = useBranch();
    getBranchById = branchContext.getBranchById;
  } catch (e) {
    // BranchContext may not be available during initialization
    console.warn("ProfileDropdown: BranchContext not available", e);
  }

  const [showViewProfile, setShowViewProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!user || !business) return null;

  // Get user initials
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  // Get assigned branch
  const currentBranch = user.branchId ? getBranchById(user.branchId) : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 relative">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {user.mustChangePassword && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full border-2 border-white" />
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user.role}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">{business.name}</p>
              {currentBranch && (
                <p className="text-xs text-muted-foreground">
                  <Building2 className="w-4 h-4 mr-1 inline-block" />
                  {currentBranch.name}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Password Change Alert */}
          {user.mustChangePassword && (
            <>
              <div className="px-2 py-2">
                <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-md">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">Password change required</p>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem onClick={() => setShowViewProfile(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>View Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEditProfile(true)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Change Password</span>
            {user.mustChangePassword && (
              <Badge variant="destructive" className="ml-auto text-xs">Required</Badge>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <ProfileViewModal open={showViewProfile} onClose={() => setShowViewProfile(false)} />
      <ProfileEditModal open={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </>
  );
}