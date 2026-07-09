import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { reviewService } from "@/services";
import { GuestRatingSummary, HostRatingSummary } from "@/types/review.types";

interface ProfileRatingBadgesProps {
  userId: string;
}

/**
 * Aggregate score badges shown on a profile header:
 * - Chef score: average /15 across all event reviews received as host
 * - Guest score: average /10 across all guest reviews received as foodie
 * Badges are hidden until the user has at least one review of that kind.
 */
export function ProfileRatingBadges({ userId }: ProfileRatingBadgesProps) {
  const [hostRating, setHostRating] = useState<HostRatingSummary | null>(null);
  const [guestRating, setGuestRating] = useState<GuestRatingSummary | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    Promise.allSettled([
      reviewService.getHostRating(userId),
      reviewService.getGuestRating(userId),
    ]).then(([hostResult, guestResult]) => {
      if (cancelled) return;
      if (hostResult.status === "fulfilled") setHostRating(hostResult.value);
      if (guestResult.status === "fulfilled") setGuestRating(guestResult.value);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const showHost = hostRating && hostRating.reviewCount > 0 && hostRating.averageTotal != null;
  const showGuest =
    guestRating && guestRating.reviewCount > 0 && guestRating.averageTotal != null;

  if (!showHost && !showGuest) return null;

  return (
    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
      {showHost && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          Chef {hostRating!.averageTotal}/15
          <span className="text-muted-foreground font-normal">
            ({hostRating!.reviewCount} review{hostRating!.reviewCount === 1 ? "" : "s"})
          </span>
        </span>
      )}
      {showGuest && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          Guest {guestRating!.averageTotal}/10
          <span className="text-muted-foreground font-normal">
            ({guestRating!.reviewCount} review{guestRating!.reviewCount === 1 ? "" : "s"})
          </span>
        </span>
      )}
    </div>
  );
}
