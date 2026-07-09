export interface User {
  id: string;
  name: string;
  email: string;
  university?: string | null;
  description?: string | null;
  profile_picture?: string | null;
  created_at: string;
  // Referral system
  invite_code?: string | null;
  referred_by_user_id?: string | null;
  referred_by_name?: string | null;
  // Taste profile + onboarding
  taste_archetype?: string | null;
  taste_description?: string | null;
  onboarding_completed?: boolean;
}

export interface UserCreate {
  name: string;
  email: string;
  university: string;
  password: string;
  invite_code?: string;
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
  taste_archetype: string;
  taste_description: string;
  onboarding_completed: boolean;
}

export interface UserUpdate {
  university?: string | null;
  description?: string | null;
  profile_picture?: string | null;
}
