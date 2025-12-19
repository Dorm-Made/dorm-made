import { useState, useCallback, useEffect } from "react";
import { Meal } from "@/types";
import { mealService } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { isAxiosError } from "axios";

export function useMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const { toast } = useToast();

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mealService.getMyMeals();
      setMeals(data);
    } catch (error) {
      console.error("Error fetching meals:", error);

      if (isAxiosError(error)) {
        if (error.response?.status !== 401) {
          toast({
            title: "Error",
            description: getErrorMessage(error, "Failed to load meals"),
            variant: "destructive",
            duration: 3000,
          });
        }
      }
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const selectMeal = useCallback((meal: Meal) => {
    setSelectedMeal(meal);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMeal(null);
  }, []);

  return {
    meals,
    loading,
    selectedMeal,
    selectMeal,
    clearSelection,
    refreshMeals: fetchMeals,
  };
}
