import {
  httpClient,
  setAuthToken as setToken,
  getAuthToken as getToken,
  removeAuthToken as removeToken,
} from "./http-client";
import { UserLogin, LoginResponse } from "@/types";

async function loginUser(loginData: UserLogin): Promise<LoginResponse> {
  const response = await httpClient.post("/users/login", loginData);
  return response.data;
}

function setAuthToken(token: string): void {
  setToken(token);
}

function getAuthToken(): string | null {
  return getToken();
}

function removeAuthToken(): void {
  removeToken();
}

export const authService = {
  loginUser,
  setAuthToken,
  getAuthToken,
  removeAuthToken,
};
