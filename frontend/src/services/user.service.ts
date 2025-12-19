import { httpClient, getAuthToken } from "./http-client";
import { User, UserCreate, UserUpdate } from "@/types";
import { StripeLoginLinkResponse } from "@/types/stripe.types";

async function createUser(userData: UserCreate): Promise<User> {
  const response = await httpClient.post("/users/", userData);
  return response.data;
}

async function getUser(userId: string): Promise<User> {
  const response = await httpClient.get(`/users/${userId}`);
  return response.data;
}

async function updateUser(userId: string, userUpdate: UserUpdate): Promise<User> {
  const response = await httpClient.patch(`/users/${userId}`, userUpdate);
  return response.data;
}

async function uploadProfilePicture(userId: string, file: File): Promise<User> {
  const formData = new FormData();
  formData.append("image", file);

  const url = `/users/${userId}/profile-picture`;

  const response = await httpClient.post(url, formData);
  return response.data;
}

async function getStripeLoginLink(): Promise<StripeLoginLinkResponse> {
  const response = await httpClient.get("/users/stripe/login");
  return response.data;
}

export const userService = {
  createUser,
  getUser,
  updateUser,
  uploadProfilePicture,
  getStripeLoginLink,
};
