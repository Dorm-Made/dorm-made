import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services";
import { ArrowRight, Utensils } from "lucide-react";

/**
 * Landing hero - bold black/white typography with hot-red accents.
 * Palette comes exclusively from the design tokens in index.css.
 */
export function HeroSection() {
  const navigate = useNavigate();

  const goOrLogin = (path: string) => {
    const token = authService.getAuthToken();
    navigate(token ? path : "/signup");
  };

  return (
    <>
      {/* Hero - white, type-led */}
      <section className="relative flex-1 flex items-center bg-background overflow-hidden">
        {/* Oversized watermark wordmark */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute -bottom-6 left-0 right-0 text-center font-extrabold tracking-tighter text-foreground/[0.03] text-[22vw] leading-none whitespace-nowrap"
        >
          DORM MADE
        </div>

        <div className="container mx-auto px-4 relative z-10 w-full py-16 lg:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <span className="inline-block border-2 border-foreground px-4 py-1.5 text-xs font-bold tracking-[0.2em] uppercase">
              The student dinner marketplace
            </span>

            <h1 className="text-5xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] text-foreground">
              Share &amp; <span className="text-primary">Taste</span>
              <br />
              Culture
            </h1>

            <p className="text-lg lg:text-2xl text-foreground/80 max-w-2xl mx-auto font-medium">
              Connect to college students cooking near you.
            </p>
            <p className="text-base text-muted-foreground max-w-xl mx-auto -mt-4">
              Student chefs host group meals and share cultural experiences.
            </p>

            <div className="w-full max-w-md mx-auto pt-2">
              <div className="flex flex-col lg:flex-row gap-4">
                <Button
                  size="lg"
                  className="w-full lg:flex-1 text-base font-bold"
                  onClick={() => goOrLogin("/create-event")}
                >
                  Start hosting meals
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full lg:flex-1 text-base font-bold border-2 border-foreground text-foreground hover:bg-foreground hover:text-background"
                  onClick={() => goOrLogin("/explore")}
                >
                  <Utensils className="mr-2 h-5 w-5" />
                  Find meals
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - bold black band */}
      <section className="bg-foreground text-background">
        <div className="container mx-auto px-4 py-14 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-3 max-w-5xl mx-auto">
            <div>
              <p className="text-primary font-extrabold text-4xl lg:text-5xl mb-3">01</p>
              <h3 className="font-bold text-xl mb-2">Cook</h3>
              <p className="text-background/70 text-sm leading-relaxed">
                Post the meal you already make best - your grandma's feijoada, dorm ramen,
                Sunday pasta.
              </p>
            </div>
            <div>
              <p className="text-primary font-extrabold text-4xl lg:text-5xl mb-3">02</p>
              <h3 className="font-bold text-xl mb-2">Host</h3>
              <p className="text-background/70 text-sm leading-relaxed">
                Set the date, seats, and price. You approve every guest before they're
                charged.
              </p>
            </div>
            <div>
              <p className="text-primary font-extrabold text-4xl lg:text-5xl mb-3">03</p>
              <h3 className="font-bold text-xl mb-2">Eat together</h3>
              <p className="text-background/70 text-sm leading-relaxed">
                Foodies book a seat, you share the table, and you get paid straight to your
                bank through Stripe.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
