// Type declaration for Express request to add user property
import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload | { userId: string };
    }
  }
}