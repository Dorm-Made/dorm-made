import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EventParticipant } from "@/types/event.types";
import { eventService } from "@/services";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { Loader2, Users } from "lucide-react";

interface EventParticipantsDialogProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  onParticipantAccepted?: () => void;
}

export function EventParticipantsDialog({
  eventId,
  isOpen,
  onClose,
  isHost,
  onParticipantAccepted,
}: EventParticipantsDialogProps) {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptingUserId, setAcceptingUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchParticipants();
    }
  }, [isOpen, eventId]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEventParticipants(eventId);
      setParticipants(data);
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to load participants"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptParticipation = async (userId: string) => {
    try {
      setAcceptingUserId(userId);
      await eventService.acceptUserParticipation(eventId, userId);

      toast({
        title: "Success!",
        description: "Participant confirmed successfully!",
        className: "bg-green-500 text-white border-green-600",
        duration: 1500,
      });

      await fetchParticipants();
      onParticipantAccepted?.();
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to confirm participant"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setAcceptingUserId(null);
    }
  };

  const handleNavigateToProfile = (userId: string) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Event Participants
          </DialogTitle>
          <DialogDescription>
            View all participants for this event
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : participants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No participants yet
            </p>
          ) : (
            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={participant.profile_picture || undefined}
                        alt={participant.name}
                      />
                      <AvatarFallback>
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <button
                        onClick={() => handleNavigateToProfile(participant.id)}
                        className="text-primary hover:text-primary/80 underline underline-offset-2 cursor-pointer transition-colors font-medium"
                      >
                        {participant.name}
                      </button>
                      <p className="text-xs text-muted-foreground capitalize">
                        {participant.status}
                      </p>
                    </div>
                  </div>

                  {isHost && participant.status === "booked" && (
                    <Button
                      size="sm"
                      onClick={() => handleAcceptParticipation(participant.id)}
                      disabled={acceptingUserId === participant.id}
                    >
                      {acceptingUserId === participant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Confirm"
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
