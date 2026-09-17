import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProductImage } from "@shared/schema";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

interface GalleryUploadProps {
  productId: number;
  images: ProductImage[];
  onImagesChange: () => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function GalleryUpload({ productId, images, onImagesChange }: GalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sortedImages = [...images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const handleFileUpload = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only JPEG, PNG, and WebP are allowed.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileRef = ref(storage, `products/${productId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      await apiRequest("POST", `/api/products/${productId}/images`, {
        imageUrl: url,
        storageKey: fileRef.fullPath,
        sortOrder: sortedImages.length,
      });

      onImagesChange();
    } catch (err: unknown) {
      console.error("Gallery upload error:", err);
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Failed to add image", description: "Image upload failed. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [productId, sortedImages.length, onImagesChange, toast]);

  async function handleRemove(image: ProductImage) {
    setRemovingId(image.id);
    try {
      await apiRequest("DELETE", `/api/products/${productId}/images/${image.id}`);
      if (image.storageKey) {
        try {
          await deleteObject(ref(storage, image.storageKey));
        } catch (err) {
          console.error("Failed to delete old image:", err);
        }
      }
      onImagesChange();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Failed to remove image", description: message, variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  }

  async function handleReorder(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sortedImages.length) return;

    const newOrder = [...sortedImages];
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];

    setReordering(true);
    try {
      await apiRequest("PUT", `/api/products/${productId}/images/reorder`, {
        imageIds: newOrder.map((img) => img.id),
      });
      onImagesChange();
    } catch {
      toast({ title: "Failed to reorder", variant: "destructive" });
    } finally {
      setReordering(false);
    }
  }

  return (
    <div data-testid="gallery-upload">
      <div className="grid grid-cols-4 gap-2">
        {sortedImages.map((image, index) => (
          <div
            key={image.id}
            className="group relative aspect-square overflow-hidden rounded-md border"
            data-testid={`gallery-image-${image.id}`}
          >
            <img
              src={image.imageUrl}
              alt={`Gallery ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-start justify-end gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ visibility: "visible" }}>
              <div className="flex flex-col gap-0.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === 0 || reordering}
                  onClick={() => handleReorder(index, "up")}
                  data-testid={`button-gallery-up-${image.id}`}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === sortedImages.length - 1 || reordering}
                  onClick={() => handleReorder(index, "down")}
                  data-testid={`button-gallery-down-${image.id}`}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-6 w-6"
                disabled={removingId === image.id}
                onClick={() => handleRemove(image)}
                data-testid={`button-gallery-remove-${image.id}`}
              >
                {removingId === image.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="flex aspect-square items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-gallery-add"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        data-testid="input-gallery-file"
      />
    </div>
  );
}
