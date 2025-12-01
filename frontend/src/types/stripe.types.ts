export interface StripeConnectResponse {
  onboarding_url: string;
  account_id: string;
}

export interface StripeStatusResponse {
  connected: boolean;
  charges_enabled: boolean;
  onboarding_complete: boolean;
  account_id: string | null;
}