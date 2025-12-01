import { ReactNode } from "react";

interface AccountDetailRowProps {
  label: string;
  value: string | ReactNode;
}

export function AccountDetailRow({ label, value }: AccountDetailRowProps) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {typeof value === "string" ? (
        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{value}</code>
      ) : (
        value
      )}
    </div>
  );
}