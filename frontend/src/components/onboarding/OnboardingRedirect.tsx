import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken } from "@/services/http-client";

const EXEMPT_PATHS = ["/onboarding", "/login", "/signup"];

/**
 * Global gate: any logged-in user who hasn't completed the taste quiz is
 * sent to /onboarding (non-skippable first-login experience). Renders nothing.
 */
export function OnboardingRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (EXEMPT_PATHS.some((path) => location.pathname.startsWith(path))) return;

    const token = getAuthToken();
    const userStr = localStorage.getItem("currentUser");
    if (!token || !userStr || userStr === "undefined") return;

    try {
      const currentUser = JSON.parse(userStr);
      if (currentUser && !currentUser.onboardingCompleted) {
        navigate("/onboarding", { replace: true });
      }
    } catch {
      // Ignore malformed cached user
    }
  }, [location.pathname, navigate]);

  return null;
}
