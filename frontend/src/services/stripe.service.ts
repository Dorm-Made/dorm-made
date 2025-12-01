import { httpClient } from "./http-client";
import { StripeConnectResponse, StripeStatusResponse } from "@/types";

export const initiateStripeConnect = async (): Promise<StripeConnectResponse> => {
  const response = await httpClient.post<StripeConnectResponse>("/users/stripe/connect");
  return response.data;
};

export const getStripeStatus = async (): Promise<StripeStatusResponse> => {
  const response = await httpClient.get<StripeStatusResponse>("/users/stripe/status");
  return response.data;
};