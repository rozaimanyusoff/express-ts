// filepath: /Users/rozaiman/express-ts/src/types/express/index.d.ts
import { JwtPayload } from 'jsonwebtoken';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload | string;
  }
}