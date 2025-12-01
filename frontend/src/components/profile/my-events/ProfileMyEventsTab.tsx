import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/EventCard";
import { useProfile } from "@/hooks/use-profile";

interface ProfileMyEventsTabProps {
  userId: string;
  isOwnProfile: boolean;
  userName: string;
}

export function ProfileMyEventsTab({ userId, isOwnProfile, userName }: ProfileMyEventsTabProps) {
  const { userEvents, loadingEvents, refreshUserEvents } = useProfile(userId);

  if (loadingEvents) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  if (userEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🍽️</div>
        <h3 className="text-lg font-semibold mb-2">No events created yet</h3>
        <p className="text-muted-foreground mb-4">
          {isOwnProfile
            ? "Create your first culinary event to get started!"
            : `${userName} hasn't created any events yet.`}
        </p>
        {isOwnProfile && (
          <Button asChild>
            <Link to="/create-event">Create Event</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto gap-4 pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
      {userEvents.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          activeTab="profile"
          onEventUpdated={refreshUserEvents}
        />
      ))}
    </div>
  );
}
