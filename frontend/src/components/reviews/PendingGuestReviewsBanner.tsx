import { Button } from "@/components/ui/button";
import { RateGuestsDialog } from "./RateGuestsDialog";
import { PendingGuestReviewEvent } from "@/types/review.types";
import { reviewService, authService } from "@/services";
import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";

/**
 * Soft reminder for hosts: shows under the header when they have confirmed
 * guests from past events they haven't rated yet. Never blocks anything.
 * Dismissible for the current session; returns on the next page load until
 * all guests are rated.
 */
export function PendingGuestReviewsBanner() {
  const [pendingEvents, setPendingEvents] = useState<PendingGuestReviewEvent[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [ratingEvent, setRatingEvent] = useState<PendingGuestReviewEvent | null>(null);

  const fetchPending = async () => {
    try {
      const pending = await reviewService.getPendingReviews();
      setPendingEvents(pending.pendingGuestReviews);
    } catch {
      setPendingEvents([]);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    const token = authService.getAuthToken();
    if (!user || !token || user === "undefined") return;
    fetchPending();
  }, []);

  const totalGuests = pendingEvents.reduce(
    (sum, event) => sum + event.unratedGuests.length,
    0,
  );

  if (dismissed || pendingEvents.length === 0) return null;

  const first = pendingEvents[0];

  return (
    <>
      <div className="w-full border-b bg-amber-50 dark:bg-amber-950/30">
        <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 text-sm">
            <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
            <span className="truncate text-amber-900 dark:text-amber-200">
              You have {totalGuests} guest{totalGuests === 1 ? "" : "s"} to rate from{" "}
              {pendingEvents.length === 1 ? (
                <span className="font-medium">{first.eventTitle}</span>
              ) : (
                `${pendingEvents.length} past events`
              )}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setRatingEvent(first)}
            >
              Rate now
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              aria-label="Dismiss reminder"
            >
              <X className="h-4 w-4 text-amber-900 dark:text-amber-200" />
            </button>
          </div>
        </div>
      </div>

      {ratingEvent && (
        <RateGuestsDialog
          eventId={ratingEvent.eventId}
          eventTitle={ratingEvent.eventTitle}
          isOpen={Boolean(ratingEvent)}
          onClose={() => {
            setRatingEvent(null);
            fetchPending();
          }}
        />
      )}
    </>
  );
}
