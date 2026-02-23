import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Plus, Edit, Ban, CheckCircle2, Shield, Users } from "lucide-react";
import { useRole, Permission, PERMISSION_GROUPS } from "../../contexts/RoleContext";
import { toast } from "sonner";

export function RolesPermissionsTab() {
  const {
    roles,
    activeRoles,
    addRole,
    updateRole,
    disableRole,
    enableRole,
  } = useRole();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: string; name: string; description: string; permissions: Permission[] } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as Permission[],
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: [],
    });
  };

  const handleAddRole = async () => {
    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (formData.permissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    await addRole({
      name: formData.name.trim(),
      description: formData.description.trim(),
      permissions: formData.permissions,
    });

    // Toast handled in context
    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (formData.permissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    await updateRole(editingRole.id, {
      name: formData.name.trim(),
      description: formData.description.trim(),
      permissions: formData.permissions,
    });

    // Toast handled in context
    resetForm();
    setEditingRole(null);
  };

  const handleDisableRole = async (id: string, name: string) => {
    await disableRole(id);
    toast.success(`Role "${name}" has been disabled`);
  };

  const handleEnableRole = async (id: string, name: string) => {
    await enableRole(id);
    toast.success(`Role "${name}" has been enabled`);
  };

  const openEditDialog = (role: { id: string; name: string; description: string; permissions: Permission[] }) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
    });
  };

  const togglePermission = (permission: Permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const toggleAllInGroup = (groupPermissions: Permission[]) => {
    const allSelected = groupPermissions.every(p => formData.permissions.includes(p));
    if (allSelected) {
      // Deselect all in group
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !groupPermissions.includes(p))
      }));
    } else {
      // Select all in group
      const newPerms = [...formData.permissions];
      groupPermissions.forEach(p => {
        if (!newPerms.includes(p)) {
          newPerms.push(p);
        }
      });
      setFormData(prev => ({
        ...prev,
        permissions: newPerms
      }));
    }
  };

  const PermissionSelector = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Permissions <span className="text-destructive">*</span></Label>
        <Badge variant="secondary">
          {formData.permissions.length} selected
        </Badge>
      </div>
      
      <Accordion type="multiple" className="w-full">
        {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => {
          const groupPerms = permissions.map(p => p.key);
          const allSelected = groupPerms.every(p => formData.permissions.includes(p));
          const someSelected = groupPerms.some(p => formData.permissions.includes(p));
          
          return (
            <AccordionItem key={groupName} value={groupName}>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                  onCheckedChange={() => toggleAllInGroup(groupPerms)}
                />
                <AccordionTrigger className="hover:no-underline flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-medium">{groupName}</span>
                    <Badge variant="outline" className="ml-2">
                      {groupPerms.filter(p => formData.permissions.includes(p)).length}/{groupPerms.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent>
                <div className="space-y-3 pt-2 pl-6">
                  {permissions.map((perm) => (
                    <div key={perm.key} className="flex items-start gap-3">
                      <Checkbox
                        id={perm.key}
                        checked={formData.permissions.includes(perm.key)}
                        onCheckedChange={() => togglePermission(perm.key)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={perm.key}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {perm.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {perm.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">
            Manage user roles and assign permissions
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setEditingRole(null);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Role</DialogTitle>
              <DialogDescription>
                Create a new role and assign permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Role Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Cashier, Store Manager, Accountant"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">
                  Description <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this role"
                  rows={3}
                />
              </div>
              <PermissionSelector />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRole}>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role name, description, and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Role Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cashier, Store Manager, Accountant"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">
                Description <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this role"
                rows={3}
              />
            </div>
            <PermissionSelector />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-semibold">{roles.length}</div>
            <p className="text-sm text-muted-foreground">Total Roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-semibold text-green-600">{activeRoles.length}</div>
            <p className="text-sm text-muted-foreground">Active Roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-semibold text-gray-600">
              {roles.filter((r) => r.status === "disabled").length}
            </div>
            <p className="text-sm text-muted-foreground">Disabled Roles</p>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Roles</CardTitle>
          <CardDescription>
            {roles.length === 0
              ? "No roles created yet. Add your first role to get started."
              : "Manage and configure user roles and permissions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-3">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No Roles Yet</h3>
              <p className="mb-4 text-sm text-muted-foreground max-w-sm">
                Create your first role to start managing staff permissions. Roles allow you to
                group permissions and assign them to multiple staff members at once.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Role
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        {role.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || (
                        <span className="italic text-muted-foreground/60">No description</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {role.status === "active" ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Ban className="w-3 h-3" />
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(role)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        {role.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisableRole(role.id, role.name)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Disable
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnableRole(role.id, role.name)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Enable
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}