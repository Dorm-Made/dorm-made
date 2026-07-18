# DELETIONS.md - Control log of removed files and features

Protocol (set by Franco, July 18, 2026): every time a file or feature is
deleted from the codebase, log it here BEFORE deleting - date, what it was in
plain language, why it was removed, and where its job went. No full code dumps,
just enough description to rebuild or restore it (git history has the code:
GitHub Desktop > History, or ask Claude to recover it).

---

## July 18, 2026 - Igor's beta feedback round

### frontend/src/components/events/StripeCheckStep.tsx
- What it was: a full-screen step inside the Create Event wizard (step 2 of 4)
  that checked whether the host had connected Stripe. If not connected, it
  showed a "Payment Setup Required" card with a "Connect Stripe" button that
  navigated to the profile's Payments tab. If connected, it showed a green
  "Payment setup complete!" confirmation screen.
- Why removed: Igor's feedback point 9 - the button felt scary/unclear (he
  didn't know what clicking would do), and the extra screen interrupted the
  event creation flow.
- Where its job went: the same Stripe check now lives as an inline banner on
  the wizard's final Summary step ("Your event only goes public once your
  Stripe account is connected"), with a Connect button that goes straight to
  Stripe onboarding. The Publish button stays disabled until Stripe is
  connected. Wizard went from 4 steps to 3 (Meal > Details > Summary).
- Restore hint: `git log --diff-filter=D -- frontend/src/components/events/StripeCheckStep.tsx`
