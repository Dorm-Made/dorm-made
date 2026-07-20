export interface StripeConnectResponse {
  onboardingUrl: string;
  accountId: string;
}

export interface StripeStatusResponse {
  connected: boolean;
  chargesEnabled: boolean;
  onboardingComplete: boolean;
  accountId: string | null;
}

export interface CreateCheckoutSessionResponse {
  clientSecret: string;
}

export interface SessionStatusResponse {
  status: string;
  paymentStatus: string;
}

export interface StripeLoginLinkResponse {
  accountUrl: string;
}
