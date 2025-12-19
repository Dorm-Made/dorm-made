import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "@/services";
import { Users, Utensils } from "lucide-react";

export function HeroSection() {
  const navigate = useNavigate();

  const handleFindMeals = () => {
    const token = authService.getAuthToken();
    if (token) {
      navigate("/explore");
    } else {
      navigate("/login");
    }
  };

  const handleBecomeChef = () => {
    const token = authService.getAuthToken();
    if (token) {
      navigate("/create-event");
    } else {
      navigate("/login");
    }
  };

  return (
    <section className="relative py-12 flex-1 flex items-center">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:hidden"
        style={{ backgroundImage: "url(/images/hero-background-mobile.jpg)" }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden lg:block"
        style={{ backgroundImage: "url(/images/hero-background.jpeg)" }}
      />
      <div className="container mx-auto px-4 relative z-10 w-full">
        <div className="flex items-center flex-col max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-red-200 text-transparent bg-clip-text">
              Share & Taste Culture
            </span>
          </h1>

          <p className="text-lg lg:text-2xl text-white mx-auto max-w-2xl px-4">
            Connect to College Students Cooking Near You
          </p>

          <p className="text-base text-white max-w-xl mx-auto px-4">
            Student chefs host group meals and share cultural experiences.
          </p>

          {/* CTA Buttons - Stacked on Mobile, Side-by-Side on Desktop */}
          <div className="w-full max-w-md mx-auto px-4 pt-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <Button
                size="lg"
                variant="default"
                className="w-full lg:flex-1 text-base"
                onClick={handleBecomeChef}
              >
                <Users className="mr-2 h-5 w-5" />
                Start hosting meals
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full lg:flex-1 text-base"
                onClick={handleFindMeals}
              >
                <Utensils className="mr-2 h-5 w-5" />
                Find Meals
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
