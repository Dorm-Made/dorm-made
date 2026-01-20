import { EventParticipant, RefundResponse } from "@/types/event.types";
import { httpClient } from "./http-client";
import { Event, EventCreate, EventUpdate, JoinEventRequest, User } from "@/types";

async function createEvent(eventData: EventCreate | FormData): Promise<Event> {
  const response = await httpClient.post("/events/", eventData);
  return response.data;
}

async function getEvents(): Promise<Event[]> {
  const response = await httpClient.get("/events/");
  return response.data;
}

async function getEvent(eventId: string): Promise<Event> {
  const response = await httpClient.get(`/events/${eventId}`);
  return response.data;
}

async function getMyEvents(): Promise<Event[]> {
  const response = await httpClient.get("/events/me");
  return response.data;
}

async function getJoinedEvents(): Promise<Event[]> {
  const response = await httpClient.get("/events/me/joined");
  return response.data;
}

async function getUserEvents(userId: string): Promise<Event[]> {
  const response = await httpClient.get("/events/", {
    params: { user_id: userId },
  });
  return response.data;
}

async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  const response = await httpClient.get(`/events/${eventId}/participants`);
  return response.data;
}

async function acceptUserParticipation(eventId: string, userId: string): Promise<void> {
  const response = await httpClient.post(`/events/accept-participation`, {
    event_id: eventId,
    user_id: userId,
  });
}

async function updateEvent(eventId: string, eventData: EventUpdate): Promise<Event> {
  const response = await httpClient.put(`/events/${eventId}`, eventData);
  return response.data;
}

async function deleteEvent(eventId: string): Promise<{ message: string; event_id: string }> {
  const response = await httpClient.delete(`/events/${eventId}`);
  return response.data;
}

async function refundEvent(eventId: string): Promise<RefundResponse> {
  const response = await httpClient.post(`/events/${eventId}/refund`);
  return response.data;
}

export const eventService = {
  createEvent,
  getEvents,
  getEvent,
  getMyEvents,
  getJoinedEvents,
  getUserEvents,
  getEventParticipants,
  acceptUserParticipation,
  updateEvent,
  deleteEvent,
  refundEvent,
};
