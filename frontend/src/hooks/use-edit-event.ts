import { useState } from "react";
import { updateEvent } from "@/services";
import { Event, EventUpdate } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";

interface UseEditEventReturn {
  isOpen: boolean;
  loading: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  updateEventData: (eventId: string, updates: EventUpdate) => Promise<Event | null>;
}

export function useEditEvent(onSuccess?: () => void): UseEditEventReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const openDialog = () => {
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  const updateEventData = async (eventId: string, updates: EventUpdate): Promise<Event | null> => {
    try {
      setLoading(true);
      const updatedEvent = await updateEvent(eventId, updates);

      toast({
        title: "Success!",
        description: "Event updated successfully!",
        className: "bg-green-500 text-white border-green-600",
        duration: 1500,
      });

      closeDialog();

      if (onSuccess) {
        onSuccess();
      }

      return updatedEvent;
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to update event"),
        variant: "destructive",
        duration: 3000,
      });
      console.error("Error updating event:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    isOpen,
    loading,
    openDialog,
    closeDialog,
    updateEventData,
  };
}
