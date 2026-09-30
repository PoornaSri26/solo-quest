/**
 * Middleware integration tests (review: "no integration tests exercise
 * middleware ordering"). Boots the REAL exported Express app via supertest
 * and asserts on ordering-dependent behavior — the class of regression that
 * per-handler unit tests cannot catch (e.g. the 404 handler being registered
 * before most routes, which would turn every late-registered endpoint into
 * an instant 404).
 *
 * The app module connects to Prisma lazily via startServer(), which these
 * tests do NOT call — the exported `app` is ready for supertest as-is.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-16ch';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

// Use the REAL env module with the shared origin allowlist (ALLOWED_ORIGINS
// plus localhost-on-any-port in dev/test, per ADR-003). A hand-written mock
// must never drift from env.ts — omitting isOriginAllowed (which index.ts
// uses for CORS and csrf.ts for CSRF) turns every request into a 500, which
// is exactly the drift this suite hit when isOriginAllowed was introduced.
// Env vars are seeded inside the factory because jest.mock factories run at
// first require — before this file's top-of-body statements execute.
jest.mock('../src/env', () => {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-16ch';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
  process.env.ALLOWED_ORIGINS =
    'http://localhost:3000,http://localhost:5173,http://localhost:5000,http://localhost';
  return jest.requireActual('../src/env');
});

import request from 'supertest';
import app from '../src/index';

describe('middleware pipeline (integration)', () => {
  it('assigns an X-Request-ID to every response', async () => {
    const res = await request(app).get('/definitely-not-a-real-route-xyz');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('returns JSON 404 (not a hang or HTML) for unknown routes', async () => {
    const res = await request(app).get('/definitely-not-a-real-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'Not found' });
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('does NOT 404 routes registered after the old mid-file error handlers — /api/subscription/plans is reachable', async () => {
    // This is the ordering regression guard: before the fix, the catch-all
    // 404 was registered ~line 1490, before most route definitions, which
    // made late-registered routes unreachable (always 404).
    const res = await request(app).get('/api/subscription/plans');
    expect(res.status).not.toBe(404);
    expect(res.body).toHaveProperty('plans');
  });

  it('rejects mutations with a disallowed Origin header (CSRF active on /api)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: 'a@b.c', password: 'whatever123' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/origin/i);
  });

  it('exempts the Stripe webhook from CSRF (server-to-server, no Origin header)', async () => {
    // No Origin/Referer at all: would 403 in production without the exemption.
    // The webhook then fails signature validation (400/500), NOT CSRF (403).
    const res = await request(app)
      .post('/api/subscription/webhook')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).not.toBe(403);
  });

  it('does not set cache headers on mutating requests (GET-only caching)', async () => {
    const res = await request(app)
      .post('/api/shop/purchase/nonexistent-item')
      .set('Origin', 'http://localhost:5173')
      .send({});
    // May be 401 (no token) — the point is no public cache directive on a POST
    expect(res.headers['cache-control']).toBeUndefined();
  });

  it('rate limiting is keyed per user for authenticated-shaped requests (smoke: responds, not crashes)', async () => {
    // Garbage token: auth will 403, but the request must survive the whole
    // pipeline (rate limit, csrf, timeout) without a 500.
    const res = await request(app)
      .get('/api/quests')
      .set('Authorization', 'Bearer not-a-real-token')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(403);
  });
});
