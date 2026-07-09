import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";
import { EventParticipant } from "@/types/event.types";
import { GuestReview } from "@/types/review.types";
import { eventService, reviewService } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { useEffect, useState } from "react";
import { Loader2, Users, Check } from "lucide-react";

interface RateGuestsDialogProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

interface GuestFormState {
  sociability: number;
  etiquette: number;
  comment: string;
  submitting: boolean;
}

const emptyForm: GuestFormState = {
  sociability: 0,
  etiquette: 0,
  comment: "",
  submitting: false,
};

export function RateGuestsDialog({
  eventId,
  eventTitle,
  isOpen,
  onClose,
}: RateGuestsDialogProps) {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [existingReviews, setExistingReviews] = useState<GuestReview[]>([]);
  const [forms, setForms] = useState<Record<string, GuestFormState>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [participantsData, reviewsData] = await Promise.all([
        eventService.getEventParticipants(eventId),
        reviewService.getEventGuestReviews(eventId),
      ]);
      setParticipants(participantsData.filter((p) => p.status === "confirmed"));
      setExistingReviews(reviewsData);
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to load guests"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getForm = (guestId: string): GuestFormState => forms[guestId] ?? emptyForm;

  const updateForm = (guestId: string, updates: Partial<GuestFormState>) => {
    setForms((prev) => ({ ...prev, [guestId]: { ...getForm(guestId), ...updates } }));
  };

  const reviewFor = (guestId: string) =>
    existingReviews.find((review) => review.guestId === guestId);

  const handleSubmit = async (guestId: string) => {
    const form = getForm(guestId);
    if (form.sociability === 0 || form.etiquette === 0 || form.submitting) return;

    try {
      updateForm(guestId, { submitting: true });
      const created = await reviewService.submitGuestReview(eventId, {
        guestId,
        sociabilityStars: form.sociability,
        etiquetteStars: form.etiquette,
        comment: form.comment.trim() || undefined,
      });
      setExistingReviews((prev) => [...prev, created]);

      toast({
        title: "Guest rated!",
        description: `${created.totalStars}/10 submitted.`,
        className: "bg-green-500 text-white border-green-600",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to submit guest review"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      updateForm(guestId, { submitting: false });
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rate your guests
          </DialogTitle>
          <DialogDescription>
            {eventTitle} — rate each confirmed guest on sociability and etiquette (1-5 stars
            each).
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : participants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No confirmed guests to rate
            </p>
          ) : (
            <div className="space-y-4">
              {participants.map((participant) => {
                const existing = reviewFor(participant.id);
                const form = getForm(participant.id);
                const canSubmit =
                  form.sociability > 0 && form.etiquette > 0 && !form.submitting;

                return (
                  <div
                    key={participant.id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={participant.profile_picture || undefined}
                            alt={participant.name}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(participant.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{participant.name}</span>
                      </div>
                      {existing && (
                        <span className="flex items-center gap-1 text-sm font-semibold text-green-600">
                          <Check className="h-4 w-4" />
                          {existing.totalStars}/10
                        </span>
                      )}
                    </div>

                    {existing ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Sociability</span>
                          <StarRating value={existing.sociabilityStars} size="sm" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Etiquette</span>
                          <StarRating value={existing.etiquetteStars} size="sm" />
                        </div>
                        {existing.comment && (
                          <p className="text-sm mt-1 pl-1 border-l-2 border-muted ml-1">
                            {existing.comment}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">Sociability</span>
                            <p className="text-xs text-muted-foreground">
                              Pleasant? Engaged with the group?
                            </p>
                          </div>
                          <StarRating
                            value={form.sociability}
                            onChange={(value) =>
                              updateForm(participant.id, { sociability: value })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">Etiquette</span>
                            <p className="text-xs text-muted-foreground">
                              On time? Respected the house rules?
                            </p>
                          </div>
                          <StarRating
                            value={form.etiquette}
                            onChange={(value) =>
                              updateForm(participant.id, { etiquette: value })
                            }
                          />
                        </div>
                        <Textarea
                          value={form.comment}
                          onChange={(e) =>
                            updateForm(participant.id, { comment: e.target.value })
                          }
                          placeholder="Optional: anything future hosts should know?"
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleSubmit(participant.id)}
                          disabled={!canSubmit}
                        >
                          {form.submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Submit"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
