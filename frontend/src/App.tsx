import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Auth from "./pages/Auth";
import CreateEvent from "./pages/CreateEvent";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import CreateMeal from "./pages/CreateMeal";
import Onboarding from "./pages/Onboarding";
import { OnboardingRedirect } from "./components/onboarding/OnboardingRedirect";
import { SplashScreen } from "./components/layout/SplashScreen";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <SplashScreen />
      <OnboardingRedirect />
      <div className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto min-h-screen">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/create-meal" element={<CreateMeal />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
      <Toaster />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
