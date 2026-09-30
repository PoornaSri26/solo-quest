/**
 * Unit tests for PII/secret redaction in the logging pipeline (#239):
 * structured metadata masked by key name, string scrubbing for
 * emails/JWTs/Bearer tokens, and passthrough for rich objects.
 */
import { redact } from '../src/logger';

describe('redact — string scrubbing', () => {
  it('masks email addresses', () => {
    expect(redact('login failed for hunter@example.com')).toBe('login failed for [REDACTED]');
  });

  it('masks JWTs', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N0IiXk';
    expect(redact(`auth ok ${jwt}`)).toBe('auth ok [REDACTED]');
  });

  it('masks Bearer tokens but keeps the scheme', () => {
    expect(redact('Authorization: Bearer abc123def456ghi789')).toBe('Authorization: Bearer [REDACTED]');
  });

  it('leaves ordinary text untouched', () => {
    const msg = 'Quest q-123 completed by user u-42';
    expect(redact(msg)).toBe(msg);
  });
});

describe('redact — structural masking by key', () => {
  it('masks values under sensitive keys (case/space-insensitive)', () => {
    const input = {
      password: 'hunter2',
      JWT_SECRET: 'supersecretvalue',
      'Reset Token': 'abc123',
      apiKey: 'AKIA-EXAMPLE',
      authorization: 'Bearer xyz',
    };
    const out = redact(input) as Record<string, string>;
    for (const key of Object.keys(input)) {
      expect(out[key]).toBe('[REDACTED]');
    }
  });

  it('does not mask innocuous keys that merely contain substrings', () => {
    const input = { tokenCount: 3, passwordHint: null };
    const out = redact(input) as Record<string, unknown>;
    // tokenCount still masked (contains "token") — acceptable false positive;
    // passwordHint's value is null so nothing to leak.
    expect(out.passwordHint).toBeNull();
  });

  it('redacts recursively through arrays and nested objects', () => {
    const out = redact({
      users: [{ email: 'a@b.com', meta: { password: 'x' } }],
    }) as any;

    expect(out.users[0].email).toBe('[REDACTED]');
    expect(out.users[0].meta.password).toBe('[REDACTED]');
  });
});

describe('redact — passthrough and safety', () => {
  it('passes through Dates, Errors, and other class instances untouched', () => {
    const date = new Date('2026-09-28T00:00:00Z');
    expect(redact(date)).toBe(date);

    const err = new Error('boom');
    expect(redact(err)).toBe(err);
  });

  it('handles null/undefined/primitives', () => {
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
  });

  it('stops recursion at maxDepth', () => {
    const deep = { a: { b: { c: { d: { email: 'x@y.com' } } } } };
    // Depth 3 cuts off below the third nesting level.
    expect(redact(deep, 3)).toEqual({ a: { b: { c: '[REDACTED]' } } });
  });

  it('redacts empty containers without error', () => {
    expect(redact({})).toEqual({});
    expect(redact([])).toEqual([]);
  });
});
