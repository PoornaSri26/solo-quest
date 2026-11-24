# TRD --- Solo Quest

## Stack
- Frontend: React 18 + Vite + Tailwind + TypeScript
- State: Zustand
- Routing: react-router-dom v7
- 3D: three / @react-three/fiber / drei
- Animation: framer-motion, gsap
- Backend: Express + TypeScript (ts-node-dev)
- ORM: Prisma (SQLite dev, PostgreSQL prod)
- Cache: Redis (optional, in-memory fallback)
- Realtime: Socket.io
- Mobile: Capacitor (iOS/Android)
- Payments: Stripe
- Deploy: Docker, Kubernetes, nginx

## Non-functional
- Page load < 2s; API P99 < 100ms (cached).
- Support 10k+ users.
- 99.9% availability target.
- Responsive (mobile + desktop).

## Integrations
Stripe, Socket.io, Capacitor push, optional Redis.

## Constraints
- Web-first; mobile via Capacitor wrapper.
- Economy calculations server-side only.
- Free tier keeps core features usable.
