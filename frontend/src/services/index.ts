/**
 * Services barrel export
 * Centralized exports for all API services
 */

// HTTP Client & Configuration
export { httpClient, API_CONFIG, setAuthToken, getAuthToken, removeAuthToken } from "./http-client";

// Auth Service
export * from "./auth.service";

// User Service
export * from "./user.service";

// Event Service
export * from "./event.service";

// Meal Service
export * from "./meal.service";

// Stripe Service
export * from "./stripe.service";
