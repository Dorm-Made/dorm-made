import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { Event } from "@/types";

interface RefundEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  loading: boolean;
  onConfirmRefund: () => void;
}

export function RefundEventDialog({
  isOpen,
  onClose,
  event,
  loading,
  onConfirmRefund,
}: RefundEventDialogProps) {
  const priceDollars = (event.price / 100).toFixed(2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 p-2 rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Cancel Participation</DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="py-4">
          <p className="text-base mb-3">
            Are you sure you want to cancel your participation in{" "}
            <span className="font-semibold">"{event.title}"</span>?
          </p>

          <div className="bg-muted/50 p-4 rounded-md mb-3 space-y-2">
            <p className="text-sm font-semibold">Cancellation Policy:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                Before the host confirms your seat: cancel free - your card
                is never charged (${priceDollars} hold is released)
              </li>
              <li>After the host confirms: bookings are final</li>
              <li>If the host cancels the event, you get a full refund</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </DialogDescription>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Go Back
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirmRefund}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Cancellation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}