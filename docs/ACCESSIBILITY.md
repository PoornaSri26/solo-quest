# Accessibility Statement

Solo Quest aims to be playable by everyone. This statement covers what is done, what is in progress, and how to report barriers. Feedback: open an issue or email poornasri.n24@gmail.com.

## Conformance target

WCAG 2.1 AA is the target for the web app. We are **partially conformant** — most of the app meets AA, with known gaps listed below.

## Implemented

- **Keyboard navigation** (#266): dashboard, quest CRUD, and shop are operable by keyboard; visible focus states.
- **Reduced motion** (#269): `prefers-reduced-motion` disables the 3D avatar idle animation and render loop (frameloop="demand"), and the loot popup pulse.
- **2D fallback**: WebGL unavailable → DiceBear 2D avatar; "Disable 3D" toggle for anyone.
- **Colorblind-safe ranks** (#268, partial): rank badges pair color with a letter glyph — color is never the only carrier of rank information (#410).
- **Semantics**: semantic HTML landmarks, labeled form controls, alt text on meaningful images (#271).
- **Theme**: dark theme with AA contrast on body text; high-contrast refinements tracked in #273.
- **Accessible errors** (#281, partial): form errors are text-adjacent to their fields.

## Known gaps

- Full ARIA audit pending (#267); some interactive components use `div`s with click handlers.
- Screen-reader-tested onboarding flow not yet validated (#282).
- No plain-language mode (#275) or dyslexia-friendly font option (#280) yet.
- Video/audio content captions (#272) — none exists yet; bot voice captions planned with that feature (#284).
- 200% zoom verified on dashboard only (#270); other pages unverified.
- Cognitive-accessibility mode (simplified UI state) tracked in #278.

## Testing approach

- axe-core automated checks are planned for the CI pipeline (#248).
- Manual keyboard + zoom passes happen per release (see docs/QA_CHECKLIST.md).
- The 3D avatar exposes a text description of its configuration for assistive tech (#260 — planned).
