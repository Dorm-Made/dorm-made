import { useState, useCallback } from "react";
import { Meal } from "@/types";
import { mealService } from "@/services";

export function useMealDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = useCallback(async (mealId: string) => {
    setIsOpen(true);
    setLoading(true);
    setError(null);

    try {
      const mealData = await mealService.getMeal(mealId);
      setMeal(mealData);
    } catch (err) {
      console.error("Error fetching meal:", err);
      setError("Failed to load meal details");
    } finally {
      setLoading(false);
    }
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setMeal(null);
    setError(null);
  }, []);

  return {
    isOpen,
    meal,
    loading,
    error,
    openDialog,
    closeDialog,
  };
}
