import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/home/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEvents } from "@/hooks/use-events";
import { EventCard } from "@/components/events/EventCard";
import { useToast } from "@/hooks/use-toast";
import { stripeService, mealService } from "@/services";
import { analytics } from "@/lib/analytics";

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();
  const { allEvents, myEvents, joinedEvents, loading, refreshAllData } = useEvents();

  const isEventJoinedByUser = (eventId: string) => {
    return joinedEvents.some((joinedEvent) => joinedEvent.id === eventId);
  };

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (e) {
        console.error("Error parsing currentUser:", e);
      }
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      const checkPaymentStatus = async () => {
        try {
          const status = await stripeService.getSessionStatus(sessionId);

          console.log(status);

          if (status.status === "complete") {
            toast({
              title: "Successfully booked!",
              className: "bg-green-500 text-white border-green-600",
              description: "You booked your reservation, pending chef approval.",
              duration: 5000,
            });
            setActiveTab("joined");
            await refreshAllData();

            const pendingJoinStr = sessionStorage.getItem("pendingEventJoin");
            if (pendingJoinStr && currentUser) {
              try {
                const { eventId } = JSON.parse(pendingJoinStr);
                const joinedEvent = joinedEvents.find((e) => e.id === eventId);

                if (joinedEvent) {
                  const meal = await mealService.getMeal(joinedEvent.mealId);
                  analytics.eventJoined({
                    userId: currentUser.id,
                    event: joinedEvent,
                    meal,
                  });
                }
                sessionStorage.removeItem("pendingEventJoin");
              } catch (err) {
                console.error("Error tracking event join:", err);
              }
            }
          } else {
            toast({
              title: "Payment incomplete",
              description: "Please try again or contact support.",
              variant: "destructive",
              duration: 5000,
            });
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
          toast({
            title: "Error",
            description: "Failed to verify payment status.",
            variant: "destructive",
            duration: 5000,
          });
        } finally {
          sessionStorage.removeItem("pendingEventJoin");
          setSearchParams({});
        }
      };

      checkPaymentStatus();
    }
  }, [searchParams, setSearchParams, toast, refreshAllData, currentUser, joinedEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Explore events</h1>
            <p className="text-lg text-muted-foreground">
              Discover amazing cultural dining experiences near your campus
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mx-auto lg:mx-16 mb-8">
            <TabsTrigger value="all">Live Events</TabsTrigger>
            <TabsTrigger value="my">My Events</TabsTrigger>
            <TabsTrigger value="joined">Joined Events</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="flex overflow-x-auto gap-4 pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
              {allEvents.length === 0 ? (
                <div className="col-span-full text-center py-12 w-full">
                  <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                  <p className="text-muted-foreground">Be the first to host a culinary event!</p>
                </div>
              ) : (
                allEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventUpdated={refreshAllData}
                    isJoinedByUser={isEventJoinedByUser(event.id)}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="my">
            <div className="flex overflow-x-auto gap-4 pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
              {myEvents.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <h3 className="text-lg font-semibold mb-2">No events created yet</h3>
                  <p className="text-muted-foreground">
                    Create your first culinary event to get started!
                  </p>
                </div>
              ) : (
                myEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventUpdated={refreshAllData}
                    isJoinedByUser={isEventJoinedByUser(event.id)}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="joined">
            <div className="flex overflow-x-auto gap-4 pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
              {joinedEvents.length === 0 ? (
                <div className="col-span-full text-center py-12 w-full">
                  <h3 className="text-lg font-semibold mb-2">No joined events yet</h3>
                  <p className="text-muted-foreground">Join some events to see them here!</p>
                </div>
              ) : (
                joinedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventUpdated={refreshAllData}
                    isJoinedByUser={true}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
