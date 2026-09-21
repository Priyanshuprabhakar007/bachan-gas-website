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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Package, Pencil } from "lucide-react";
import { apiRequest, queryClient, resolveUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";
import { GalleryUpload } from "@/components/gallery-upload";
import type { Product, Category, ProductImage } from "@shared/schema";

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE": return "bg-green-500/15 text-green-400";
    case "DRAFT": return "bg-yellow-500/15 text-yellow-400";
    case "ARCHIVED": return "bg-gray-500/15 text-gray-400";
    default: return "";
  }
}

function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const defaultForm = {
  name: "", slug: "", type: "DOMESTIC_14", categoryId: "",
  price: "", basePricePaise: "", weight: "", unit: "KG",
  stockQty: "", description: "", status: "ACTIVE",
  inStock: true, isActive: true, imageUrl: "" as string | null,
};

export default function ProductsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/admin/categories"],
  });

  const { data: galleryImages } = useQuery<ProductImage[]>({
    queryKey: ["/api/products", editingProduct?.id, "images"],
    enabled: !!editingProduct,
    queryFn: async () => {
      if (!editingProduct) return [];
      const res = await fetch(resolveUrl(`/api/products/${editingProduct.id}/images`), { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product created" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create product", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiRequest("PUT", `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product updated" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update product", description: error.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData(defaultForm);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      type: product.type,
      categoryId: product.categoryId ? String(product.categoryId) : "",
      price: product.price,
      basePricePaise: String(product.basePricePaise),
      weight: product.weight || "",
      unit: product.unit || "KG",
      stockQty: String(product.stockQty ?? 0),
      description: product.description || "",
      status: product.status ?? "ACTIVE",
      inStock: product.inStock !== false,
      isActive: product.isActive !== false,
      imageUrl: product.imageUrl || null,
    });
    setDialogOpen(true);
  }

  function generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      type: formData.type,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
      price: formData.price.replace(/[^0-9.]/g, ""),
      basePricePaise: parseInt(formData.basePricePaise) || 0,
      weight: formData.weight || null,
      unit: formData.unit || "KG",
      stockQty: parseInt(formData.stockQty) || 0,
      description: formData.description || null,
      status: formData.status,
      inStock: formData.inStock,
      isActive: formData.isActive,
      imageUrl: formData.imageUrl || null,
    };
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6" data-testid="products-loading">
        <h1 className="text-2xl font-semibold mb-6">Products</h1>
        <ProductsSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="products-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-product">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-product">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>{editingProduct ? "Update product details." : "Fill in details to create a product."}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" data-testid="input-product-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: editingProduct ? formData.slug : generateSlug(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-slug">Slug</Label>
                <Input id="p-slug" data-testid="input-product-slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger data-testid="select-product-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOMESTIC_14">Domestic 14.2kg</SelectItem>
                      <SelectItem value="DOMESTIC_5">Domestic 5kg</SelectItem>
                      <SelectItem value="COMMERCIAL_19">Commercial 19kg</SelectItem>
                      <SelectItem value="LARGE_47">Large 47kg</SelectItem>
                      <SelectItem value="COMPOSITE">Composite</SelectItem>
                      <SelectItem value="SAFETY">Safety Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                    <SelectTrigger data-testid="select-product-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.icon} {cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="p-price">Price ({"\u20B9"})</Label>
                  <Input id="p-price" type="number" step="0.01" min="0" placeholder="e.g. 629" data-testid="input-product-price" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-base-price">Base Price (Paise)</Label>
                  <Input id="p-base-price" type="number" data-testid="input-product-base-price" value={formData.basePricePaise} onChange={(e) => setFormData({ ...formData, basePricePaise: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="p-weight">Weight</Label>
                  <Input id="p-weight" data-testid="input-product-weight" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="e.g. 14.2" />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger data-testid="select-product-unit"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="LTR">LTR</SelectItem>
                      <SelectItem value="PCS">PCS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-stock">Stock Qty</Label>
                  <Input id="p-stock" type="number" data-testid="input-product-stock" value={formData.stockQty} onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger data-testid="select-product-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-desc">Description</Label>
                <Input id="p-desc" data-testid="input-product-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <ImageUpload
                label="Primary Image"
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                data-testid="image-upload-primary"
              />

              {editingProduct && (
                <div className="space-y-2">
                  <Label>Gallery Images</Label>
                  <GalleryUpload
                    productId={editingProduct.id}
                    images={galleryImages || []}
                    onImagesChange={() => queryClient.invalidateQueries({ queryKey: ["/api/products", editingProduct.id, "images"] })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <Label>In Stock</Label>
                <Switch checked={formData.inStock} onCheckedChange={(v) => setFormData({ ...formData, inStock: v })} data-testid="switch-in-stock" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label>Active (visible to customers)</Label>
                <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} data-testid="switch-is-active" />
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="button-submit-product" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(!products || products.length === 0) ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-products">No products found</p>
            </CardContent>
          </Card>
        ) : (
          products.map((product) => {
            const category = categories?.find(c => c.id === product.categoryId);
            return (
              <Card key={product.id} data-testid={`card-product-${product.id}`}>
                {product.imageUrl ? (
                  <div className="aspect-video w-full overflow-hidden rounded-t-md">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      data-testid={`img-product-${product.id}`}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-t-md bg-muted">
                    <Package className="h-10 w-10 text-muted-foreground" data-testid={`placeholder-product-${product.id}`} />
                  </div>
                )}
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base font-semibold truncate" data-testid={`text-product-name-${product.id}`}>
                      {product.name}
                    </CardTitle>
                    {category && (
                      <Badge variant="secondary" className="text-xs">{category.icon} {category.name}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className={getStatusBadgeClass(product.status ?? "ACTIVE")} data-testid={`badge-status-${product.id}`}>
                      {product.status ?? "ACTIVE"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-semibold" data-testid={`text-price-${product.id}`}>{"\u20B9"}{product.price}</span>
                  </div>
                  {product.weight && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Weight</span>
                      <span className="font-semibold">{product.weight} {product.unit || "KG"}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Stock</span>
                    <span className="font-semibold" data-testid={`text-stock-${product.id}`}>{product.stockQty ?? 0}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Availability</span>
                    <Badge variant="secondary" className={product.inStock !== false ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}>
                      {product.inStock !== false ? "In Stock" : "Out of Stock"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
