// filepath: /src/app.ts
import express, { Express, urlencoded, json } from 'express';
import authRoutes from './routes/authRoutes';
import navRoutes from './routes/navRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import groupRoutes from './routes/groupRoutes';
import errorHandler from './middlewares/errorHandler';
import corsMiddleware from './middlewares/cors';
import tokenValidator from './middlewares/tokenValidator';
import rateLimit from './middlewares/rateLimiter';
import securityHeaders from './middlewares/securityHeaders';

const app: Express = express();

app.use(urlencoded({ extended: true }));
app.use(json());
app.use(corsMiddleware);
//app.use(rateLimit);
app.use(securityHeaders);

app.use('/api/auth', rateLimit, authRoutes);
app.use('/api/users', tokenValidator, userRoutes);
app.use('/api/roles', tokenValidator, roleRoutes);
app.use('/api/groups', tokenValidator, groupRoutes);
app.use('/api/nav', navRoutes);

app.use(errorHandler);

export default app;