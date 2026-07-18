import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { mealService, authService } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { Meal, User } from "@/types";
import { analytics } from "@/lib/analytics";

export interface MealFormData {
  name: string;
  description: string;
  ingredients: string;
}

const MEAL_DRAFT_KEY = "mealDraft";

function readMealDraft(): MealFormData {
  try {
    const stored = JSON.parse(localStorage.getItem(MEAL_DRAFT_KEY) || "null");
    if (stored && typeof stored === "object") {
      return {
        name: stored.name || "",
        description: stored.description || "",
        ingredients: stored.ingredients || "",
      };
    }
  } catch {
    // corrupted draft - start fresh
  }
  return { name: "", description: "", ingredients: "" };
}

export function useCreateMealForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Drafts survive tab closes, session timeouts, and accidental navigation
  const [formData, setFormData] = useState<MealFormData>(readMealDraft);

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  useEffect(() => {
    const token = authService.getAuthToken();
    const user = localStorage.getItem("currentUser");

    if (!token || !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create meals",
        variant: "destructive",
        duration: 1500,
      });
      navigate("/login");
    }
  }, [navigate, toast]);

  const updateFormData = useCallback((updates: Partial<MealFormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(MEAL_DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setMeal = useCallback((meal: Meal | null) => {
    setSelectedMeal(meal);
  }, []);

  const validateMealDetails = useCallback(() => {
    const requiredFields: (keyof MealFormData)[] = ["name", "description", "ingredients"];
    return requiredFields.every((field) => {
      const value = formData[field];
      return value && value.trim() !== "";
    });
  }, [formData]);

  const submitMeal = useCallback(
    async (image: File | null = null) => {
      const currentUser = localStorage.getItem("currentUser");
      if (!currentUser) {
        toast({
          title: "Please Sign In",
          description: "You need to sign in to create meals",
          variant: "destructive",
          duration: 1500,
        });
        return;
      }

      // Validate required fields
      if (!validateMealDetails()) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
          duration: 1500,
        });
        return;
      }

      setLoading(true);

      try {
        // Check if user has a valid token
        const token = authService.getAuthToken();
        if (!token) {
          toast({
            title: "Authentication Required",
            description: "Please log in to create meals",
            variant: "destructive",
            duration: 1500,
          });
          navigate("/login");
          return;
        }

        // Create FormData to handle both text fields and image upload
        const formDataToSend = new FormData();
        formDataToSend.append("name", formData.name);
        formDataToSend.append("description", formData.description);
        formDataToSend.append("ingredients", formData.ingredients);

        // Add image if provided
        if (image) {
          formDataToSend.append("image", image);
        }

        const meal = await mealService.createMeal(formDataToSend);

        const user: User = JSON.parse(currentUser);
        analytics.mealCreated({ userId: user.id, meal });

        localStorage.removeItem(MEAL_DRAFT_KEY);

        toast({
          title: "Meal created!",
          description: "It's on your profile. Add a photo and a short bio so foodies know who's cooking.",
          className: "bg-green-500 text-white border-green-600",
          duration: 4000,
        });

        // Land on the profile dashboard (My Meals tab) - no surprise detours
        navigate(`/profile/${user.id}?tab=meals`);
      } catch (error) {
        toast({
          title: "Error",
          description: getErrorMessage(error, "Failed to create meal"),
          variant: "destructive",
          duration: 1500,
        });
      } finally {
        setLoading(false);
      }
    },
    [formData, toast, navigate, validateMealDetails],
  );

  return {
    loading,
    formData,
    updateFormData,
    validateMealDetails,
    submitMeal,
  };
}
