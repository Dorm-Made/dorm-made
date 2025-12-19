import { Meal, MealUpdate } from "@/types";
import { Card, CardContent } from "../ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { useMealDialog } from "@/hooks/use-meal-dialog";
import { MealDialog } from "./MealDialog";
import { EditMealDialog } from "./EditMealDialog";
import { DeleteMealDialog } from "./DeleteMealDialog";
import { useEditMeal } from "@/hooks/use-edit-meal";
import { mealService } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { useState } from "react";

interface MealCardProps {
  meal: Meal;
  isSelected?: boolean;
  onTap?: (meal: Meal) => void;
  expandOnTap?: boolean;
  onMealUpdated?: () => void;
  showActions?: boolean;
}

/**
 * MealCard component for displaying a recipe/meal
 * Styled similarly to EventCard for consistency
 */
export function MealCard({
  meal,
  isSelected = false,
  onTap,
  expandOnTap = false,
  onMealUpdated,
  showActions = true,
}: MealCardProps) {
  const { isOpen, meal: dialogMeal, loading, error, openDialog, closeDialog } = useMealDialog();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    isOpen: isEditDialogOpen,
    loading: isUpdating,
    openDialog: openEditDialog,
    closeDialog: closeEditDialog,
    updateMealData,
  } = useEditMeal(onMealUpdated);

  // Check if current user is the meal creator
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const isCreator = currentUser && currentUser.id === meal.userId;

  const internalOnTap = (e: React.MouseEvent) => {
    // Don't trigger tap if clicking on edit/delete buttons
    const target = e.target as HTMLElement;
    if (
      target.closest('button[aria-label="Edit meal"]') ||
      target.closest('button[aria-label="Delete meal"]')
    ) {
      return;
    }

    onTap?.(meal);

    if (expandOnTap) {
      openDialog(meal.id);
    }
  };

  const handleSaveEdit = async (updates: MealUpdate) => {
    await updateMealData(meal.id, updates);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEditDialog();
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await mealService.deleteMeal(meal.id);

      toast({
        title: "Success!",
        description: "Meal deleted successfully!",
        className: "bg-green-500 text-white border-green-600",
        duration: 1500,
      });

      setIsDeleteDialogOpen(false);

      // Refresh the meal list
      if (onMealUpdated) {
        onMealUpdated();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to delete meal"),
        variant: "destructive",
        duration: 3000,
      });
      console.error("Error deleting meal:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        className={`flex flex-col hover:shadow-lg transition-all cursor-pointer min-w-[85vw] lg:min-w-0 ${
          isSelected ? "ring-2 ring-primary shadow-lg" : ""
        }`}
        onClick={internalOnTap}
      >
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
          {meal.imageUrl ? (
            <img src={meal.imageUrl} alt={meal.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="text-sm text-muted-foreground">No Image</p>
            </div>
          )}
          {/* Edit and Delete Icons - Top Left (only for creator) */}
          {isCreator && showActions && (
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <button
                onClick={handleEditClick}
                className="bg-background/90 backdrop-blur-sm p-2 rounded-md shadow-md hover:bg-background transition-colors"
                aria-label="Edit meal"
              >
                <Pencil className="h-4 w-4 text-primary" />
              </button>
              <button
                onClick={handleDeleteClick}
                className="bg-background/90 backdrop-blur-sm p-2 rounded-md shadow-md hover:bg-background transition-colors"
                aria-label="Delete meal"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          )}
        </div>

        <CardContent className="flex flex-col justify-between flex-grow p-4">
          <h3 className="font-semibold text-lg mb-2">{meal.title}</h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{meal.description}</p>
        </CardContent>
      </Card>

      <MealDialog
        isOpen={isOpen}
        onClose={closeDialog}
        meal={dialogMeal}
        loading={loading}
        error={error}
      />

      <EditMealDialog
        isOpen={isEditDialogOpen}
        onClose={closeEditDialog}
        meal={meal}
        loading={isUpdating}
        onSave={handleSaveEdit}
      />

      <DeleteMealDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        meal={meal}
        loading={isDeleting}
        onConfirmDelete={handleConfirmDelete}
      />
    </>
  );
}
