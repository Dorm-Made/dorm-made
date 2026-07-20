export interface User {
  id: string;
  name: string;
  email: string;
  university?: string | null;
  description?: string | null;
  profilePicture?: string | null;
  createdAt: string;
  // Referral system
  inviteCode?: string | null;
  referredByUserId?: string | null;
  referredByName?: string | null;
  // Taste profile + onboarding
  tasteArchetype?: string | null;
  tasteDescription?: string | null;
  onboardingCompleted?: boolean;
}

// Public profile shape returned by GET /users/{id} - no email, Stripe, or
// referral internals (those only exist on the authenticated /users/me).
export interface PublicUser {
  id: string;
  name: string;
  university?: string | null;
  description?: string | null;
  profilePicture?: string | null;
  tasteArchetype?: string | null;
  tasteDescription?: string | null;
  createdAt: string;
}

export interface UserCreate {
  name: string;
  email: string;
  university: string;
  password: string;
  inviteCode?: string;
}

export interface QuizOption {
  id: string;
  label: string;
  imageUrl: string;
  emoji: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export interface TasteProfileResponse {
  tasteArchetype: string;
  tasteDescription: string;
  onboardingCompleted: boolean;
}

export interface UserUpdate {
  university?: string | null;
  description?: string | null;
  profilePicture?: string | null;
}
