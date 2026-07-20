import { httpClient } from "./http-client";
import { QuizQuestion, TasteProfileResponse } from "@/types/user.types";

async function getInviteCode(): Promise<string> {
  const response = await httpClient.get("/users/me/invite-code");
  return response.data.inviteCode;
}

async function getQuizQuestions(): Promise<QuizQuestion[]> {
  const response = await httpClient.get("/taste-quiz/questions");
  return response.data;
}

async function submitQuiz(picks: string[]): Promise<TasteProfileResponse> {
  const response = await httpClient.post("/users/me/taste-quiz", { picks });
  return response.data;
}

export const onboardingService = {
  getInviteCode,
  getQuizQuestions,
  submitQuiz,
};
