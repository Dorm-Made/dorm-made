import { httpClient } from "./http-client";
import {
  EventReview,
  EventReviewCreate,
  GuestRatingSummary,
  GuestReview,
  GuestReviewCreate,
  HostRatingSummary,
  PendingReviews,
} from "@/types/review.types";

async function submitEventReview(
  eventId: string,
  review: EventReviewCreate,
): Promise<EventReview> {
  const response = await httpClient.post(`/events/${eventId}/reviews`, review);
  return response.data;
}

async function getEventReviews(eventId: string): Promise<EventReview[]> {
  const response = await httpClient.get(`/events/${eventId}/reviews`);
  return response.data;
}

async function getHostRating(userId: string): Promise<HostRatingSummary> {
  const response = await httpClient.get(`/users/${userId}/host-rating`);
  return response.data;
}

async function submitGuestReview(
  eventId: string,
  review: GuestReviewCreate,
): Promise<GuestReview> {
  const response = await httpClient.post(`/events/${eventId}/guest-reviews`, review);
  return response.data;
}

async function getEventGuestReviews(eventId: string): Promise<GuestReview[]> {
  const response = await httpClient.get(`/events/${eventId}/guest-reviews`);
  return response.data;
}

async function getGuestRating(userId: string): Promise<GuestRatingSummary> {
  const response = await httpClient.get(`/users/${userId}/guest-rating`);
  return response.data;
}

async function getGuestReviewsReceived(userId: string): Promise<GuestReview[]> {
  const response = await httpClient.get(`/users/${userId}/guest-reviews`);
  return response.data;
}

async function getPendingReviews(): Promise<PendingReviews> {
  const response = await httpClient.get("/users/me/pending-reviews");
  return response.data;
}

export const reviewService = {
  submitEventReview,
  getEventReviews,
  getHostRating,
  submitGuestReview,
  getEventGuestReviews,
  getGuestRating,
  getGuestReviewsReceived,
  getPendingReviews,
};
