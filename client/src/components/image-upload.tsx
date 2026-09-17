import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Link, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null, storageKey?: string | null) => void;
  label?: string;
  className?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only JPEG, PNG, and WebP are allowed.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const fileRef = ref(storage, `products/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          toast({ title: "Upload failed", description: "Image upload failed. Please try again.", variant: "destructive" });
          setUploading(false);
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setStorageKey(uploadTask.snapshot.ref.fullPath);
          onChange(url, uploadTask.snapshot.ref.fullPath);
          setUploading(false);
        }
      );
    } catch (err: unknown) {
      console.error("Upload initialization error:", err);
      toast({ title: "Upload failed", description: "Image upload failed. Please try again.", variant: "destructive" });
      setUploading(false);
    }
  }, [onChange, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [handleFile]);

  const handleUseUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setStorageKey(null);
    onChange(trimmed, null);
    setUrlInput("");
  }, [urlInput, onChange]);

  const handleRemove = useCallback(async () => {
    if (storageKey) {
      try {
        await deleteObject(ref(storage, storageKey));
      } catch (err) {
        console.error("Failed to delete old image:", err);
      }
    }
    setStorageKey(null);
    onChange(null, null);
  }, [storageKey, onChange]);

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <div
        className={`relative rounded-md border-2 border-dashed p-4 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="image-upload-dropzone"
      >
        {uploading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Uploading {Math.round(progress)}%...</p>
          </div>
        )}

        {!uploading && value && (
          <div className="relative">
            <div className="aspect-video w-full overflow-hidden rounded-md">
              <img
                src={value}
                alt="Uploaded"
                className="h-full w-full object-cover"
                data-testid="image-upload-preview"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2"
              onClick={handleRemove}
              data-testid="button-remove-image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!uploading && !value && (
          <div
            className="flex cursor-pointer flex-col items-center justify-center py-8"
            onClick={() => fileInputRef.current?.click()}
            data-testid="image-upload-trigger"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Drop image or click to upload</p>
            <p className="text-xs text-muted-foreground/70 mt-1">JPEG, PNG, WebP up to 5MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileInput}
          data-testid="input-file-upload"
        />
      </div>

      {!value && !uploading && (
        <div className="mt-2 flex items-center gap-2">
          <Link className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Or paste image URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1"
            data-testid="input-image-url"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseUrl}
            disabled={!urlInput.trim()}
            data-testid="button-use-url"
          >
            Use URL
          </Button>
        </div>
      )}
    </div>
  );
}
