import { useState, useRef, useCallback } from "react";
import { userService, authService } from "@/services";
import { User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { isAxiosError } from "axios";
import { getErrorMessage } from "@/utils";

interface UseProfilePhotoReturn {
  uploadingPhoto: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUploadPhoto: (file: File, userId: string) => Promise<void>;
}

/**
 * Custom hook for handling profile photo uploads
 */
export function useProfilePhoto(onPhotoUploaded?: (user: User) => void): UseProfilePhotoReturn {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUploadPhoto = useCallback(
    async (file: File, userId: string): Promise<void> => {
      if (!userId) return;

      try {
        setUploadingPhoto(true);
        const updatedUser = await userService.uploadProfilePicture(userId, file);

        // Update localStorage
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));

        toast({
          title: "Sucesso!",
          description: "Foto de perfil atualizada com sucesso",
          className: "bg-green-500 text-white border-green-600",
          duration: 1500,
        });

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        if (onPhotoUploaded) {
          onPhotoUploaded(updatedUser);
        }
      } catch (error) {
        console.error("Error fetching meals:", error);

        if (isAxiosError(error)) {
          if (error.response?.status !== 401) {
            toast({
              title: "Error",
              description: getErrorMessage(error, "Failed to change profile photo"),
              variant: "destructive",
              duration: 3000,
            });
          }
        }
      } finally {
        setUploadingPhoto(false);
      }
    },
    [toast, onPhotoUploaded, fileInputRef],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Erro",
          description: "Apenas arquivos JPEG e PNG são permitidos",
          variant: "destructive",
          duration: 1500,
        });
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "Erro",
          description: "O arquivo excede o limite de 5MB",
          variant: "destructive",
          duration: 1500,
        });
        return;
      }

      // File is valid, trigger upload
      // Note: The actual upload logic needs to be triggered by the parent component
      // by calling handleUploadPhoto with the file and userId
    },
    [toast],
  );

  return {
    uploadingPhoto,
    fileInputRef,
    handleFileSelect,
    handleUploadPhoto,
  };
}
