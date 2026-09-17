import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, GripVertical, Pencil, Trash2, FolderTree, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";
import type { Category } from "@shared/schema";

function CategoriesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function CategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    icon: "",
    iconImageUrl: null as string | null,
    bannerImageUrl: null as string | null,
    showOnHomeTabs: true,
    isActive: true,
  });
  const { toast } = useToast();

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/admin/categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category created" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create category", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiRequest("PUT", `/api/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category updated" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update category", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category deleted" });
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete category", description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await apiRequest("PUT", "/api/categories/reorder", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: number; field: string; value: boolean }) => {
      await apiRequest("PUT", `/api/categories/${id}`, { [field]: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", slug: "", icon: "", iconImageUrl: null, bannerImageUrl: null, showOnHomeTabs: true, isActive: true });
  }

  function openEditDialog(cat: Category) {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || "",
      iconImageUrl: cat.iconImageUrl || null,
      bannerImageUrl: cat.bannerImageUrl || null,
      showOnHomeTabs: cat.showOnHomeTabs ?? true,
      isActive: cat.isActive ?? true,
    });
    setDialogOpen(true);
  }

  function generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      icon: formData.icon || null,
      iconImageUrl: formData.iconImageUrl || null,
      bannerImageUrl: formData.bannerImageUrl || null,
      showOnHomeTabs: formData.showOnHomeTabs,
      isActive: formData.isActive,
    };
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function moveCategory(index: number, direction: "up" | "down") {
    if (!categories) return;
    const newOrder = [...categories];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    reorderMutation.mutate(newOrder.map(c => c.id));
  }

  if (isLoading) {
    return (
      <div className="p-6" data-testid="categories-loading">
        <h1 className="text-2xl font-semibold mb-6">Categories</h1>
        <CategoriesSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="categories-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage product categories and homepage tabs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-category">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-category">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
              <DialogDescription>
                {editingCategory ? "Update category details below." : "Fill in the details to create a new category."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  data-testid="input-category-name"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      slug: editingCategory ? formData.slug : generateSlug(name),
                    });
                  }}
                  placeholder="e.g. Domestic"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">Slug</Label>
                <Input
                  id="cat-slug"
                  data-testid="input-category-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. domestic"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-icon">Icon (emoji or text)</Label>
                <Input
                  id="cat-icon"
                  data-testid="input-category-icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g. Gas, Fire"
                />
              </div>
              <ImageUpload
                label="Icon Image (small square)"
                value={formData.iconImageUrl}
                onChange={(url) => setFormData({ ...formData, iconImageUrl: url })}
              />

              <ImageUpload
                label="Banner Image (wide)"
                value={formData.bannerImageUrl}
                onChange={(url) => setFormData({ ...formData, bannerImageUrl: url })}
              />

              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="cat-home-tabs">Show on Homepage Tabs</Label>
                <Switch
                  id="cat-home-tabs"
                  data-testid="switch-home-tabs"
                  checked={formData.showOnHomeTabs}
                  onCheckedChange={(checked) => setFormData({ ...formData, showOnHomeTabs: checked })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="cat-active">Active</Label>
                <Switch
                  id="cat-active"
                  data-testid="switch-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="button-submit-category" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingCategory ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-base">All Categories</CardTitle>
          <Badge variant="secondary">{categories?.length || 0}</Badge>
        </CardHeader>
        <CardContent>
          {(!categories || categories.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-categories">No categories yet</p>
            </div>
          ) : (
            <Table data-testid="table-categories">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Order</TableHead>
                  <TableHead className="w-12">Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Homepage</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat, index) => (
                  <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => moveCategory(index, "up")}
                          data-testid={`button-move-up-${cat.id}`}
                          className="h-6 w-6"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === categories.length - 1}
                          onClick={() => moveCategory(index, "down")}
                          data-testid={`button-move-down-${cat.id}`}
                          className="h-6 w-6"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cat.iconImageUrl ? (
                        <img
                          src={cat.iconImageUrl}
                          alt={cat.name}
                          className="h-8 w-8 rounded-md object-cover"
                          data-testid={`img-icon-${cat.id}`}
                        />
                      ) : (
                        <span className="text-lg" data-testid={`text-icon-${cat.id}`}>{cat.icon || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium" data-testid={`text-name-${cat.id}`}>{cat.name}</span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground" data-testid={`text-slug-${cat.id}`}>{cat.slug}</code>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={cat.showOnHomeTabs ?? false}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: cat.id, field: "showOnHomeTabs", value: checked })}
                        data-testid={`switch-homepage-${cat.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={cat.isActive ?? false}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: cat.id, field: "isActive", value: checked })}
                        data-testid={`switch-active-${cat.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(cat)}
                          data-testid={`button-edit-${cat.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setDeletingCategory(cat); setDeleteDialogOpen(true); }}
                          data-testid={`button-delete-${cat.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-category">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? Products in this category will become uncategorized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
