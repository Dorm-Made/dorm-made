import { useState, useCallback, useEffect } from "react";
import { stripeService } from "@/services";
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
      const status = await stripeService.getStripeStatus();
      setStripeStatus(status);
    } catch (error) {
      console.error("[useStripeConnect] Error checking status:", error);
      setStripeStatus({
        connected: false,
        chargesEnabled: false,
        onboardingComplete: false,
        accountId: null,
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

      const response = await stripeService.initiateStripeConnect();

      if (currentUser) {
        analytics.stripeOnboardingStarted(currentUser.id);
      }

      window.location.href = response.onboardingUrl;
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
  const canAcceptPayments = stripeStatus?.chargesEnabled ?? false;
  const needsOnboarding = !stripeStatus?.onboardingComplete;

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