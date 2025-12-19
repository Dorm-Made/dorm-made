import { useState, useCallback } from "react";
import { eventService } from "@/services";
import { Event } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";

interface UseEventsReturn {
  allEvents: Event[];
  myEvents: Event[];
  joinedEvents: Event[];
  loading: boolean;
  error: Error | null;
  loadAllEvents: () => Promise<void>;
  loadMyEvents: () => Promise<void>;
  loadJoinedEvents: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

export function useEvents(): UseEventsReturn {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const loadAllEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const events = await eventService.getEvents();
      setAllEvents(events);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load events");
      setError(error);
      console.error("Error loading all events:", err);
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive",
        duration: 1500,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadMyEvents = useCallback(async () => {
    try {
      const events = await eventService.getMyEvents();
      setMyEvents(events);
    } catch (err) {
      console.error("Error loading my events:", err);
      // Don't show error toast for unauthenticated requests
      setMyEvents([]);
    }
  }, []);

  const loadJoinedEvents = useCallback(async () => {
    try {
      const events = await eventService.getJoinedEvents();
      setJoinedEvents(events);
    } catch (err) {
      console.error("Error loading joined events:", err);
      // Don't show error toast for unauthenticated requests
      setJoinedEvents([]);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadAllEvents(), loadMyEvents(), loadJoinedEvents()]);
    } catch (err) {
      console.error("Error refreshing events:", err);
    } finally {
      setLoading(false);
    }
  }, [loadAllEvents, loadMyEvents, loadJoinedEvents]);

  return {
    allEvents,
    myEvents,
    joinedEvents,
    loading,
    error,
    loadAllEvents,
    loadMyEvents,
    loadJoinedEvents,
    refreshAllData,
  };
}
