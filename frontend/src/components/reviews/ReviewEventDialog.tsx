import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "./StarRating";
import { Event } from "@/types";
import { EventReviewCreate } from "@/types/review.types";
import { reviewService } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { useState } from "react";
import { Loader2, UtensilsCrossed, Sofa, HeartHandshake } from "lucide-react";

interface ReviewEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Pick<Event, "id" | "title">;
  onReviewSubmitted?: () => void;
}

interface LayerConfig {
  key: "food" | "space" | "host";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  placeholder: string;
}

const LAYERS: LayerConfig[] = [
  {
    key: "food",
    title: "The Food",
    subtitle: "Taste, quantity, temperature",
    icon: <UtensilsCrossed className="h-4 w-4" />,
    placeholder:
      "Did you like the taste? Was there enough for everyone? Did it arrive at the right temperature?",
  },
  {
    key: "space",
    title: "The Space",
    subtitle: "Ambience, comfort, seating",
    icon: <Sofa className="h-4 w-4" />,
    placeholder:
      "Was there enough room for everyone to sit? Was the space comfortable, tight, cozy? Any nice touches like a balcony or good music?",
  },
  {
    key: "host",
    title: "The Host",
    subtitle: "Hospitality and social skills",
    icon: <HeartHandshake className="h-4 w-4" />,
    placeholder:
      "Did they make you feel welcome? Water on the table, Wi-Fi shared, restroom pointed out? Did they keep the conversation flowing?",
  },
];

export function ReviewEventDialog({
  isOpen,
  onClose,
  event,
  onReviewSubmitted,
}: ReviewEventDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [stars, setStars] = useState<Record<string, number>>({ food: 0, space: 0, host: 0 });
  const [comments, setComments] = useState<Record<string, string>>({
    food: "",
    space: "",
    host: "",
  });

  const allRated = LAYERS.every((layer) => stars[layer.key] > 0);
  const missingRequiredComments = LAYERS.filter(
    (layer) => stars[layer.key] > 0 && stars[layer.key] <= 3 && !comments[layer.key].trim(),
  );
  const total = stars.food + stars.space + stars.host;
  const canSubmit = allRated && missingRequiredComments.length === 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const payload: EventReviewCreate = {
        foodStars: stars.food,
        spaceStars: stars.space,
        hostStars: stars.host,
        foodComment: comments.food.trim() || undefined,
        spaceComment: comments.space.trim() || undefined,
        hostComment: comments.host.trim() || undefined,
      };
      await reviewService.submitEventReview(event.id, payload);

      toast({
        title: "Review submitted!",
        description: `You rated this experience ${total}/15. Thanks for the feedback!`,
        className: "bg-green-500 text-white border-green-600",
        duration: 2500,
      });

      setStars({ food: 0, space: 0, host: 0 });
      setComments({ food: "", space: "", host: "" });
      onClose();
      onReviewSubmitted?.();
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to submit review"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate this experience</DialogTitle>
          <DialogDescription>
            {event.title} — rate each part from 1 to 5 stars. For 3 stars or below, tell the
            chef what could be better.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {LAYERS.map((layer) => {
            const layerStars = stars[layer.key];
            const commentRequired = layerStars > 0 && layerStars <= 3;
            const commentMissing = commentRequired && !comments[layer.key].trim();
            return (
              <div key={layer.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-2 text-base font-semibold">
                      {layer.icon}
                      {layer.title}
                    </Label>
                    <p className="text-xs text-muted-foreground">{layer.subtitle}</p>
                  </div>
                  <StarRating
                    value={layerStars}
                    onChange={(value) => setStars((prev) => ({ ...prev, [layer.key]: value }))}
                  />
                </div>
                <Textarea
                  value={comments[layer.key]}
                  onChange={(e) =>
                    setComments((prev) => ({ ...prev, [layer.key]: e.target.value }))
                  }
                  placeholder={layer.placeholder}
                  rows={2}
                  className="resize-none text-sm"
                />
                {commentMissing && (
                  <p className="text-xs text-destructive">
                    Please add a short comment — feedback helps the chef improve.
                  </p>
                )}
              </div>
            );
          })}

          {/* Total preview */}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">
              {allRated ? "Your total score" : "Rate all three to submit"}
            </span>
            <span className="text-2xl font-bold text-primary">
              {allRated ? `${total}/15` : "–/15"}
            </span>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Reviews are public and stay on the chef's profile.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
