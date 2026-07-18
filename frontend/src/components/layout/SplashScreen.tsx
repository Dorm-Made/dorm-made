/**
 * Brand splash screen.
 *
 * Shown once per browser session when a visitor lands directly on any page
 * other than the homepage (e.g. redirected from the landing page straight to
 * /signup). The homepage hero already shows the slogan, so it is skipped.
 *
 * The loading bar is purely cosmetic - a ~1.5s micropause so the visitor
 * absorbs the logo and the "Share & Taste Culture" mantra before the app
 * appears. Nothing is actually loading.
 */
import { useEffect, useState } from "react";

const SPLASH_SESSION_KEY = "dm_splash_shown";
const BAR_DURATION_MS = 1500; // loading bar fill time
const FADE_DELAY_MS = 1700; // start fading shortly after the bar completes
const REMOVE_DELAY_MS = 2200; // unmount after the fade finishes

// Decided once at module load so React StrictMode double-renders
// cannot flip the result.
const SHOULD_SHOW_SPLASH = (() => {
  try {
    if (window.location.pathname === "/") return false;
    if (sessionStorage.getItem(SPLASH_SESSION_KEY)) return false;
    sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    return true;
  } catch {
    // Storage unavailable (private mode edge cases) - skip the splash.
    return false;
  }
})();

export function SplashScreen() {
  const [visible, setVisible] = useState(SHOULD_SHOW_SPLASH);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!SHOULD_SHOW_SPLASH) return;
    const fadeTimer = setTimeout(() => setFading(true), FADE_DELAY_MS);
    const removeTimer = setTimeout(() => setVisible(false), REMOVE_DELAY_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Keyframes local to the splash so no Tailwind config changes are needed */}
      <style>{`
        @keyframes dm-splash-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes dm-splash-pop {
          0% { opacity: 0; transform: scale(0.9) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Background: the hero food-table photo, responsive like the homepage */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:hidden"
        style={{ backgroundImage: "url(/images/hero-background-mobile.jpg)" }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden lg:block"
        style={{ backgroundImage: "url(/images/hero-background.jpeg)" }}
      />
      {/* Dark overlay so the logo and slogan pop */}
      <div className="absolute inset-0 bg-black/70" />

      <div
        className="relative z-10 flex flex-col items-center px-6"
        style={{ animation: "dm-splash-pop 0.5s ease-out both" }}
      >
        {/* Logo in a white app-icon card (the mark is black, needs a light base) */}
        <div className="bg-white rounded-3xl shadow-2xl p-5 mb-6">
          <img
            src="/assets/images/logo.png"
            alt="Dorm Made"
            className="h-20 w-20 lg:h-24 lg:w-24 object-contain"
          />
        </div>

        {/* Slogan, same gradient treatment as the homepage hero */}
        <h1 className="text-3xl lg:text-5xl font-bold tracking-tight text-center mb-10">
          <span className="bg-gradient-to-r from-primary to-red-200 text-transparent bg-clip-text">
            Share &amp; Taste Culture
          </span>
        </h1>

        {/* Cosmetic loading bar */}
        <div className="w-48 lg:w-64 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-red-300"
            style={{
              animation: `dm-splash-fill ${BAR_DURATION_MS}ms ease-in-out forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
