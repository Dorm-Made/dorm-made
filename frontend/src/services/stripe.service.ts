import { httpClient } from "./http-client";
import {
  StripeConnectResponse,
  StripeStatusResponse,
  CreateCheckoutSessionResponse,
  SessionStatusResponse,
} from "@/types";

async function initiateStripeConnect(): Promise<StripeConnectResponse> {
  const response = await httpClient.post<StripeConnectResponse>("/users/stripe/connect");
  return response.data;
}

async function getStripeStatus(): Promise<StripeStatusResponse> {
  const response = await httpClient.get<StripeStatusResponse>("/users/stripe/status");
  return response.data;
}

async function createCheckoutSession(eventId: string): Promise<CreateCheckoutSessionResponse> {
  const response = await httpClient.post<CreateCheckoutSessionResponse>(
    `/events/${eventId}/create-checkout-session`,
  );
  return response.data;
}

async function getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
  const response = await httpClient.get<SessionStatusResponse>("/checkout/session-status", {
    params: { session_id: sessionId },
  });
  return response.data;
}

export const stripeService = {
  initiateStripeConnect,
  getStripeStatus,
  createCheckoutSession,
  getSessionStatus,
};
