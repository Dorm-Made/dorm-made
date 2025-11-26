import { EventFormData } from "@/hooks/use-create-event-form";
import { Meal } from "@/types";
import { Calendar, MapPin, Users, DollarSign, ChefHat } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceForDisplay } from "@/utils/price";

interface EventSummaryProps {
  selectedMeal: Meal | null;
  formData: EventFormData;
  imagePreview: string | null;
}

export default function EventSummary({
  selectedMeal,
  formData,
  imagePreview,
}: EventSummaryProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">Review Your Event</h1>
        <p className="text-muted-foreground">
          Make sure everything looks good before creating your event
        </p>
      </div>

      {/* Event Image */}
      {imagePreview && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={imagePreview}
            alt="Event preview"
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      {/* Meal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            <CardTitle>Meal</CardTitle>
          </div>
          <CardDescription>What you'll be cooking together</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedMeal ? (
            <>
              <div>
                <h3 className="font-semibold text-lg">{selectedMeal.title}</h3>
                <p className="text-muted-foreground mt-1">{selectedMeal.description}</p>
              </div>
              {selectedMeal.ingredients && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Ingredients:</h4>
                  <p className="text-sm text-muted-foreground">{selectedMeal.ingredients}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No meal selected</p>
          )}
        </CardContent>
      </Card>

      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>Information about your cooking event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{formData.title || "Untitled Event"}</h3>
            <p className="text-muted-foreground mt-1">
              {formData.description || "No description provided"}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatDate(formData.eventDate)}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formData.location || "Location not set"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formData.maxParticipants
                  ? `Up to ${formData.maxParticipants} participants`
                  : "No limit set"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                ${formatPriceForDisplay(formData.price || "0")} per participant
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}