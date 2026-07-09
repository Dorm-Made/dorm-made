import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number; // 0 = not rated yet
  onChange?: (value: number) => void; // omit for read-only display
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/**
 * Whole-star 1-5 rating row. Interactive when onChange is provided,
 * read-only otherwise. No half stars by design.
 */
export function StarRating({ value, onChange, size = "md", className }: StarRatingProps) {
  const interactive = Boolean(onChange);

  return (
    <div className={cn("flex items-center gap-1", className)} role={interactive ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            className={cn(
              "transition-transform",
              interactive ? "cursor-pointer hover:scale-110" : "cursor-default",
            )}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-checked={interactive ? star === value : undefined}
            role={interactive ? "radio" : undefined}
          >
            <Star
              className={cn(
                sizeClasses[size],
                filled ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
