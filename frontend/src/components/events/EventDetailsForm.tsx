import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { EventFormData } from "@/hooks/use-create-event-form";
import { formatPriceForDisplay, handlePriceInput, handlePriceBackspace } from "@/utils/price";

interface EventDetailsFormProps {
  formData: EventFormData;
  onInputChange: (updates: Partial<EventFormData>) => void;
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export default function EventDetailsForm({
  formData,
  onInputChange,
  imagePreview,
  onImageChange,
  onRemoveImage,
}: EventDetailsFormProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onInputChange({ [name]: value });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = handlePriceInput(formData.price || "0", e.target.value);
    onInputChange({ price: newValue });
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const newValue = handlePriceBackspace(formData.price || "0");
      onInputChange({ price: newValue });
    }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold mb-2">Event details</h1>
        <p className="text-muted-foreground">Tell us about your culinary event</p>
      </div>

      <div className="space-y-8">
        <div className="grid-cols-2 gap-6">
          {/* Event Title */}
          <div className="col-span-2">
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
          <div className="col-span-2">
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
                onChange={handlePriceChange}
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
          <div className="col-span-2">
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

          {/* Event Image Upload */}
          <div className="md:col-span-2">
            <Label htmlFor="event-image">Event Image (Optional)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Upload an image for your event (Max 5MB, JPEG/PNG/WebP)
            </p>

            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Input
                  id="event-image"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={onImageChange}
                  className="hidden"
                />
                <label htmlFor="event-image" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Click to upload event image
                  </p>
                  <p className="text-xs text-gray-500">JPEG, PNG or WebP (max. 5MB)</p>
                </label>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Event preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={onRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
