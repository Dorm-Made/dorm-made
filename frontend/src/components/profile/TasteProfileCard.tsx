import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, RotateCcw } from "lucide-react";

interface TasteProfileCardProps {
  archetype?: string | null;
  description?: string | null;
  isOwnProfile: boolean;
}

/**
 * Public taste profile from the onboarding quiz: archetype + short
 * personalized description. Own profile gets a retake button.
 */
export function TasteProfileCard({
  archetype,
  description,
  isOwnProfile,
}: TasteProfileCardProps) {
  const navigate = useNavigate();

  if (!archetype || !description) return null;

  return (
    <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{archetype}</span>
        </div>
        {isOwnProfile && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => navigate("/onboarding?retake=1")}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retake
          </Button>
        )}
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">{description}</p>
    </div>
  );
}
