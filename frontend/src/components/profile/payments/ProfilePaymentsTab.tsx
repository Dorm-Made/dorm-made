import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStripeConnect } from "@/hooks/use-stripe-connect";
import { CreditCard, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { StatusHeader } from "./StatusHeader";
import { AccountDetailRow } from "./AccountDetailRow";
import { StatusIndicator } from "./StatusIndicator";
import { getStripeLoginLink } from "@/services/user.service";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";

export function ProfilePaymentsTab() {
  const { stripeStatus, loading, connecting, checkStatus, startOnboarding } = useStripeConnect();
  const { toast } = useToast();
  const [loadingLoginLink, setLoadingLoginLink] = useState(false);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleViewDetails = async () => {
    try {
      setLoadingLoginLink(true);
      const response = await getStripeLoginLink();
      window.location.href = response.account_url;
    } catch (err) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to generate Stripe login link"),
        variant: "destructive",
        duration: 3000,
      });
      console.error("Error generating Stripe login link:", err);
    } finally {
      setLoadingLoginLink(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payment information...</p>
        </div>
      </div>
    );
  }

  if (!stripeStatus?.connected) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="p-4 rounded-full bg-muted inline-block mb-4">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Payment Account Connected</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Connect a Stripe account to receive payments from your events
          </p>
          <Button onClick={startOnboarding} disabled={connecting} size="lg">
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Connect Stripe Account
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (stripeStatus.connected && !stripeStatus.onboarding_complete) {
    return (
      <div className="space-y-6">
        <StatusHeader
          icon={AlertCircle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          title="Onboarding Incomplete"
          badge={{
            className: "bg-amber-50 text-amber-700 border-amber-200",
            icon: XCircle,
            text: "Incomplete",
          }}
          message="Complete your Stripe onboarding to start accepting payments"
        />

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Account Details</h4>
          <AccountDetailRow label="Account ID" value={stripeStatus.account_id} />
        </div>

        <Separator />

        <div className="flex flex-col lg:flex-row gap-3">
          <Button onClick={checkStatus} variant="outline" className="w-full lg:flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </>
            )}
          </Button>

          <Button onClick={startOnboarding} className="w-full lg:flex-1" disabled={connecting}>
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Complete Onboarding
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (stripeStatus.connected && stripeStatus.onboarding_complete && !stripeStatus.charges_enabled) {
    return (
      <div className="space-y-6">
        <StatusHeader
          icon={XCircle}
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
          title="Account Requires Attention"
          badge={{
            className: "bg-red-50 text-red-700 border-red-200",
            icon: XCircle,
            text: "Action Required",
          }}
          message="Your Stripe account needs additional verification. This usually happens due to incomplete document verification during Stripe onboarding."
        />

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Account Details</h4>
          <div className="grid gap-2">
            <AccountDetailRow label="Account ID" value={stripeStatus.account_id} />
            <AccountDetailRow
              label="Onboarding Complete"
              value={<StatusIndicator enabled={true} />}
            />
            <AccountDetailRow
              label="Can Accept Payments"
              value={<StatusIndicator enabled={false} />}
            />
          </div>
        </div>

        <Separator />

        <div className="flex flex-col lg:flex-row gap-3">
          <Button onClick={checkStatus} variant="outline" className="w-full lg:flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </>
            )}
          </Button>

          <Button onClick={startOnboarding} className="w-full lg:flex-1" disabled={connecting}>
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Complete Onboarding
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatusHeader
        icon={CheckCircle2}
        iconBgColor="bg-green-50"
        iconColor="text-green-600"
        title="Stripe Account"
        badge={{
          variant: "default",
          className: "bg-green-50 text-green-700 border-green-200",
          icon: CheckCircle2,
          text: "Active",
        }}
        message="Your account is active and ready to receive payments"
      />

      <Separator />

      <div className="space-y-3">
        <h4 className="font-medium text-sm">Account Details</h4>
        <div className="grid gap-2">
          <AccountDetailRow label="Account ID" value={stripeStatus.account_id} />
          <AccountDetailRow
            label="Can Accept Payments"
            value={<StatusIndicator enabled={true} />}
          />
          <AccountDetailRow
            label="Onboarding Complete"
            value={<StatusIndicator enabled={true} />}
          />
          <AccountDetailRow
            label="Stripe Dashboard"
            value={
              <button
                onClick={handleViewDetails}
                disabled={loadingLoginLink}
                className="text-primary hover:underline text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingLoginLink ? "Loading..." : "View details"}
              </button>
            }
          />
        </div>
      </div>

      <Separator />

      <Button onClick={checkStatus} variant="outline" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Refreshing...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </>
        )}
      </Button>
    </div>
  );
}
