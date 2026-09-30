import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// ------------------------------------------------------------
// PII redaction (#239) — last-line defense before anything hits
// disk/console. Structural secrets (password/reset-token fields)
// are masked by key name; string values are scrubbed with pattern
// matching for emails, JWTs, and Bearer tokens.
// ------------------------------------------------------------
const REDACTED = '[REDACTED]';

/** Key suffixes whose string values are never logged verbatim. */
const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'resetcode',
  'ssn',
];

/** String patterns scrubbed wherever they appear (including in messages). */
const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  // JSON Web Tokens: three base64url segments.
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, REDACTED],
  // Bearer credentials (Authorization header echoes).
  [/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, `$1${REDACTED}`],
  // Email addresses.
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, REDACTED],
];

function redactString(value: string): string {
  let out = value;
  for (const [pattern, replacement] of REDACTION_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s-]/g, '');
  return SENSITIVE_KEY_FRAGMENTS.some(f => normalized.includes(f));
}

/**
 * Recursively mask secrets in arbitrary log metadata. Plain objects and
 * arrays are walked (bounded by maxDepth); class instances (Dates, Errors,
 * Prisma objects) are passed through untouched so error stacks and dates
 * keep their runtime behavior.
 */
export function redact(value: unknown, maxDepth = 6, depth = 0): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return redactString(value);

  if (typeof value !== 'object') return value;

  if (depth >= maxDepth) return REDACTED;

  if (Array.isArray(value)) {
    return value.map(item => redact(item, maxDepth, depth + 1));
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    // Date, Error, custom class instance — leave as-is (winston serializes).
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) && typeof val !== 'object' ? REDACTED : redact(val, maxDepth, depth + 1);
  }
  return out;
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format(info => {
    info.message = redact(info.message);
    // Leave winston-internal keys (level, timestamp, splat, stack…) intact.
    const internal = new Set(['level', 'timestamp', 'splat', 'stack', 'message']);
    const meta: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(info)) {
      if (!internal.has(key)) meta[key] = redact(val);
    }
    for (const key of Object.keys(meta)) {
      (info as any)[key] = meta[key];
    }
    return info;
  })(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport with colored output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),
    // Error log file
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // Combined log file
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

export default logger;
