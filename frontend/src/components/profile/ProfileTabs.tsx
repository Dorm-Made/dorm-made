import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UtensilsCrossed, CalendarDays, CreditCard } from "lucide-react";
import { ProfileMyMealsTab } from "./my-meals/ProfileMyMealsTab";
import { ProfileMyEventsTab } from "./my-events/ProfileMyEventsTab";
import { ProfilePaymentsTab } from "./payments/ProfilePaymentsTab";

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  userName: string;
  defaultTab?: string;
}

export function ProfileTabs({ userId, isOwnProfile, userName, defaultTab = "events" }: ProfileTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className={`w-full grid ${isOwnProfile ? "grid-cols-3" : "grid-cols-2"}`}>
        <TabsTrigger value="events" className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <span>My Events</span>
        </TabsTrigger>
        <TabsTrigger value="meals" className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4" />
          <span>My Meals</span>
        </TabsTrigger>
        {isOwnProfile && (
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="events" className="mt-6">
        <ProfileMyEventsTab userId={userId} isOwnProfile={isOwnProfile} userName={userName} />
      </TabsContent>

      <TabsContent value="meals" className="mt-6">
        <ProfileMyMealsTab userId={userId} isOwnProfile={isOwnProfile} userName={userName} />
      </TabsContent>

      {isOwnProfile && (
        <TabsContent value="payments" className="mt-6">
          <ProfilePaymentsTab />
        </TabsContent>
      )}
    </Tabs>
  );
}
