import { Event, Meal } from "@/types";
import posthog from "../../posthog-typed";

const isProd = import.meta.env.MODE === "production";

function identify(userId: string): void {
  if (!isProd) {
    console.log("[Analytics] identify:", userId);
    return;
  }

  posthog.identify(userId);
}

function reset(): void {
  if (!isProd) {
    console.log("[Analytics] reset");
    return;
  }

  posthog.reset();
}

function userSignedUp(userId: string): void {
  identify(userId);
  posthog.capture("user_sign_in", { user_id: userId });
}

function userLoggedIn(userId: string): void {
  identify(userId);
  posthog.capture("user_log_in", { user_id: userId });
}

function mealCreated(params: { userId: string; meal: Meal }): void {
  posthog.capture("meal_created", {
    user_id: params.userId,
    meal_id: params.meal.id,
    meal_title: params.meal.title,
    has_picture: Boolean(params.meal.imageUrl),
  });
}

function stripeOnboardingStarted(userId: string): void {
  posthog.capture("stripe_onboarding_started", { user_id: userId });
}

function stripeOnboardingCompleted(userId: string): void {
  posthog.capture("stripe_onboarding_completed", { user_id: userId });
}

function eventCreated(params: { userId: string; event: Event; meal: Meal }): void {
  posthog.capture("event_created", {
    user_id: params.userId,
    event_id: params.event.id,
    host_user_id: params.userId,
    event_date: params.event.eventDate,
    event_price: params.event.price,
    event_max_participants: params.event.maxParticipants,
    has_picture: Boolean(params.event.imageUrl),
    meal_id: params.meal.id,
    meal_title: params.meal.title,
  });
}

function eventJoined(params: { userId: string; event: Event; meal: Meal }): void {
  posthog.capture("event_joined", {
    user_id: params.userId,
    event_id: params.event.id,
    host_user_id: params.event.hostUserId,
    event_date: params.event.eventDate,
    event_price: params.event.price,
    event_max_participants: params.event.maxParticipants,
    has_picture: Boolean(params.event.imageUrl),
    meal_id: params.meal.id,
    meal_title: params.meal.title,
  });
}

export const analytics = {
  reset,
  userSignedUp,
  userLoggedIn,
  mealCreated,
  stripeOnboardingStarted,
  stripeOnboardingCompleted,
  eventCreated,
  eventJoined,
};
