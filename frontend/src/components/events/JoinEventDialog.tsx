import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Event } from "@/types";
import { useCallback, useState } from "react";
import { formatDate } from "@/lib/utils";
import { createCheckoutSession } from "@/services";

interface JoinEventDialogProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

export function JoinEventDialog({ event, isOpen, onClose }: JoinEventDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    try {
      const response = await createCheckoutSession(event.id);
      return response.clientSecret;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || "Failed to create checkout session";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [event.id]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Join Event</DialogTitle>
          <DialogDescription className="sr-only">
            Review event details and complete payment
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Event Details - Desktop */}
          <div className="hidden lg:block p-6 border-r">
            <h3 className="text-xl font-semibold mb-4">{event.title}</h3>
            <div className="space-y-3 text-gray-600">
              <p className="flex items-center gap-2">
                <span>📅</span>
                <span>{formatDate(event.eventDate)}</span>
              </p>
              <p className="flex items-center gap-2">
                <span>📍</span>
                <span>{event.location}</span>
              </p>
            </div>
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between text-xl">
                <span className="font-medium">Total</span>
                <span className="font-bold">${(event.price / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Mobile: Compact Event Summary */}
          <div className="lg:hidden p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <span className="font-bold text-xl">${(event.price / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Right: Stripe Checkout */}
          <div className="lg:p-6">
            {error ? (
              <div className="text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium">Payment Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            ) : (
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
