import { httpClient, getAuthToken } from "./http-client";
import { User, UserCreate, UserUpdate } from "@/types";

export const createUser = async (userData: UserCreate): Promise<User> => {
  const response = await httpClient.post("/users/", userData);
  return response.data;
};

export const getUser = async (userId: string): Promise<User> => {
  console.log(`Fetching user with ID: ${userId}`);
  console.log(`Full URL will be: ${httpClient.defaults.baseURL}/users/${userId}`);
  const response = await httpClient.get(`/users/${userId}`);
  console.log("User response:", response.data);
  return response.data;
};

export const updateUser = async (userId: string, userUpdate: UserUpdate): Promise<User> => {
  console.log(`Updating user ${userId} with:`, userUpdate);
  const response = await httpClient.patch(`/users/${userId}`, userUpdate);
  console.log("Updated user response:", response.data);
  return response.data;
};

export const uploadProfilePicture = async (userId: string, file: File): Promise<User> => {
  const formData = new FormData();
  formData.append("image", file);

  const url = `/users/${userId}/profile-picture`;
  const fullUrl = `${httpClient.defaults.baseURL}${url}`;

  console.log("[DEBUG] Upload Profile Picture:", {
    userId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    url,
    fullUrl,
    baseURL: httpClient.defaults.baseURL,
    hasToken: !!getAuthToken(),
  });

  const response = await httpClient.post(url, formData);
  console.log("[DEBUG] Upload successful:", response.data);
  return response.data;
};
