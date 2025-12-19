import { httpClient } from "./http-client";
import { Meal, MealCreate, MealUpdate } from "@/types";

async function createMeal(mealData: MealCreate | FormData): Promise<Meal> {
  const response = await httpClient.post("/meals/", mealData);
  return response.data;
}

async function getMyMeals(): Promise<Meal[]> {
  const response = await httpClient.get("/meals/me");
  return response.data;
}

async function getUserMeals(userId: string): Promise<Meal[]> {
  const response = await httpClient.get("/meals/", {
    params: { user_id: userId },
  });
  return response.data;
}

async function getMeal(mealId: string): Promise<Meal> {
  const response = await httpClient.get(`/meals/${mealId}`);
  return response.data;
}

async function updateMeal(mealId: string, mealData: MealUpdate): Promise<Meal> {
  const response = await httpClient.put(`/meals/${mealId}`, mealData);
  return response.data;
}

async function deleteMeal(mealId: string): Promise<{ message: string; meal_id: string }> {
  const response = await httpClient.delete(`/meals/${mealId}`);
  return response.data;
}

export const mealService = {
  createMeal,
  getMyMeals,
  getUserMeals,
  getMeal,
  updateMeal,
  deleteMeal,
};
