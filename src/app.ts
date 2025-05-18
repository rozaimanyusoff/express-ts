import express, { Express, urlencoded, json } from 'express';
import authRoutes from './routes/authRoutes';
import navRoutes from './routes/navRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import groupRoutes from './routes/groupRoutes';
import assetRoutes from './routes/assetRoutes';
import telcoRoutes from './routes/telcoRoutes';
import errorHandler from './middlewares/errorHandler';
import corsMiddleware from './middlewares/cors';
import tokenValidator from './middlewares/tokenValidator';
import rateLimit from './middlewares/rateLimiter';
import securityHeaders from './middlewares/securityHeaders';
import logger from './utils/logger';
import path from 'path';

const app: Express = express();

app.use(urlencoded({ extended: true }));
app.use(json());
app.use(corsMiddleware);
app.options('*', corsMiddleware);
//app.use(rateLimit);
app.use(securityHeaders);

// Serve uploads directory for profile images
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', tokenValidator, userRoutes);
app.use('/api/roles', tokenValidator, roleRoutes);
app.use('/api/groups', tokenValidator, groupRoutes);
app.use('/api/nav', tokenValidator, navRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/telco', telcoRoutes);

app.use(errorHandler);

export default app;