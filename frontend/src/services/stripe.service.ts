import { httpClient } from "./http-client";
import { StripeConnectResponse, StripeStatusResponse, CreateCheckoutSessionResponse, SessionStatusResponse } from "@/types";

export const initiateStripeConnect = async (): Promise<StripeConnectResponse> => {
  const response = await httpClient.post<StripeConnectResponse>("/users/stripe/connect");
  return response.data;
};

export const getStripeStatus = async (): Promise<StripeStatusResponse> => {
  const response = await httpClient.get<StripeStatusResponse>("/users/stripe/status");
  return response.data;
};

export const createCheckoutSession = async (eventId: string): Promise<CreateCheckoutSessionResponse> => {
  const response = await httpClient.post<CreateCheckoutSessionResponse>(`/events/${eventId}/create-checkout-session`);
  return response.data;
};

export const getSessionStatus = async (sessionId: string): Promise<SessionStatusResponse> => {
  const response = await httpClient.get<SessionStatusResponse>("/checkout/session-status", {
    params: { session_id: sessionId }
  });
  return response.data;
};