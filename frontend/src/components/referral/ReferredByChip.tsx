import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";

interface ReferredByChipProps {
  referrerId: string;
  referrerName: string;
}

/**
 * Clubhouse-style permanent referral credit: "Invited by X", clickable
 * through to the referrer's profile so people can walk the invite tree.
 */
export function ReferredByChip({ referrerId, referrerName }: ReferredByChipProps) {
  return (
    <div className="flex items-center justify-center lg:justify-start text-sm text-muted-foreground">
      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
      <span>
        Invited by{" "}
        <Link
          to={`/profile/${referrerId}`}
          className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium"
        >
          {referrerName}
        </Link>
      </span>
    </div>
  );
}
