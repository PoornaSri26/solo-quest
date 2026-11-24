# AGENTS.md

## Project
Solo Quest — gamified productivity RPG. React 18 + Vite + Tailwind (frontend), Express + Prisma (backend), SQLite/PostgreSQL.

## Commands
npm run dev
npm run build
npm run typecheck
cd server && npm run dev
cd server && npm test

## Rules
- Read /docs before coding.
- Follow CODE_STYLE.md and DESIGN_SYSTEM.md.
- Work one phase at a time.
- Economy mutations go through server/src/economy.ts ledger helpers.
- Third-party APIs called server-side only.

## Ask first
- Adding a dependency
- Changing DB schema

## Never
- Commit secrets or .env
- Edit .env files
- Call third-party APIs from browser
