import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "./StarRating";
import { EventReview } from "@/types/review.types";
import { reviewService } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Star } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface EventReviewsDialogProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const LAYER_LABELS: { key: "foodStars" | "spaceStars" | "hostStars"; commentKey: "foodComment" | "spaceComment" | "hostComment"; label: string }[] = [
  { key: "foodStars", commentKey: "foodComment", label: "Food" },
  { key: "spaceStars", commentKey: "spaceComment", label: "Space" },
  { key: "hostStars", commentKey: "hostComment", label: "Host" },
];

export function EventReviewsDialog({
  eventId,
  eventTitle,
  isOpen,
  onClose,
}: EventReviewsDialogProps) {
  const [reviews, setReviews] = useState<EventReview[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await reviewService.getEventReviews(eventId);
      setReviews(data);
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to load reviews"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const averageTotal =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.totalStars, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            Reviews
            {averageTotal && (
              <span className="text-base font-normal text-muted-foreground">
                — {averageTotal}/15 avg ({reviews.length})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{eventTitle}</DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border bg-card p-4 space-y-3">
                  {/* Reviewer + total */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={review.reviewerProfilePicture || undefined}
                          alt={review.reviewerName}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(review.reviewerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <button
                          onClick={() => {
                            onClose();
                            navigate(`/profile/${review.reviewerId}`);
                          }}
                          className="text-sm font-medium text-primary hover:text-primary/80 underline underline-offset-2"
                        >
                          {review.reviewerName}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {review.totalStars}/15
                    </span>
                  </div>

                  {/* Per-layer breakdown */}
                  <div className="space-y-2">
                    {LAYER_LABELS.map(({ key, commentKey, label }) => (
                      <div key={key}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground w-14">{label}</span>
                          <StarRating value={review[key]} size="sm" />
                        </div>
                        {review[commentKey] && (
                          <p className="text-sm mt-1 pl-1 border-l-2 border-muted ml-1">
                            {review[commentKey]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
