import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseImageUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface UseImageUploadReturn {
  selectedImage: File | null;
  imagePreview: string | null;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  resetImage: () => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { maxSizeMB = 5, allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"] } =
    options;

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `Please select a ${allowedTypes.map((t) => t.split("/")[1].toUpperCase()).join(", ")} image`,
          variant: "destructive",
          duration: 1500,
        });
        return;
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast({
          title: "File too large",
          description: `Image size must be less than ${maxSizeMB}MB`,
          variant: "destructive",
          duration: 1500,
        });
        return;
      }

      setSelectedImage(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [allowedTypes, maxSizeMB, toast],
  );

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
  }, []);

  const resetImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
  }, []);

  return {
    selectedImage,
    imagePreview,
    handleImageChange,
    handleRemoveImage,
    resetImage,
  };
}
