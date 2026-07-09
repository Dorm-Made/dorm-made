import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { onboardingService } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Copy, Link as LinkIcon, UserPlus, Check } from "lucide-react";

/**
 * Own-profile card showing the user's invite code with copy buttons for
 * the raw code and a signup link that pre-fills it.
 */
export function InviteCard() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    onboardingService
      .getInviteCode()
      .then((code) => {
        if (!cancelled) setInviteCode(code);
      })
      .catch(() => {
        if (!cancelled) setInviteCode(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!inviteCode) return null;

  const inviteLink = `${window.location.origin}/signup?invite=${inviteCode}`;

  const copy = async (kind: "code" | "link") => {
    const text = kind === "code" ? inviteCode : inviteLink;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
      toast({
        title: "Copied!",
        description:
          kind === "code"
            ? "Invite code copied — share it with a friend."
            : "Invite link copied — anyone who signs up with it is on your tree.",
        className: "bg-green-500 text-white border-green-600",
        duration: 2000,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: `Here it is: ${text}`,
        duration: 5000,
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Invite friends, build your food circle</p>
              <p className="text-xs text-muted-foreground">
                Your name stays on their profile forever — your code:{" "}
                <span className="font-mono font-bold text-primary">{inviteCode}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => copy("code")}>
              {copied === "code" ? (
                <Check className="h-4 w-4 mr-1 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              Copy code
            </Button>
            <Button size="sm" onClick={() => copy("link")}>
              {copied === "link" ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <LinkIcon className="h-4 w-4 mr-1" />
              )}
              Copy invite link
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
