import { CheckCircle2, XCircle } from "lucide-react";

interface StatusIndicatorProps {
  enabled: boolean;
}

export function StatusIndicator({ enabled }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className="text-sm font-medium">{enabled ? "Yes" : "No"}</span>
    </div>
  );
}