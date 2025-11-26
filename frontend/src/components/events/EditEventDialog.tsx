import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Event, EventUpdate } from "@/types";
import { Loader2 } from "lucide-react";
import {
  formatPriceForDisplay,
  handlePriceInput,
  handlePriceBackspace,
  initializePriceFromCents,
  getPriceInCents
} from "@/utils/price";

interface EditEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  loading: boolean;
  onSave: (updates: EventUpdate) => void;
}

interface FormData {
  title: string;
  description: string;
  maxParticipants: string;
  location: string;
  eventDate: string;
  price: string;
}

export function EditEventDialog({
  isOpen,
  onClose,
  event,
  loading,
  onSave,
}: EditEventDialogProps) {
  // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState<FormData>({
    title: event.title,
    description: event.description,
    maxParticipants: String(event.maxParticipants),
    location: event.location,
    eventDate: formatDateForInput(event.eventDate),
    price: initializePriceFromCents(event.price),
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePriceChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = handlePriceInput(formData.price || "0", e.target.value);
    setFormData((prev) => ({ ...prev, price: newValue }));
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const newValue = handlePriceBackspace(formData.price || "0");
      setFormData((prev) => ({ ...prev, price: newValue }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: EventUpdate = {
      title: formData.title,
      description: formData.description,
      maxParticipants: parseInt(formData.maxParticipants),
      location: formData.location,
      eventDate: formData.eventDate,
      price: getPriceInCents(formData.price),
    };

    onSave(updates);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Event Title */}
            <div>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Pasta Night with Friends"
                required
              />
            </div>

            {/* Event Description */}
            <div>
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe what participants will learn and experience..."
                rows={3}
                required
              />
            </div>

            {/* Max Participants and Event Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  name="maxParticipants"
                  type="number"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  placeholder="6"
                  min="1"
                  max="20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="eventDate">Event Date & Time</Label>
                <Input
                  id="eventDate"
                  name="eventDate"
                  type="datetime-local"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="price">Price (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  name="price"
                  type="text"
                  value={formatPriceForDisplay(formData.price || "0")}
                  onChange={handlePriceChangeLocal}
                  onKeyDown={handlePriceKeyDown}
                  placeholder="0.00"
                  className="pl-7"
                  inputMode="numeric"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Price per participant in dollars
              </p>
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Dorm Kitchen 3A, Student Center Kitchen"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}