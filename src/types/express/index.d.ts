// filepath: /Users/rozaiman/express-ts/src/types/express/index.d.ts
import { JwtPayload } from 'jsonwebtoken';

/** Application-specific JWT payload shape — extends JwtPayload with app fields. */
export interface AppJwtPayload extends JwtPayload {
  id?: number;
  userId?: number;
  session?: string;
  email?: string;
  role?: string | number;
  name?: string;
  department?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AppJwtPayload | string;
  }
}