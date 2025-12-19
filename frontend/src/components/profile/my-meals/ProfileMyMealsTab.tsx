import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MealCard } from "@/components/meals/MealCard";
import { Meal } from "@/types";
import { mealService } from "@/services";

interface ProfileMyMealsTabProps {
  userId: string;
  isOwnProfile: boolean;
  userName: string;
}

export function ProfileMyMealsTab({ userId, isOwnProfile, userName }: ProfileMyMealsTabProps) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserMeals = async () => {
    setLoading(true);
    try {
      const data = await mealService.getUserMeals(userId);
      setMeals(data);
    } catch (error) {
      console.error("Error fetching user meals:", error);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserMeals();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meals...</p>
        </div>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🍳</div>
        <h3 className="text-lg font-semibold mb-2">No meals created yet</h3>
        <p className="text-muted-foreground mb-4">
          {isOwnProfile
            ? "Create your first meal recipe to get started!"
            : `${userName} hasn't created any meals yet.`}
        </p>
        {isOwnProfile && (
          <Button asChild>
            <Link to="/create-meal">Create Meal</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto gap-4 pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
      {meals.map((meal) => (
        <MealCard key={meal.id} meal={meal} expandOnTap={true} onMealUpdated={fetchUserMeals} />
      ))}
    </div>
  );
}
