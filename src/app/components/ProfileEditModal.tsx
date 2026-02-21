import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileEditModal({ open, onClose }: ProfileEditModalProps) {
  const { user, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  // Get user initials
  const initials = `${firstName.charAt(0) || user.firstName.charAt(0)}${lastName.charAt(0) || user.lastName.charAt(0)}`.toUpperCase();

  // Reset form when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setError(null);
      setSuccess(false);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      // Validate inputs
      if (!firstName.trim()) {
        setError("First name is required");
        setIsSubmitting(false);
        return;
      }

      if (!lastName.trim()) {
        setError("Last name is required");
        setIsSubmitting(false);
        return;
      }

      // Update profile
      const result = updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      if (!result.success) {
        setError(result.error || "Failed to update profile");
        setIsSubmitting(false);
        return;
      }

      // Show success
      setSuccess(true);

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your personal information. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex justify-center">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Success Message */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Profile updated successfully!
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Editable Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Read-only fields */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email Address (Read-only)
                </Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-slate-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Contact your administrator to change your email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-muted-foreground">
                  Role (Read-only)
                </Label>
                <Input
                  id="role"
                  value={user.role}
                  disabled
                  className="bg-slate-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Only administrators can change user roles
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || success}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
