import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { StarRating } from "@/components/reviews/StarRating";
import { GuestReview } from "@/types/review.types";
import { reviewService } from "@/services";
import { formatDate } from "@/lib/utils";

interface ProfileReviewsTabProps {
  userId: string;
  isOwnProfile: boolean;
  userName: string;
}

/**
 * Reviews the user has received as a guest (from hosts), public on their profile.
 * Reviews they received as a chef live on each event card in the Events tab.
 */
export function ProfileReviewsTab({ userId, isOwnProfile, userName }: ProfileReviewsTabProps) {
  const [reviews, setReviews] = useState<GuestReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    reviewService
      .getGuestReviewsReceived(userId)
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Reviews {isOwnProfile ? "you have" : `${userName} has`} received as a guest. Reviews
        received as a chef are attached to each event in the Events tab.
      </p>

      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⭐</div>
          <h3 className="text-lg font-semibold mb-2">No guest reviews yet</h3>
          <p className="text-muted-foreground">
            {isOwnProfile
              ? "Join events and hosts will rate your sociability and etiquette."
              : `${userName} hasn't been reviewed as a guest yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">From {review.hostName}</span>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </p>
                </div>
                <span className="text-lg font-bold text-primary">
                  {review.totalStars}/10
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sociability</span>
                <StarRating value={review.sociabilityStars} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Etiquette</span>
                <StarRating value={review.etiquetteStars} size="sm" />
              </div>
              {review.comment && (
                <p className="text-sm pl-1 border-l-2 border-muted ml-1">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
