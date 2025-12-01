import { useState, useCallback, useMemo } from "react";

export enum Step {
  STRIPE_CHECK = "STRIPE_CHECK",
  MEAL = "MEAL",
  EVENT_DETAILS = "EVENT_DETAILS",
  SUMMARY = "SUMMARY",
}

export function useCreateEvent() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.STRIPE_CHECK);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const steps = useMemo(() => [Step.STRIPE_CHECK, Step.MEAL, Step.EVENT_DETAILS, Step.SUMMARY], []);

  const getCurrentStepIndex = useCallback(() => {
    return steps.indexOf(currentStep);
  }, [currentStep, steps]);

  const getTotalSteps = useCallback(() => {
    return steps.length;
  }, [steps]);

  const getProgressPercentage = useCallback(() => {
    return ((getCurrentStepIndex() + 1) / getTotalSteps()) * 100;
  }, [getCurrentStepIndex, getTotalSteps]);

  const canGoBack = useCallback(() => {
    return getCurrentStepIndex() > 0;
  }, [getCurrentStepIndex]);

  const canGoNext = useCallback(() => {
    return getCurrentStepIndex() < steps.length - 1;
  }, [getCurrentStepIndex, steps]);

  const nextStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [getCurrentStepIndex, steps]);

  const complete = useCallback(() => {
    setIsCompleted(true);
  }, []);

  const isFirstStep = useCallback(() => {
    return getCurrentStepIndex() === 0;
  }, [getCurrentStepIndex]);

  const isLastStep = useCallback(() => {
    return getCurrentStepIndex() === steps.length - 1;
  }, [getCurrentStepIndex, steps]);

  const prevStep = useCallback(() => {
    if (canGoBack()) {
      const currentIndex = getCurrentStepIndex();
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [canGoBack, getCurrentStepIndex, steps]);

  return {
    currentStep,
    nextStep,
    prevStep,
    canGoBack,
    canGoNext,
    isFirstStep,
    isLastStep,
    complete,
    isCompleted,
    getProgressPercentage,
  };
}
