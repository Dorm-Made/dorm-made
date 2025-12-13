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

interface DeleteEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  loading: boolean;
  onConfirmDelete: () => void;
  hasParticipants: boolean;
}

export function DeleteEventDialog({
  isOpen,
  onClose,
  event,
  loading,
  onConfirmDelete,
  hasParticipants,
}: DeleteEventDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 p-2 rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Delete Event</DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="py-4">
          {hasParticipants ? (
            <>
              <p className="text-base mb-3">
                The event <span className="font-semibold">"{event.title}"</span> has participants and
                cannot be deleted directly.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                To delete an event with participants, please contact our support team at{" "}
                <a
                  href="mailto:support@dormmade.com"
                  className="text-primary hover:underline font-medium"
                >
                  support@dormmade.com
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                Our team will help you handle participant refunds and event cancellation properly.
              </p>
            </>
          ) : (
            <>
              <p className="text-base mb-3">
                Are you sure you want to delete <span className="font-semibold">"{event.title}"</span>
                ?
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone, the event will be permanently removed.
              </p>
            </>
          )}
        </DialogDescription>

        <DialogFooter>
          {hasParticipants ? (
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onConfirmDelete}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Event"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}