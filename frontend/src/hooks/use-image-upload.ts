import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseImageUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface UseImageUploadReturn {
  selectedImage: File | null;
  imagePreview: string | null;
  /** Raw (un-cropped) data URL of the picked file - source for the adjuster */
  rawPreview: string | null;
  rawFileName: string | null;
  /** True right after picking a file, before the crop has been saved */
  needsAdjust: boolean;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called by ImageAdjuster with the baked crop */
  applyAdjustedImage: (file: File, dataUrl: string) => void;
  /** Re-open the adjuster for the already-picked image */
  reAdjust: () => void;
  handleRemoveImage: () => void;
  resetImage: () => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { maxSizeMB = 5, allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"] } =
    options;

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [rawFileName, setRawFileName] = useState<string | null>(null);
  const [needsAdjust, setNeedsAdjust] = useState(false);
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
      setRawFileName(file.name);

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setRawPreview(dataUrl);
        setImagePreview(dataUrl);
        setNeedsAdjust(true); // open the zoom/reposition editor
      };
      reader.readAsDataURL(file);

      // allow re-picking the same file
      e.target.value = "";
    },
    [allowedTypes, maxSizeMB, toast],
  );

  const applyAdjustedImage = useCallback((file: File, dataUrl: string) => {
    setSelectedImage(file);
    setImagePreview(dataUrl);
    setNeedsAdjust(false);
  }, []);

  const reAdjust = useCallback(() => {
    setNeedsAdjust(true);
  }, []);

  const clearAll = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setRawPreview(null);
    setRawFileName(null);
    setNeedsAdjust(false);
  }, []);

  return {
    selectedImage,
    imagePreview,
    rawPreview,
    rawFileName,
    needsAdjust,
    handleImageChange,
    applyAdjustedImage,
    reAdjust,
    handleRemoveImage: clearAll,
    resetImage: clearAll,
  };
}
