import { useState } from "react";
import { mealService } from "@/services";
import { Meal, MealUpdate } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";

interface UseEditMealReturn {
  isOpen: boolean;
  loading: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  updateMealData: (mealId: string, updates: MealUpdate) => Promise<Meal | null>;
}

export function useEditMeal(onSuccess?: () => void): UseEditMealReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const openDialog = () => {
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  const updateMealData = async (mealId: string, updates: MealUpdate): Promise<Meal | null> => {
    try {
      setLoading(true);
      const updatedMeal = await mealService.updateMeal(mealId, updates);

      toast({
        title: "Success!",
        description: "Meal updated successfully!",
        className: "bg-green-500 text-white border-green-600",
        duration: 1500,
      });

      closeDialog();

      if (onSuccess) {
        onSuccess();
      }

      return updatedMeal;
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to update meal"),
        variant: "destructive",
        duration: 3000,
      });
      console.error("Error updating meal:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    isOpen,
    loading,
    openDialog,
    closeDialog,
    updateMealData,
  };
}
