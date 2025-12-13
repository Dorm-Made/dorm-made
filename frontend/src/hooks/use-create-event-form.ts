import { useState, useCallback } from "react";

export interface EventFormData {
  title: string;
  description: string;
  maxParticipants: string;
  eventDate: string;
  location: string;
  price: string;
}

export function useCreateEventForm() {
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    maxParticipants: "",
    eventDate: "",
    location: "",
    price: "0",
  });

  const updateFormData = useCallback((updates: Partial<EventFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
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
    validateEventDetails,
  };
}
