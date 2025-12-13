import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createMeal, getAuthToken } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { Meal } from "@/types";

export interface MealFormData {
  name: string;
  description: string;
  ingredients: string;
}

export function useCreateMealForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<MealFormData>({
    name: "",
    description: "",
    ingredients: "",
  });

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  useEffect(() => {
    const token = getAuthToken();
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
    setFormData((prev) => ({ ...prev, ...updates }));
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
        const token = getAuthToken();
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

        await createMeal(formDataToSend);

        toast({
          title: "Success!",
          description: "Meal created successfully!",
          className: "bg-green-500 text-white border-green-600",
          duration: 1500,
        });

        navigate("/create-event");
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
