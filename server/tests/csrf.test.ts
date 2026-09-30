/**
 * Unit tests for CSRF Origin/Referer validation covering every branch:
 * safe methods, websocket upgrades, webhook exemptions, allowlisted and
 * unknown origins, referer fallback, malformed referers, and the
 * dev/prod behavior when neither header is present.
 */
// Use the REAL env module: csrf.ts consumes the shared isOriginAllowed
// helper, so a hand-written mock must never drift from env.ts (that drift
// is exactly what broke this suite when isOriginAllowed was introduced).
// Env vars are seeded inside the factory because jest.mock factories run
// at first require — before this file's top-of-body statements execute.
jest.mock('../src/env', () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-16ch';
  process.env.ALLOWED_ORIGINS = 'http://localhost:5173,https://app.example.com';
  return jest.requireActual('../src/env');
});

import type { Request, Response } from 'express';
import { csrfProtection, generateCsrfToken, CSRF_EXEMPT_PATHS } from '../src/csrf';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    path: '/api/quests',
    originalUrl: '/api/quests',
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('csrfProtection', () => {
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
  });

  it('allows safe methods without origin checks', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      next.mockClear();
      csrfProtection(makeReq({ method }), makeRes(), next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('allows websocket upgrade requests (case-insensitive header value)', () => {
    csrfProtection(makeReq({ headers: { upgrade: 'WebSocket' } } as any), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('exempts the signature-verified Stripe webhook path (path and originalUrl)', () => {
    csrfProtection(
      makeReq({
        path: '/api/subscription/webhook',
        originalUrl: '/api/subscription/webhook?sig=x',
      }),
      makeRes(),
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('allows requests with an allowlisted Origin', () => {
    csrfProtection(
      makeReq({ headers: { origin: 'https://app.example.com' } } as any),
      makeRes(),
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('rejects requests with an unknown Origin (403 Invalid origin)', () => {
    const res = makeRes();

    csrfProtection(
      makeReq({ headers: { origin: 'https://evil.example' } } as any),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid origin' });
    expect(next).not.toHaveBeenCalled();
  });

  it('falls back to a valid Referer when Origin is absent', () => {
    csrfProtection(
      makeReq({ headers: { referer: 'https://app.example.com/dashboard' } } as any),
      makeRes(),
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('rejects a non-allowlisted Referer (403 Invalid referer)', () => {
    const res = makeRes();

    csrfProtection(
      makeReq({ headers: { referer: 'https://evil.example/x' } } as any),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid referer' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a malformed Referer URL', () => {
    const res = makeRes();

    csrfProtection(makeReq({ headers: { referer: '::::not-a-url' } } as any), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid referer' });
    expect(next).not.toHaveBeenCalled();
  });

  // csrf.ts reads process.env.NODE_ENV directly for the dev convenience
  // branch, so flipping it at runtime (not via the parsed env object) is
  // both required and sufficient here.
  it('allows missing Origin/Referer in development (curl/testing convenience)', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      csrfProtection(makeReq(), makeRes(), next);
      expect(next).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('rejects missing Origin/Referer outside development (403)', () => {
    const res = makeRes();
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      csrfProtection(makeReq(), res, next);
    } finally {
      process.env.NODE_ENV = prev;
    }

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'CSRF protection: Missing origin/referer' });
    expect(next).not.toHaveBeenCalled();
  });

  it('exposes the webhook exemption set', () => {
    expect(CSRF_EXEMPT_PATHS.has('/api/subscription/webhook')).toBe(true);
  });
});

describe('generateCsrfToken', () => {
  it('produces a non-empty token', () => {
    expect(generateCsrfToken().length).toBeGreaterThan(0);
  });

  it('produces different tokens across calls', () => {
    expect(generateCsrfToken()).not.toBe(generateCsrfToken());
  });
});
