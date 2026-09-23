# Contributing to Solo Quest

Thanks for your interest in contributing! 🎮 This document covers everything you need to get started.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md). Report unacceptable behavior to poornasri.n24@gmail.com.

## Getting Started

1. **Fork & clone** the repository.
2. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install
   ```
3. **Set up environment:** copy `server/.env.example` to `server/.env` and fill in values (SQLite works for local dev: `DATABASE_URL="file:./dev.db"`).
4. **Initialize the database:**
   ```bash
   cd server
   npx prisma generate
   npx prisma migrate dev
   ```
5. **Run the dev servers:**
   ```bash
   # Terminal 1 — backend
   cd server && npm run dev
   # Terminal 2 — frontend
   npm run dev
   ```

## Development Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
   Branch naming: `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `test/…`.
2. Make your changes.
3. **Before opening a PR, verify:**
   ```bash
   # Frontend typecheck/build
   npm run build

   # Backend typecheck
   cd server && npm run build

   # Backend tests
   cd server && npm test
   ```
4. Push and open a PR against `main` with a clear title and description of *what* changed and *why*.

## What We're Looking For

High-impact areas right now (see the README roadmap):

- **Tests** — especially around the game economy (XP/gold calculations, shop purchases, streaks) and dungeon reset logic.
- **Accessibility** — keyboard navigation, ARIA labels, reduced motion.
- **Mobile/PWA** — offline resilience, install flows.
- **Docs** — anything confusing in the README/DESIGN docs, better env var documentation.

## Code Style

- **TypeScript everywhere** — both frontend and backend are TypeScript; avoid `any` where a real type exists.
- **Frontend:** functional React components with hooks; Zustand for state (see `src/store/useStore.ts` patterns); Tailwind utility classes using the existing theme tokens in `tailwind.config.cjs`.
- **Backend:** Express handlers with `withRetry()` for Prisma calls; Zod or manual validation on all input; `logger` (never `console`) in server code; game-economy calculations **always server-side**.
- **Commits:** short imperative subject line (e.g., `Add streak freeze purchase flow`). One logical change per commit.

## Game Design Changes

The game economy (rank reward tables, XP curves, shop prices) is deliberately balanced. If your change affects it:

1. Explain the reasoning (what problem does it solve for players?).
2. Note the expected impact on progression pacing.
3. Add/adjust tests covering the new math.

## Reporting Bugs & Suggesting Features

- **Bugs:** [open an issue](https://github.com/PoornaSri26/solo-quest/issues) with steps to reproduce, expected vs. actual behavior, and environment details.
- **Features:** open an issue tagged `enhancement` describing the player problem it solves.
- **Security vulnerabilities:** do **not** open a public issue — see [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
