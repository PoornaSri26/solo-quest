/**
 * Unit tests for env.ts — config validation and the shared origin allowlist
 * that CORS/CSP/CSRF all consume.
 *
 * env.ts runs validateEnv() at import time, so each test re-requires the
 * module after jest.resetModules() with freshly arranged process.env.
 * A valid baseline is installed in beforeEach; individual tests override
 * specific variables to trigger failure paths.
 */
describe('env validation', () => {
  const REAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...REAL_ENV };
    // Minimal valid baseline.
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-16ch';
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.FRONTEND_URL;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.REDIS_URL;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = REAL_ENV;
  });

  function loadEnvModule(): typeof import('../src/env') {
    return require('../src/env');
  }

  /** Invalid config must abort startup: make the mocked exit observable. */
  function expectStartupAbort(): void {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {
        throw new Error(`process.exit(${code})`);
      }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => loadEnvModule()).toThrow('process.exit(1)');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
      errSpy.mockRestore();
    }
  }

  it('parses a valid environment and applies defaults', () => {
    const { env } = loadEnvModule();

    expect(env.PORT).toBe('5000');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.FRONTEND_URL).toBe('http://localhost:5173');
    expect(env.JWT_SECRET).toBe('test-secret-at-least-16ch');
    expect(env.ALLOWED_ORIGINS).toBe(
      'http://localhost:3000,http://localhost:5173,http://localhost:5000,http://localhost,' +
        'http://127.0.0.1:5173,http://127.0.0.1,http://127.0.0.1:5000'
    );
    expect(env.REDIS_URL).toBeUndefined();
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
  });

  it('keeps explicitly-set values over defaults', () => {
    process.env.PORT = '9999';
    process.env.LOG_LEVEL = 'debug';
    process.env.FRONTEND_URL = 'https://soloquest.app';

    const { env } = loadEnvModule();

    expect(env.PORT).toBe('9999');
    expect(env.LOG_LEVEL).toBe('debug');
    expect(env.FRONTEND_URL).toBe('https://soloquest.app');
  });

  it('parses allowedOrigins: trims whitespace, filters empties, dedupes', () => {
    process.env.ALLOWED_ORIGINS = 'http://a.com, http://b.com ,,http://a.com,http://c.com';

    const { allowedOrigins } = loadEnvModule();

    expect(allowedOrigins).toEqual(['http://a.com', 'http://b.com', 'http://c.com']);
  });

  it('exits when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expectStartupAbort();
  });

  it('exits when JWT_SECRET is shorter than 16 characters', () => {
    process.env.JWT_SECRET = 'short';
    expectStartupAbort();
  });

  it('exits when LOG_LEVEL is not one of the allowed levels', () => {
    process.env.LOG_LEVEL = 'verbose';
    expectStartupAbort();
  });

  it('exits when NODE_ENV is not a known environment', () => {
    process.env.NODE_ENV = 'staging';
    expectStartupAbort();
  });
});
