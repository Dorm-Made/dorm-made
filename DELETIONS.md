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

---

## July 19, 2026 - Overnight GAPS.md cleanup (item #19: dead files)

### frontend/src/index.js
- What it was: the old Create-React-App entry point (ReactDOM.render of App).
  Unused since the move to Vite - the real entry is frontend/src/main.tsx.
- Why removed: dead code that misleads anyone (or any AI agent) grepping for
  the app entry point.
- Where its job went: frontend/src/main.tsx (already existed, unchanged).
- Restore hint: `git log --diff-filter=D -- frontend/src/index.js`

### frontend/src/lib/Index.tsx
- What it was: a duplicate of the landing page component (Header + HeroSection
  + Footer). Nothing imported it.
- Why removed: dead duplicate; the real landing page is
  frontend/src/pages/Index.tsx.
- Where its job went: frontend/src/pages/Index.tsx (already existed, unchanged).
- Restore hint: `git log --diff-filter=D -- frontend/src/lib/Index.tsx`

### frontend/public/index.html
- What it was: the CRA-era HTML shell. Vite serves the root
  frontend/index.html instead; anything in public/ gets copied verbatim into
  the build, so this stale file could even shadow the real one.
- Why removed: unused and potentially harmful in builds.
- Where its job went: frontend/index.html (already existed, unchanged).
- Restore hint: `git log --diff-filter=D -- frontend/public/index.html`

### backend committed __pycache__/ directories
- What they were: Python 3.10 bytecode caches accidentally committed before
  __pycache__ was gitignored.
- Why removed: build artifacts don't belong in git; they were stale (built
  under a different Python version).
- Where their job went: nowhere needed - Python regenerates them locally;
  .gitignore already excludes them.
- Restore hint: none needed (auto-generated).

### README.md and backend/README.md (rewritten, not deleted)
- What they were: long CRA/early-scope READMEs describing structures that no
  longer exist (category system, 5-participant cap, "out mig" merge garbage).
- Why rewritten: they actively misled newcomers and AI agents.
- Where their job went: both are now short pointers to PROJECT.md and CLAUDE.md.
- Restore hint: `git log -- README.md backend/README.md`
