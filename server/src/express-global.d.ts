// Type declaration for Express request to add user property
import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload | { userId: string; role?: string };
      /** Set by idempotencyMiddleware when a valid Idempotency-Key was supplied */
      idempotencyKey?: string;
    }
  }
}
