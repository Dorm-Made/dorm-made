import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReviewEventDialog } from "./ReviewEventDialog";
import { PendingEventReview } from "@/types/review.types";
import { reviewService } from "@/services";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { Star, Loader2 } from "lucide-react";

interface PendingReviewGateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pendingReviews: PendingEventReview[];
  /** Called when every pending review has been submitted — booking can proceed. */
  onAllCleared: () => void;
}

/**
 * Hard gate before booking: the foodie must rate their previous event(s)
 * before they can book the next one. Shows the list of unrated past events,
 * opens the review form for each, and unlocks booking once the list is empty.
 */
export function PendingReviewGateDialog({
  isOpen,
  onClose,
  pendingReviews,
  onAllCleared,
}: PendingReviewGateDialogProps) {
  const [remaining, setRemaining] = useState<PendingEventReview[]>(pendingReviews);
  const [reviewing, setReviewing] = useState<PendingEventReview | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Keep local list in sync when the dialog is (re)opened with new data
  const [lastOpenSignature, setLastOpenSignature] = useState("");
  const signature = `${isOpen}-${pendingReviews.map((p) => p.eventId).join(",")}`;
  if (isOpen && signature !== lastOpenSignature) {
    setLastOpenSignature(signature);
    setRemaining(pendingReviews);
  }

  const handleReviewSubmitted = async () => {
    setReviewing(null);
    try {
      setRefreshing(true);
      const fresh = await reviewService.getPendingReviews();
      setRemaining(fresh.pendingEventReviews);
      if (fresh.pendingEventReviews.length === 0) {
        onAllCleared();
      }
    } catch {
      // Fall back to removing the reviewed event locally
      setRemaining((prev) => {
        const next = prev.slice(1);
        if (next.length === 0) onAllCleared();
        return next;
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen && !reviewing} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              Rate your previous experience first
            </DialogTitle>
            <DialogDescription>
              Before booking your next event, please rate the one{remaining.length > 1 ? "s" : ""}{" "}
              you attended. It keeps feedback flowing for every chef.
            </DialogDescription>
          </DialogHeader>

          {refreshing ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {remaining.map((pending) => (
                <div
                  key={pending.eventId}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0 mr-3">
                    <p className="font-medium text-sm truncate">{pending.eventTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Hosted by {pending.hostName} · {formatDate(pending.eventDate)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setReviewing(pending)}>
                    Rate now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {reviewing && (
        <ReviewEventDialog
          isOpen={Boolean(reviewing)}
          onClose={() => setReviewing(null)}
          event={{ id: reviewing.eventId, title: reviewing.eventTitle }}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </>
  );
}
