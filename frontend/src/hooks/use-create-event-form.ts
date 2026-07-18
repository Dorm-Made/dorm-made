import { useState, useCallback } from "react";

export interface EventFormData {
  title: string;
  description: string;
  maxParticipants: string;
  eventDate: string;
  location: string;
  price: string;
  currency: string;
}

const EVENT_DRAFT_KEY = "eventDraft";

const EMPTY_FORM: EventFormData = {
  title: "",
  description: "",
  maxParticipants: "",
  eventDate: "",
  location: "",
  price: "0",
  currency: "usd",
};

function readEventDraft(): EventFormData {
  try {
    const stored = JSON.parse(localStorage.getItem(EVENT_DRAFT_KEY) || "null");
    if (stored && typeof stored === "object") {
      return { ...EMPTY_FORM, ...stored };
    }
  } catch {
    // corrupted draft - start fresh
  }
  return EMPTY_FORM;
}

export function useCreateEventForm() {
  // Drafts survive tab closes, session timeouts, and the Stripe connect round-trip
  const [formData, setFormData] = useState<EventFormData>(readEventDraft);

  const updateFormData = useCallback((updates: Partial<EventFormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(EVENT_DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(EVENT_DRAFT_KEY);
  }, []);

  const validateEventDetails = useCallback(() => {
    const requiredFields: (keyof EventFormData)[] = [
      "title",
      "description",
      "maxParticipants",
      "eventDate",
      "location",
      "price",
    ];
    return requiredFields.every((field) => {
      const value = formData[field];
      return value && value.trim() !== "";
    });
  }, [formData]);

  return {
    formData,
    updateFormData,
    clearDraft,
    validateEventDetails,
  };
}
