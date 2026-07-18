/**
 * Single source of truth for text field length limits across the app.
 * Keep in sync with any future backend validation.
 */
export const LIMITS = {
  MEAL_NAME: 60,
  MEAL_DESCRIPTION: 1000,
  MEAL_INGREDIENTS: 600,
  EVENT_TITLE: 60,
  EVENT_DESCRIPTION: 1000,
  EVENT_LOCATION: 120,
  PROFILE_ABOUT: 500,
  UNIVERSITY: 80,
  FIRST_NAME: 40,
  LAST_NAME: 40,
} as const;

/** "123/1000" helper for textarea counters */
export function charCount(value: string | undefined | null, max: number): string {
  return `${(value || "").length}/${max}`;
}
