import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  UserPlus,
  Pencil,
  Trash2,
  Key,
  UserX,
  UserCheck,
  Plus,
  Users,
  Lock,
  Copy,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Role, Permission, User } from "@shared/schema";

interface RolePermission {
  id: number;
  roleId: number;
  permissionId: number;
}

function generatePassword(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function StaffRolesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffRolesPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<string>("");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<User | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [renameName, setRenameName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [staffForm, setStaffForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    staffId: "",
    joiningDate: "",
    notes: "",
    isActive: true,
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: allPermissions } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  const selectedRole = useMemo(() => {
    if (!rolesData || !selectedTab || selectedTab === "permissions") return null;
    return rolesData.find((r) => String(r.id) === selectedTab) ?? null;
  }, [rolesData, selectedTab]);

  const { data: rolePermissions } = useQuery<RolePermission[]>({
    queryKey: ["/api/roles", selectedRole?.id, "permissions"],
    enabled: !!selectedRole,
  });

  const { data: roleStaff, isLoading: staffLoading } = useQuery<User[]>({
    queryKey: ["/api/staff/role", selectedRole?.slug],
    enabled: !!selectedRole,
  });

  const permissionsByModule = useMemo(() => {
    if (!allPermissions) return {};
    const grouped: Record<string, Permission[]> = {};
    allPermissions.forEach((p) => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });
    return grouped;
  }, [allPermissions]);

  const assignedPermissionIds = useMemo(() => {
    if (!rolePermissions) return new Set<number>();
    return new Set(rolePermissions.map((rp) => rp.permissionId));
  }, [rolePermissions]);

  // Set initial tab when roles load
  useMemo(() => {
    if (rolesData && rolesData.length > 0 && !selectedTab) {
      setSelectedTab(String(rolesData[0].id));
    }
  }, [rolesData, selectedTab]);

  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; isSystem: boolean; isActive: boolean }) => {
      await apiRequest("POST", "/api/roles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role created successfully" });
      setRoleDialogOpen(false);
      setNewRoleName("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create role", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Role> }) => {
      await apiRequest("PUT", `/api/roles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role updated successfully" });
      setRenameDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role deleted successfully" });
      if (rolesData && rolesData.length > 1) {
        const remaining = rolesData.filter((r) => String(r.id) !== selectedTab);
        if (remaining.length > 0) setSelectedTab(String(remaining[0].id));
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete role", description: error.message, variant: "destructive" });
    },
  });

  const setPermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) => {
      await apiRequest("PUT", `/api/roles/${roleId}/permissions`, { permissionIds });
    },
    onSuccess: () => {
      if (selectedRole) {
        queryClient.invalidateQueries({ queryKey: ["/api/roles", selectedRole.id, "permissions"] });
      }
      toast({ title: "Permissions updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update permissions", description: error.message, variant: "destructive" });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest("POST", "/api/staff", data);
    },
    onSuccess: () => {
      if (selectedRole) {
        queryClient.invalidateQueries({ queryKey: ["/api/staff/role", selectedRole.slug] });
      }
      toast({ title: "Staff member added" });
      setStaffDialogOpen(false);
      resetStaffForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add staff", description: error.message, variant: "destructive" });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiRequest("PUT", `/api/staff/${id}`, data);
    },
    onSuccess: () => {
      if (selectedRole) {
        queryClient.invalidateQueries({ queryKey: ["/api/staff/role", selectedRole.slug] });
      }
      toast({ title: "Staff member updated" });
      setStaffDialogOpen(false);
      setEditingStaff(null);
      resetStaffForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update staff", description: error.message, variant: "destructive" });
    },
  });

  const toggleStaffStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PUT", `/api/staff/${id}`, { isActive });
    },
    onSuccess: () => {
      if (selectedRole) {
        queryClient.invalidateQueries({ queryKey: ["/api/staff/role", selectedRole.slug] });
      }
      toast({ title: "Staff status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      await apiRequest("PUT", `/api/staff/${id}`, { password });
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setResetPasswordDialogOpen(false);
      setResetPasswordStaff(null);
      setNewPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reset password", description: error.message, variant: "destructive" });
    },
  });

  const resetStaffForm = useCallback(() => {
    setStaffForm({
      name: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      address: "",
      staffId: "",
      joiningDate: "",
      notes: "",
      isActive: true,
    });
  }, []);

  const openAddStaffDialog = useCallback(() => {
    setEditingStaff(null);
    resetStaffForm();
    setStaffDialogOpen(true);
  }, [resetStaffForm]);

  const openEditStaffDialog = useCallback((staff: User) => {
    setEditingStaff(staff);
    setStaffForm({
      name: staff.name || "",
      username: staff.username || "",
      email: staff.email || "",
      phone: staff.phone || "",
      password: "",
      address: staff.address || "",
      staffId: staff.staffId || "",
      joiningDate: staff.joiningDate
        ? new Date(staff.joiningDate).toISOString().split("T")[0]
        : "",
      notes: staff.notes || "",
      isActive: staff.isActive ?? true,
    });
    setStaffDialogOpen(true);
  }, []);

  const handleSaveStaff = useCallback(() => {
    if (!selectedRole) return;
    if (!staffForm.name.trim() || !staffForm.username.trim()) {
      toast({ title: "Name and Username are required", variant: "destructive" });
      return;
    }

    if (editingStaff) {
      const updateData: Record<string, unknown> = {
        name: staffForm.name,
        email: staffForm.email || null,
        phone: staffForm.phone || null,
        address: staffForm.address || null,
        staffId: staffForm.staffId || null,
        joiningDate: staffForm.joiningDate ? new Date(staffForm.joiningDate).toISOString() : null,
        notes: staffForm.notes || null,
        isActive: staffForm.isActive,
      };
      if (staffForm.password) {
        updateData.password = staffForm.password;
      }
      updateStaffMutation.mutate({ id: editingStaff.id, data: updateData });
    } else {
      if (!staffForm.password) {
        toast({ title: "Password is required for new staff", variant: "destructive" });
        return;
      }
      createStaffMutation.mutate({
        username: staffForm.username,
        password: staffForm.password,
        name: staffForm.name,
        email: staffForm.email || null,
        phone: staffForm.phone || null,
        role: selectedRole.slug.toUpperCase(),
        roleId: selectedRole.id,
        staffId: staffForm.staffId || null,
        address: staffForm.address || null,
        joiningDate: staffForm.joiningDate ? new Date(staffForm.joiningDate).toISOString() : null,
        notes: staffForm.notes || null,
        isActive: staffForm.isActive,
      });
    }
  }, [selectedRole, staffForm, editingStaff, createStaffMutation, updateStaffMutation, toast]);

  const handleTogglePermission = useCallback(
    (permissionId: number) => {
      if (!selectedRole) return;
      const current = Array.from(assignedPermissionIds);
      const updated = assignedPermissionIds.has(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId];
      setPermissionsMutation.mutate({ roleId: selectedRole.id, permissionIds: updated });
    },
    [selectedRole, assignedPermissionIds, setPermissionsMutation]
  );

  const handleCreateRole = useCallback(() => {
    if (!newRoleName.trim()) {
      toast({ title: "Role name is required", variant: "destructive" });
      return;
    }
    createRoleMutation.mutate({
      name: newRoleName.trim(),
      slug: newRoleName.trim().toLowerCase().replace(/\s+/g, "_"),
      isSystem: false,
      isActive: true,
    });
  }, [newRoleName, createRoleMutation, toast]);

  const handleRenameRole = useCallback(() => {
    if (!selectedRole || !renameName.trim()) return;
    updateRoleMutation.mutate({
      id: selectedRole.id,
      data: {
        name: renameName.trim(),
        slug: renameName.trim().toLowerCase().replace(/\s+/g, "_"),
      },
    });
  }, [selectedRole, renameName, updateRoleMutation]);

  const canDeleteRole = useMemo(() => {
    if (!selectedRole) return false;
    if (selectedRole.isSystem) return false;
    if (roleStaff && roleStaff.length > 0) return false;
    return true;
  }, [selectedRole, roleStaff]);

  if (rolesLoading) {
    return (
      <div className="p-6" data-testid="staff-roles-loading">
        <h1 className="text-2xl font-semibold mb-6">Staff & Roles</h1>
        <StaffRolesSkeleton />
      </div>
    );
  }

  const roles = rolesData || [];

  return (
    <div className="p-6 space-y-6" data-testid="staff-roles-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          Staff & Roles
        </h1>
        <Button
          onClick={() => setRoleDialogOpen(true)}
          data-testid="button-add-role"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Role
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Roles</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 space-y-1">
              {roles.map((role) => (
                <Button
                  key={role.id}
                  variant={selectedTab === String(role.id) ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-2 toggle-elevate ${selectedTab === String(role.id) ? "toggle-elevated" : ""}`}
                  onClick={() => setSelectedTab(String(role.id))}
                  data-testid={`button-role-tab-${role.id}`}
                >
                  <Shield className="h-4 w-4" />
                  <span className="truncate">{role.name}</span>
                  {role.isSystem && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      System
                    </Badge>
                  )}
                </Button>
              ))}
              <Button
                variant={selectedTab === "permissions" ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2 toggle-elevate ${selectedTab === "permissions" ? "toggle-elevated" : ""}`}
                onClick={() => setSelectedTab("permissions")}
                data-testid="button-permissions-tab"
              >
                <Lock className="h-4 w-4" />
                <span>All Permissions</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          {selectedTab === "permissions" ? (
            <PermissionsOverview permissionsByModule={permissionsByModule} />
          ) : selectedRole ? (
            <div className="space-y-6">
              <Card data-testid="card-role-details">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle data-testid="text-role-name">{selectedRole.name}</CardTitle>
                    <Badge
                      variant={selectedRole.isActive ? "secondary" : "destructive"}
                      className={selectedRole.isActive ? "bg-green-500/15 text-green-400" : ""}
                      data-testid="badge-role-status"
                    >
                      {selectedRole.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {selectedRole.isSystem && (
                      <Badge variant="outline" data-testid="badge-system-role">
                        System Role
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="role-active-toggle" className="text-sm text-muted-foreground">
                        Active
                      </Label>
                      <Switch
                        id="role-active-toggle"
                        checked={selectedRole.isActive ?? true}
                        onCheckedChange={(checked) =>
                          updateRoleMutation.mutate({
                            id: selectedRole.id,
                            data: { isActive: checked },
                          })
                        }
                        data-testid="switch-role-active"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRenameName(selectedRole.name);
                        setRenameDialogOpen(true);
                      }}
                      data-testid="button-rename-role"
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Rename
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!canDeleteRole}
                      onClick={() => deleteRoleMutation.mutate(selectedRole.id)}
                      data-testid="button-delete-role"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <Card data-testid="card-role-permissions">
                <CardHeader>
                  <CardTitle className="text-lg">Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(permissionsByModule).length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-permissions">
                      No permissions available.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {Object.entries(permissionsByModule).map(([module, perms]) => (
                        <div key={module} data-testid={`permission-module-${module.toLowerCase().replace(/\s+/g, "-")}`}>
                          <h4 className="text-sm font-semibold mb-3">{module}</h4>
                          <div className="space-y-2">
                            {perms.map((perm) => (
                              <div key={perm.id} className="flex items-start gap-2">
                                <Checkbox
                                  id={`perm-${perm.id}`}
                                  checked={assignedPermissionIds.has(perm.id)}
                                  onCheckedChange={() => handleTogglePermission(perm.id)}
                                  disabled={setPermissionsMutation.isPending}
                                  data-testid={`checkbox-permission-${perm.id}`}
                                />
                                <label
                                  htmlFor={`perm-${perm.id}`}
                                  className="text-sm leading-tight cursor-pointer"
                                >
                                  <span className="font-medium">{perm.key}</span>
                                  {perm.description && (
                                    <span className="block text-muted-foreground text-xs">
                                      {perm.description}
                                    </span>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-role-staff">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Staff Members
                    {roleStaff && (
                      <Badge variant="secondary" data-testid="badge-staff-count">
                        {roleStaff.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <Button onClick={openAddStaffDialog} data-testid="button-add-staff">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Staff
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {staffLoading ? (
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : !roleStaff || roleStaff.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground" data-testid="text-no-staff">
                      No staff members in this role.
                    </div>
                  ) : (
                    <Table data-testid="table-staff">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Staff ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roleStaff.map((staff) => (
                          <TableRow key={staff.id} data-testid={`row-staff-${staff.id}`}>
                            <TableCell className="font-medium" data-testid={`text-staff-name-${staff.id}`}>
                              {staff.name}
                            </TableCell>
                            <TableCell data-testid={`text-staff-email-${staff.id}`}>
                              {staff.email || "-"}
                            </TableCell>
                            <TableCell data-testid={`text-staff-phone-${staff.id}`}>
                              {staff.phone || "-"}
                            </TableCell>
                            <TableCell className="font-mono text-sm" data-testid={`text-staff-id-${staff.id}`}>
                              {staff.staffId || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={staff.isActive ? "secondary" : "destructive"}
                                className={staff.isActive ? "bg-green-500/15 text-green-400" : ""}
                                data-testid={`badge-staff-status-${staff.id}`}
                              >
                                {staff.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditStaffDialog(staff)}
                                  data-testid={`button-edit-staff-${staff.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    toggleStaffStatusMutation.mutate({
                                      id: staff.id,
                                      isActive: !staff.isActive,
                                    })
                                  }
                                  data-testid={`button-toggle-staff-${staff.id}`}
                                >
                                  {staff.isActive ? (
                                    <UserX className="h-4 w-4" />
                                  ) : (
                                    <UserCheck className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setResetPasswordStaff(staff);
                                    setNewPassword(generatePassword());
                                    setResetPasswordDialogOpen(true);
                                  }}
                                  data-testid={`button-reset-password-${staff.id}`}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
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
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-select-role">
                Select a role from the sidebar to manage staff and permissions.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent data-testid="dialog-add-role">
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>Create a new role for your organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-role-name">Role Name</Label>
              <Input
                id="new-role-name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Supervisor"
                data-testid="input-new-role-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              data-testid="button-cancel-add-role"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending}
              data-testid="button-save-role"
            >
              {createRoleMutation.isPending ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent data-testid="dialog-rename-role">
          <DialogHeader>
            <DialogTitle>Rename Role</DialogTitle>
            <DialogDescription>Enter a new name for this role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-role">New Name</Label>
              <Input
                id="rename-role"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                data-testid="input-rename-role"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              data-testid="button-cancel-rename"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameRole}
              disabled={updateRoleMutation.isPending}
              data-testid="button-save-rename"
            >
              {updateRoleMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-staff">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingStaff
                ? "Update the staff member's information."
                : `Add a new staff member to the ${selectedRole?.name} role.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff-name">Full Name *</Label>
                <Input
                  id="staff-name"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  data-testid="input-staff-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-username">Username *</Label>
                <Input
                  id="staff-username"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="johndoe"
                  disabled={!!editingStaff}
                  data-testid="input-staff-username"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="john@example.com"
                  data-testid="input-staff-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-phone">Phone</Label>
                <Input
                  id="staff-phone"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                  data-testid="input-staff-phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">
                {editingStaff ? "New Password (leave blank to keep)" : "Password *"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="staff-password"
                  type="text"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editingStaff ? "Leave blank to keep current" : "Enter password"}
                  data-testid="input-staff-password"
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() =>
                    setStaffForm((f) => ({ ...f, password: generatePassword() }))
                  }
                  data-testid="button-generate-password"
                >
                  <Key className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-address">Address</Label>
              <Input
                id="staff-address"
                value={staffForm.address}
                onChange={(e) => setStaffForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St"
                data-testid="input-staff-address"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff-staff-id">Staff ID</Label>
                <Input
                  id="staff-staff-id"
                  value={staffForm.staffId}
                  onChange={(e) => setStaffForm((f) => ({ ...f, staffId: e.target.value }))}
                  placeholder="EMP001"
                  data-testid="input-staff-staff-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-joining-date">Joining Date</Label>
                <Input
                  id="staff-joining-date"
                  type="date"
                  value={staffForm.joiningDate}
                  onChange={(e) => setStaffForm((f) => ({ ...f, joiningDate: e.target.value }))}
                  data-testid="input-staff-joining-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-notes">Notes</Label>
              <Textarea
                id="staff-notes"
                value={staffForm.notes}
                onChange={(e) => setStaffForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes..."
                className="resize-none"
                data-testid="input-staff-notes"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="staff-active"
                checked={staffForm.isActive}
                onCheckedChange={(checked) => setStaffForm((f) => ({ ...f, isActive: checked }))}
                data-testid="switch-staff-active"
              />
              <Label htmlFor="staff-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStaffDialogOpen(false);
                setEditingStaff(null);
                resetStaffForm();
              }}
              data-testid="button-cancel-staff"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveStaff}
              disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
              data-testid="button-save-staff"
            >
              {createStaffMutation.isPending || updateStaffMutation.isPending
                ? "Saving..."
                : editingStaff
                ? "Update Staff"
                : "Add Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent data-testid="dialog-reset-password">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {resetPasswordStaff?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <div className="flex gap-2">
                <Input
                  id="reset-password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-reset-password"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNewPassword(generatePassword())}
                  data-testid="button-regenerate-password"
                >
                  <Key className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(newPassword);
                    toast({ title: "Password copied to clipboard" });
                  }}
                  data-testid="button-copy-password"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetPasswordDialogOpen(false)}
              data-testid="button-cancel-reset-password"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (resetPasswordStaff && newPassword) {
                  resetPasswordMutation.mutate({
                    id: resetPasswordStaff.id,
                    password: newPassword,
                  });
                }
              }}
              disabled={resetPasswordMutation.isPending || !newPassword}
              data-testid="button-confirm-reset-password"
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PermissionsOverview({
  permissionsByModule,
}: {
  permissionsByModule: Record<string, Permission[]>;
}) {
  return (
    <Card data-testid="card-all-permissions">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          All Permissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(permissionsByModule).length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-permissions-overview">
            No permissions defined.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
              <div key={module} data-testid={`overview-module-${module.toLowerCase().replace(/\s+/g, "-")}`}>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {module}
                  <Badge variant="secondary" className="text-xs">
                    {perms.length}
                  </Badge>
                </h4>
                <div className="space-y-1.5">
                  {perms.map((perm) => (
                    <div
                      key={perm.id}
                      className="text-sm py-1"
                      data-testid={`text-permission-${perm.id}`}
                    >
                      <span className="font-mono text-xs">{perm.key}</span>
                      {perm.description && (
                        <span className="block text-muted-foreground text-xs">
                          {perm.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
