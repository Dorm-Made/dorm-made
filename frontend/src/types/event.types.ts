export interface Event {
  id: string;
  hostUserId: string;
  mealId: string;
  mealName: string;
  title: string;
  description: string;
  maxParticipants: number;
  currentParticipants: number;
  eventDate: string;
  location: string;
  imageUrl?: string;
  price: number;
  createdAt: string;
}

export interface EventCreate {
  title: string;
  description: string;
  maxParticipants: number;
  eventDate: string;
  location: string;
  price: number;
}

export interface EventUpdate {
  title?: string;
  description?: string;
  maxParticipants?: number;
  location?: string;
  eventDate?: string;
  price?: number;
}

export interface JoinEventRequest {
  event_id: string;
}
