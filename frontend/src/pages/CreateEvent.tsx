import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/utils/error";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/home/Footer";
import { CreateEventProgressBar } from "@/components/layout/ProgressBar";
import { Step, useCreateEvent } from "@/hooks/use-create-event";
import SelectMeal from "@/components/events/SelectMeal";
import EventDetailsForm from "@/components/events/EventDetailsForm";
import EventSummary from "@/components/events/EventSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { useCreateEventForm } from "@/hooks/use-create-event-form";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useMeals } from "@/hooks/use-meals";
import { useToast } from "@/hooks/use-toast";
import { useStripeConnect } from "@/hooks/use-stripe-connect";
import { eventService, authService } from "@/services";
import { getPriceInCents } from "@/utils/price";
import { User } from "@/types";
import { analytics } from "@/lib/analytics";

export default function CreateEvent() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    currentStep,
    nextStep,
    prevStep,
    canGoBack,
    canGoNext,
    isLastStep,
    isCompleted,
    getProgressPercentage,
  } = useCreateEvent();

  const { formData, updateFormData, clearDraft, validateEventDetails } = useCreateEventForm();

  const {
    selectedImage,
    imagePreview,
    rawPreview,
    rawFileName,
    needsAdjust,
    handleImageChange,
    applyAdjustedImage,
    reAdjust,
    handleRemoveImage,
  } = useImageUpload();

  const { meals, loading: mealsLoading, selectedMeal, selectMeal } = useMeals();

  const {
    canAcceptPayments,
    loading: stripeLoading,
    connecting: stripeConnecting,
    startOnboarding,
  } = useStripeConnect();

  const buildPayload = () => {
    const payload = new FormData();
    payload.append("title", formData.title);
    payload.append("description", formData.description);
    payload.append("max_participants", formData.maxParticipants);
    payload.append("event_date", formData.eventDate);
    payload.append("location", formData.location);
    payload.append("meal_id", selectedMeal!.id);

    payload.append("price", getPriceInCents(formData.price).toString());
    payload.append("currency", formData.currency);

    if (selectedImage) {
      payload.append("image", selectedImage);
    }

    return payload;
  };

  const handleFinalize = async () => {
    if (!selectedMeal) {
      toast({
        title: "Error",
        description: "Please select a meal",
        variant: "destructive",
        duration: 1500,
      });
      return;
    }

    if (!validateEventDetails()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
        duration: 1500,
      });
      return;
    }

    setLoading(true);

    try {
      const token = authService.getAuthToken();
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create events",
          variant: "destructive",
          duration: 1500,
        });
        navigate("/login");
        return;
      }

      const payload = buildPayload();
      const event = await eventService.createEvent(payload);

      const currentUser = localStorage.getItem("currentUser");
      if (currentUser) {
        const user: User = JSON.parse(currentUser);
        analytics.eventCreated({ userId: user.id, event, meal: selectedMeal! });
      }

      clearDraft();

      toast({
        title: "Success!",
        description: "Event created successfully!",
        className: "bg-green-500 text-white border-green-600",
        duration: 1500,
      });

      navigate("/explore");
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create event"),
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case Step.MEAL:
        return selectedMeal !== null;
      case Step.EVENT_DETAILS:
        return validateEventDetails();
      case Step.SUMMARY:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case Step.MEAL:
        return (
          <SelectMeal
            meals={meals}
            loading={mealsLoading}
            selectedMeal={selectedMeal}
            onSelectMeal={selectMeal}
          />
        );
      case Step.EVENT_DETAILS:
        return (
          <EventDetailsForm
            formData={formData}
            onInputChange={updateFormData}
            imagePreview={imagePreview}
            rawPreview={rawPreview}
            rawFileName={rawFileName}
            needsAdjust={needsAdjust}
            onImageChange={handleImageChange}
            onApplyAdjusted={applyAdjustedImage}
            onReAdjust={reAdjust}
            onRemoveImage={handleRemoveImage}
          />
        );
      case Step.SUMMARY:
        return (
          <EventSummary
            selectedMeal={selectedMeal}
            formData={formData}
            imagePreview={imagePreview}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <CreateEventProgressBar
              progressPercentage={getProgressPercentage()}
              isCompleted={isCompleted}
            ></CreateEventProgressBar>
          </div>

          {renderStepContent()}

          {/* Publish gate: events only go live once Stripe is connected */}
          {!isCompleted && isLastStep() && !stripeLoading && !canAcceptPayments && (
            <Card className="mt-6 border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10 shrink-0">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold mb-1">One last thing: connect your payout account</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your event only goes public once your Stripe account is connected -
                      that's how you get paid. It takes about 2 minutes, Stripe handles it
                      securely, and your event details are saved while you do it.
                    </p>
                    <Button onClick={startOnboarding} disabled={stripeConnecting}>
                      {stripeConnecting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      {stripeConnecting ? "Opening Stripe..." : "Connect Stripe to publish"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isCompleted && (
            <div className="p-6 flex justify-between space-x-4 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => (canGoBack() ? prevStep() : navigate(-1))}
                className="flex-1"
              >
                Back
              </Button>

              <Button
                onClick={isLastStep() ? handleFinalize : nextStep}
                disabled={
                  (!canProceedToNext() && !isLastStep()) ||
                  loading ||
                  (isLastStep() && (stripeLoading || !canAcceptPayments))
                }
                className={`flex-1 ${(canProceedToNext() || isLastStep()) && !loading ? "" : "cursor-not-allowed"}`}
              >
                {loading ? "Creating..." : isLastStep() ? "Publish event" : "Next"}
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
