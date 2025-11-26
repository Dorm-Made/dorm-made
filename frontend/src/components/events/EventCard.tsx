import { Event, EventUpdate } from "@/types";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Clock, MapPin, User, Users, UtensilsCrossed, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useMealDialog } from "@/hooks/use-meal-dialog";
import { MealDialog } from "../meals/MealDialog";
import { EditEventDialog } from "./EditEventDialog";
import { DeleteEventDialog } from "./DeleteEventDialog";
import { useNavigate } from "react-router-dom";
import { useEditEvent } from "@/hooks/use-edit-event";
import { deleteEvent } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { useState } from "react";

interface EventCardProps {
  event: Event;
  activeTab: string;
  onJoinEvent?: (eventId: string) => void;
  onEventUpdated?: () => void;
  showActions?: boolean;
}

export function EventCard({
  event,
  activeTab,
  onJoinEvent,
  onEventUpdated,
  showActions = true,
}: EventCardProps) {
  const { isOpen, meal, loading, error, openDialog, closeDialog } = useMealDialog();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    isOpen: isEditDialogOpen,
    loading: isUpdating,
    openDialog: openEditDialog,
    closeDialog: closeEditDialog,
    updateEventData,
  } = useEditEvent(onEventUpdated);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const isHost = currentUser && currentUser.id === event.hostUserId;

  const handleMealClick = () => {
    if (event.mealId) {
      openDialog(event.mealId);
    }
  };

  const handleSaveEdit = async (updates: EventUpdate) => {
    await updateEventData(event.id, updates);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteEvent(event.id);

      toast({
        title: "Success!",
        description: "Event deleted successfully!",
        className: "bg-green-500 text-white border-green-600",
        duration: 1500,
      });

      setIsDeleteDialogOpen(false);

      // Refresh the event list
      if (onEventUpdated) {
        onEventUpdated();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to delete event"),
        variant: "destructive",
        duration: 3000,
      });
      console.error("Error deleting event:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        key={event.id}
        className="flex flex-col over:shadow-lg transition-shadow min-w-[85vw] lg:min-w-0"
      >
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-2">🍳</div>
              <p className="text-sm text-muted-foreground">Culinary Event</p>
            </div>
          )}
          {/* Edit and Delete Icons - Top Left (only for host) */}
          {isHost && showActions && (
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <button
                onClick={openEditDialog}
                className="bg-background/90 backdrop-blur-sm p-2 rounded-md shadow-md hover:bg-background transition-colors"
                aria-label="Edit event"
              >
                <Pencil className="h-4 w-4 text-primary" />
              </button>
              <button
                onClick={handleDeleteClick}
                className="bg-background/90 backdrop-blur-sm p-2 rounded-md shadow-md hover:bg-background transition-colors"
                aria-label="Delete event"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          )}
          {/* Price Badge - Top Right */}
          <div className="absolute top-3 right-3">
            <div className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-md">
              <span className="text-lg font-bold text-primary">
                ${(event.price / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="flex flex-col justify-between flex-grow p-4">
          <h3 className="font-semibold text-lg mb-2">{event.title}</h3>

          {/* Clickable Meal Name */}
          {event.mealName && (
            <div className="flex items-center text-sm mb-2">
              <UtensilsCrossed className="h-4 w-4 mr-2 text-muted-foreground" />
              <button
                onClick={handleMealClick}
                className="text-primary hover:text-primary/80 underline underline-offset-2 cursor-pointer transition-colors"
              >
                {event.mealName}
              </button>
            </div>
          )}

          {/* Clickable Meal Name */}
          {event.hostUserId && (
            <div className="flex items-center text-sm mb-2">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <button
                onClick={() => navigate(`/profile/${event.hostUserId}`)}
                className="text-primary hover:text-primary/80 underline underline-offset-2 cursor-pointer transition-colors"
              >
                See host profile
              </button>
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            {formatDate(event.eventDate)}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            {event.location}
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-2" />
            {event.currentParticipants}/{event.maxParticipants} participants
          </div>
          {activeTab === "all" && onJoinEvent && (
            <Button
              className="mx-4 mt-8"
              onClick={() => onJoinEvent(event.id)}
              disabled={event.currentParticipants >= event.maxParticipants}
            >
              {event.currentParticipants >= event.maxParticipants ? "Event Full" : "Join Event"}
            </Button>
          )}
        </CardContent>
      </Card>

      <MealDialog
        isOpen={isOpen}
        onClose={closeDialog}
        meal={meal}
        loading={loading}
        error={error}
      />

      <EditEventDialog
        isOpen={isEditDialogOpen}
        onClose={closeEditDialog}
        event={event}
        loading={isUpdating}
        onSave={handleSaveEdit}
      />

      <DeleteEventDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        event={event}
        loading={isDeleting}
        onConfirmDelete={handleConfirmDelete}
      />
    </>
  );
}
