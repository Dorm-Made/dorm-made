import { httpClient } from "./http-client";
import { Meal, MealCreate, MealUpdate } from "@/types";

export const createMeal = async (mealData: MealCreate | FormData): Promise<Meal> => {
  const response = await httpClient.post("/meals/", mealData);
  return response.data;
};

export const getMyMeals = async (): Promise<Meal[]> => {
  const response = await httpClient.get("/meals/me");
  return response.data;
};

export const getUserMeals = async (userId: string): Promise<Meal[]> => {
  const response = await httpClient.get("/meals/", {
    params: { user_id: userId },
  });
  return response.data;
};

export const getMeal = async (mealId: string): Promise<Meal> => {
  const response = await httpClient.get(`/meals/${mealId}`);
  return response.data;
};

export const updateMeal = async (mealId: string, mealData: MealUpdate): Promise<Meal> => {
  const response = await httpClient.put(`/meals/${mealId}`, mealData);
  return response.data;
};

export const deleteMeal = async (mealId: string): Promise<{ message: string; meal_id: string }> => {
  const response = await httpClient.delete(`/meals/${mealId}`);
  return response.data;
};
