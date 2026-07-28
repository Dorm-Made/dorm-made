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
import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { stripeService } from "@/services";
import { getCurrencySymbol } from "@/utils/price";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, MapPin, ShieldCheck, UtensilsCrossed } from "lucide-react";

interface JoinEventDialogProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

export function JoinEventDialog({ event, isOpen, onClose }: JoinEventDialogProps) {
  // Two-step flow: review the key facts + "Secure your seat", THEN pay.
  const [stage, setStage] = useState<"confirm" | "paying">("confirm");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The dialog stays mounted across open/close - reset it each time it opens.
  useEffect(() => {
    if (isOpen) {
      setStage("confirm");
      setClientSecret(null);
      setBlockedMessage(null);
      setLoading(false);
    }
  }, [isOpen]);

  const priceLabel = getCurrencySymbol(event.currency) + (event.price / 100).toFixed(2);

  const handleSecureSeat = async () => {
    setLoading(true);
    setBlockedMessage(null);
    try {
      sessionStorage.setItem("pendingEventJoin", JSON.stringify({ eventId: event.id }));
      const response = await stripeService.createCheckoutSession(event.id);
      setClientSecret(response.clientSecret);
      setStage("paying");
    } catch (err: any) {
      // Covers showcase-host blocks (e.g. Steve Trump) and real gates
      // (event full, already booked, host not connected) with a calm message.
      const msg =
        err?.response?.data?.detail ||
        "We couldn't start checkout right now. Please try again in a moment.";
      setBlockedMessage(msg);
      sessionStorage.removeItem("pendingEventJoin");
    } finally {
      setLoading(false);
    }
  };

  // We already fetched the secret on "Secure your seat"; hand it straight to Stripe.
  const fetchClientSecret = useCallback(
    () => Promise.resolve(clientSecret as string),
    [clientSecret],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {stage === "paying" ? "Complete your payment" : "Secure your seat"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review the event details and confirm your booking
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: the key facts */}
          <div className="lg:p-6 lg:border-r">
            <h3 className="text-xl font-semibold mb-4">{event.title}</h3>
            {event.mealName && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <UtensilsCrossed className="h-4 w-4 shrink-0" />
                <span>{event.mealName}</span>
              </p>
            )}
            <div className="space-y-3 text-gray-600">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>{formatDate(event.eventDate)}</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{event.location}</span>
              </p>
            </div>
            {event.description && (
              <p className="mt-4 text-sm text-muted-foreground line-clamp-4">
                {event.description}
              </p>
            )}
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between text-xl">
                <span className="font-medium">Total</span>
                <span className="font-bold">{priceLabel}</span>
              </div>
            </div>
          </div>

          {/* Right: confirm -> pay */}
          <div className="lg:p-6">
            {blockedMessage ? (
              <div className="flex flex-col justify-center h-full">
                <div className="rounded-lg border bg-muted/50 p-5 text-center">
                  <p className="text-base font-medium mb-4">{blockedMessage}</p>
                  <Button variant="outline" onClick={onClose}>
                    Got it
                  </Button>
                </div>
              </div>
            ) : stage === "confirm" ? (
              <div className="flex flex-col justify-center h-full space-y-4">
                <Button
                  size="lg"
                  className="w-full text-base py-6"
                  onClick={handleSecureSeat}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Starting checkout...
                    </>
                  ) : (
                    <>Secure your seat · {priceLabel}</>
                  )}
                </Button>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Your card is only held, not charged, until your host approves your seat -
                    and you can cancel for a full refund any time before then.
                  </span>
                </p>
              </div>
            ) : (
              clientSecret && (
                <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
