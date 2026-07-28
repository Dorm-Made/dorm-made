import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarCheck, Loader2 } from "lucide-react";
import { eventService } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";

interface CalendarInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  defaultEmail?: string;
}

/**
 * Shown right after a successful booking: asks for the foodie's best email and
 * sends them a calendar invite (.ics) with the event details + ingredients.
 */
export function CalendarInviteDialog({
  isOpen,
  onClose,
  eventId,
  defaultEmail = "",
}: CalendarInviteDialogProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Prefill (and reset) the field each time the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setSending(false);
    }
  }, [isOpen, defaultEmail]);

  const handleSend = async () => {
    if (!eventId) return;
    setSending(true);
    try {
      await eventService.sendCalendarInvite(eventId, email.trim());
      toast({
        title: "Invite on its way! 📅",
        description: `We emailed your calendar invite to ${email.trim()}.`,
        className: "bg-green-500 text-white border-green-600",
        duration: 4000,
      });
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't send the invite",
        description: getErrorMessage(err, "Please check the email and try again."),
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarCheck className="h-5 w-5 text-primary" />
            You're booked! 🎉
          </DialogTitle>
          <DialogDescription>
            What's your best email for us to send your calendar invite? It includes the
            date, address, and the ingredients list if the event has a recipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={sending}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>
            Skip for now
          </Button>
          <Button className="flex-1" onClick={handleSend} disabled={sending || !email.trim()}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send calendar invite"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
