import { Meal } from "@/types";
import { MealCard } from "@/components/meals/MealCard";
import { CreateMealCard } from "@/components/meals/CreateMealCard";

interface SelectMealProps {
  meals: Meal[];
  loading: boolean;
  selectedMeal: Meal | null;
  onSelectMeal: (meal: Meal) => void;
}

export default function SelectMeal({
  meals,
  loading,
  selectedMeal,
  onSelectMeal,
}: SelectMealProps) {
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Add a recipe <span className="text-muted-foreground font-normal text-xl">(optional)</span>
          </h1>
          <p className="text-muted-foreground">
            Attach one of your dishes, or just tap Next to host a thematic event with no specific recipe.
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose the event meal</h1>
        <p className="text-muted-foreground">Select one of your meals for this event</p>
      </div>

      {/* Meal Cards Grid */}
      {meals.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="max-w-sm">
            <CreateMealCard />
          </div>
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-4 pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          <CreateMealCard />
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              isSelected={selectedMeal?.id === meal.id}
              onTap={onSelectMeal}
              showActions={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
