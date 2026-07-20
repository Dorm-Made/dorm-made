import { User } from "./user.types";

export interface UserLogin {
  email: string;
  password: string;
}

export interface Token {
  accessToken: string;
  tokenType: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}
