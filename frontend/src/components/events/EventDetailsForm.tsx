import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Crop, Upload, X } from "lucide-react";
import { EventFormData } from "@/hooks/use-create-event-form";
import { ImageAdjuster } from "@/components/shared/ImageAdjuster";
import { LIMITS, charCount } from "@/lib/limits";
import { formatPriceForDisplay, handlePriceInput, handlePriceBackspace, CURRENCIES, getCurrencySymbol } from "@/utils/price";

interface EventDetailsFormProps {
  formData: EventFormData;
  onInputChange: (updates: Partial<EventFormData>) => void;
  imagePreview: string | null;
  rawPreview: string | null;
  rawFileName: string | null;
  needsAdjust: boolean;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyAdjusted: (file: File, dataUrl: string) => void;
  onReAdjust: () => void;
  onRemoveImage: () => void;
}

export default function EventDetailsForm({
  formData,
  onInputChange,
  imagePreview,
  rawPreview,
  rawFileName,
  needsAdjust,
  onImageChange,
  onApplyAdjusted,
  onReAdjust,
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
              maxLength={LIMITS.EVENT_TITLE}
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
              maxLength={LIMITS.EVENT_DESCRIPTION}
              required
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {charCount(formData.description, LIMITS.EVENT_DESCRIPTION)}
            </p>
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
              max="25"
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

          {/* Price and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {getCurrencySymbol(formData.currency)}
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
                Price per participant
              </p>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={(e) => onInputChange({ currency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.symbol} ({c.value.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
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
              maxLength={LIMITS.EVENT_LOCATION}
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
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground transition-colors">
                <Input
                  id="event-image"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={onImageChange}
                  className="hidden"
                />
                <label htmlFor="event-image" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Click to upload event image
                  </p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG or WebP (max. 5MB)</p>
                </label>
              </div>
            ) : needsAdjust && rawPreview ? (
              <ImageAdjuster
                src={rawPreview}
                aspect={16 / 9}
                fileName={rawFileName || "event.jpg"}
                onApply={onApplyAdjusted}
                onCancel={onRemoveImage}
              />
            ) : (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Event preview"
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={onReAdjust}
                    aria-label="Adjust image"
                  >
                    <Crop className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={onRemoveImage}
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
