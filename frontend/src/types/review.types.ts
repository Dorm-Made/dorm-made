// Foodie -> Chef: 3-layer event review (food / space / host), each 1-5 stars, total /15
export interface EventReview {
  id: string;
  eventId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerProfilePicture?: string | null;
  hostUserId: string;
  foodStars: number;
  spaceStars: number;
  hostStars: number;
  foodComment?: string | null;
  spaceComment?: string | null;
  hostComment?: string | null;
  totalStars: number; // out of 15
  createdAt: string;
}

export interface EventReviewCreate {
  foodStars: number;
  spaceStars: number;
  hostStars: number;
  foodComment?: string;
  spaceComment?: string;
  hostComment?: string;
}

export interface HostRatingSummary {
  userId: string;
  reviewCount: number;
  averageTotal?: number | null; // out of 15
  averageFood?: number | null;
  averageSpace?: number | null;
  averageHost?: number | null;
}

// Host -> Foodie: 2 criteria (sociability / etiquette), each 1-5 stars, total /10
export interface GuestReview {
  id: string;
  eventId: string;
  hostId: string;
  hostName: string;
  guestId: string;
  sociabilityStars: number;
  etiquetteStars: number;
  comment?: string | null;
  totalStars: number; // out of 10
  createdAt: string;
}

export interface GuestReviewCreate {
  guestId: string;
  sociabilityStars: number;
  etiquetteStars: number;
  comment?: string;
}

export interface GuestRatingSummary {
  userId: string;
  reviewCount: number;
  averageTotal?: number | null; // out of 10
  averageSociability?: number | null;
  averageEtiquette?: number | null;
}

// Pending reviews (booking gate + host reminders)
export interface PendingEventReview {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  hostName: string;
}

export interface UnratedGuest {
  id: string;
  name: string;
}

export interface PendingGuestReviewEvent {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  unratedGuests: UnratedGuest[];
}

export interface PendingReviews {
  pendingEventReviews: PendingEventReview[];
  pendingGuestReviews: PendingGuestReviewEvent[];
}
