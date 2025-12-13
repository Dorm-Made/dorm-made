import { httpClient } from "./http-client";
import { Event, EventCreate, EventUpdate, JoinEventRequest, RefundResponse } from "@/types";

// Use FormData (for image uploads)
export const createEvent = async (eventData: EventCreate | FormData): Promise<Event> => {
  const response = await httpClient.post("/events/", eventData);
  return response.data;
};

export const getEvents = async (): Promise<Event[]> => {
  const response = await httpClient.get("/events/");
  return response.data;
};

export const getEvent = async (eventId: string): Promise<Event> => {
  const response = await httpClient.get(`/events/${eventId}`);
  return response.data;
};

export const joinEvent = async (
  joinData: JoinEventRequest,
): Promise<{ message: string; event_id: string }> => {
  const response = await httpClient.post("/events/join/", joinData);
  return response.data;
};

export const getMyEvents = async (): Promise<Event[]> => {
  const response = await httpClient.get("/events/me");
  return response.data;
};

export const getJoinedEvents = async (): Promise<Event[]> => {
  const response = await httpClient.get("/events/me/joined");
  return response.data;
};

export const getUserEvents = async (userId: string): Promise<Event[]> => {
  const response = await httpClient.get("/events/", {
    params: { user_id: userId },
  });
  return response.data;
};

export const updateEvent = async (eventId: string, eventData: EventUpdate): Promise<Event> => {
  const response = await httpClient.put(`/events/${eventId}`, eventData);
  return response.data;
};

export const deleteEvent = async (
  eventId: string,
): Promise<{ message: string; event_id: string }> => {
  const response = await httpClient.delete(`/events/${eventId}`);
  return response.data;
};

export const refundEvent = async (eventId: string): Promise<RefundResponse> => {
  const response = await httpClient.post(`/events/${eventId}/refund`);
  return response.data;
};
