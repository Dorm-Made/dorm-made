import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface StatusHeaderProps {
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  title: string;
  badge: {
    variant?: "default" | "outline";
    className: string;
    icon: LucideIcon;
    text: string;
  };
  message: string;
}

export function StatusHeader({
  icon: Icon,
  iconBgColor,
  iconColor,
  title,
  badge,
  message,
}: StatusHeaderProps) {
  const BadgeIcon = badge.icon;

  return (
    <div className="flex items-start gap-3">
      <div className={`p-3 rounded-full ${iconBgColor}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge
            variant={badge.variant || "outline"}
            className={`${badge.className} pointer-events-none`}
          >
            <BadgeIcon className="h-3 w-3 mr-1" />
            {badge.text}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}