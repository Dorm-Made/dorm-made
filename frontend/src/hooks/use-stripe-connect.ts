import { useState, useCallback, useEffect } from "react";
import { initiateStripeConnect, getStripeStatus } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { StripeStatusResponse } from "@/types";
import { analytics } from "@/lib/analytics";

interface UseStripeConnectReturn {
  stripeStatus: StripeStatusResponse | null;
  loading: boolean;
  connecting: boolean;
  checkStatus: () => Promise<void>;
  startOnboarding: () => Promise<void>;
  isConnected: boolean;
  canAcceptPayments: boolean;
  needsOnboarding: boolean;
}

export function useStripeConnect(autoCheck = true): UseStripeConnectReturn {
  const [stripeStatus, setStripeStatus] = useState<StripeStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      const status = await getStripeStatus();
      setStripeStatus(status);
    } catch (error) {
      console.error("[useStripeConnect] Error checking status:", error);
      setStripeStatus({
        connected: false,
        charges_enabled: false,
        onboarding_complete: false,
        account_id: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const startOnboarding = useCallback(async () => {
    try {
      setConnecting(true);
      const userStr = localStorage.getItem("currentUser");
      const currentUser = userStr ? JSON.parse(userStr) : null;

      const response = await initiateStripeConnect();

      if (currentUser) {
        analytics.stripeOnboardingStarted(currentUser.id);
      }

      window.location.href = response.onboarding_url;
    } catch (error) {
      console.error("[useStripeConnect] Error starting onboarding:", error);
      toast({
        title: "Connection Failed",
        description: getErrorMessage(error, "Failed to start Stripe onboarding"),
        variant: "destructive",
        duration: 3000,
      });
      setConnecting(false);
    }
  }, [toast]);

  useEffect(() => {
    if (autoCheck) {
      checkStatus();
    }
  }, [autoCheck, checkStatus]);

  const isConnected = stripeStatus?.connected ?? false;
  const canAcceptPayments = stripeStatus?.charges_enabled ?? false;
  const needsOnboarding = !stripeStatus?.onboarding_complete;

  return {
    stripeStatus,
    loading,
    connecting,
    checkStatus,
    startOnboarding,
    isConnected,
    canAcceptPayments,
    needsOnboarding,
  };
}