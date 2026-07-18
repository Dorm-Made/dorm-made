import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { onboardingService } from "@/services";
import { QuizQuestion, TasteProfileResponse } from "@/types/user.types";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { Loader2, Sparkles, ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * First-login taste quiz: 8 pairs of food images, pick one per pair.
 * Non-skippable on first login; retakeable later via /onboarding?retake=1.
 * Every click is a taste signal; the reveal screen plays it back as a
 * personalized taste profile.
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TasteProfileResponse | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const isRetake = searchParams.get("retake") === "1" || Boolean(currentUser?.onboarding_completed);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    let cancelled = false;
    onboardingService
      .getQuizQuestions()
      .then((data) => {
        if (!cancelled) setQuestions(data);
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: getErrorMessage(err, "Failed to load the quiz"),
          variant: "destructive",
          duration: 3000,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePick = async (optionId: string) => {
    if (submitting) return;
    const nextPicks = [...picks.slice(0, current), optionId];
    setPicks(nextPicks);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
      return;
    }

    // Last question answered -> submit
    try {
      setSubmitting(true);
      const profile = await onboardingService.submitQuiz(nextPicks);
      setResult(profile);

      // Keep the cached user in sync so the onboarding gate opens
      const stored = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (stored) {
        stored.onboarding_completed = true;
        stored.taste_archetype = profile.taste_archetype;
        stored.taste_description = profile.taste_description;
        localStorage.setItem("currentUser", JSON.stringify(stored));
        window.dispatchEvent(new CustomEvent("userLogin"));
      }
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to save your taste profile"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ---------- Result reveal ----------
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Your taste profile</p>
            <h1 className="text-3xl font-bold text-primary">{result.taste_archetype}</h1>
          </div>
          <p className="text-base leading-relaxed text-foreground/90">
            {result.taste_description}
          </p>
          <p className="text-xs text-muted-foreground">
            This shows on your profile - you can retake the quiz anytime from there.
          </p>
          {isRetake ? (
            <Button
              className="w-full bg-gradient-to-r from-primary to-primary-glow"
              onClick={() => navigate("/explore")}
            >
              Start exploring 🍳
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-primary to-primary-glow"
                onClick={() => navigate("/create-meal")}
              >
                Post your first meal 🍳
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/explore")}>
                Explore events instead
              </Button>
              <p className="text-xs text-muted-foreground pt-1">
                Hosting? You'll connect a Stripe account to get paid - your events only go
                public once it's connected. You can do it anytime from your profile's
                Payments tab.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Couldn't load the quiz.</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  // ---------- Quiz ----------
  const question = questions[current];
  const progress = (current / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="w-full px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          {current > 0 ? (
            <button
              onClick={() => setCurrent(current - 1)}
              className="p-1 rounded hover:bg-accent transition-colors"
              aria-label="Previous question"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
          ) : (
            <div className="w-7" />
          )}
          <Progress value={progress} className="flex-1" />
          <span className="text-xs text-muted-foreground w-10 text-right">
            {current + 1}/{questions.length}
          </span>
          {isRetake && (
            <button
              onClick={() => navigate(-1)}
              className="p-1 rounded hover:bg-accent transition-colors"
              aria-label="Exit quiz"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10 max-w-2xl mx-auto w-full">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">
            {current === 0 ? "Let's learn your taste - tap what you'd rather eat" : "This or that?"}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold">{question.prompt}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          {question.options.map((option) => {
            const isPicked = picks[current] === option.id;
            const broken = brokenImages[option.id];
            return (
              <button
                key={option.id}
                onClick={() => handlePick(option.id)}
                disabled={submitting}
                className={cn(
                  "group relative rounded-xl overflow-hidden border-2 transition-all text-left",
                  "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
                  isPicked ? "border-primary ring-2 ring-primary/40" : "border-border",
                )}
              >
                <div className="aspect-[4/5] lg:aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5">
                  {broken ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-7xl">{option.emoji}</span>
                    </div>
                  ) : (
                    <img
                      src={option.imageUrl}
                      alt={option.label}
                      className="w-full h-full object-cover"
                      onError={() =>
                        setBrokenImages((prev) => ({ ...prev, [option.id]: true }))
                      }
                    />
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                  <span className="text-white font-semibold text-sm lg:text-base drop-shadow">
                    {option.emoji} {option.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {submitting && (
          <div className="flex items-center gap-2 mt-6 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading your taste buds...
          </div>
        )}
      </div>
    </div>
  );
}
