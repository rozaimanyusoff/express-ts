import express, { Express, urlencoded, json } from 'express';
import authRoutes from './p.auth/adms/authRoutes';
import navRoutes from './p.nav/navRoutes';
import userRoutes from './p.user/userRoutes';
import roleRoutes from './p.role/roleRoutes';
import groupRoutes from './p.group/groupRoutes';
import assetRoutes from './p.asset/assetRoutes';
import stockRoutes from './p.stock/rt/stockRoutes';
import telcoRoutes from './p.telco/telcoRoutes';
import purchaseRoutes from './p.purchase/purchaseRoutes';
import billingRoutes from './p.billing/billingRoutes';
import importRoutes from './p.admin/importerRoutes';
import errorHandler from './middlewares/errorHandler';
import corsMiddleware from './middlewares/cors';
import tokenValidator from './middlewares/tokenValidator';
import rateLimit from './middlewares/rateLimiter';
import securityHeaders from './middlewares/securityHeaders';
import logger from './utils/logger';
import path from 'path';

const app: Express = express();

app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(json({ limit: '10mb' }));
app.use(corsMiddleware);
app.options('*', corsMiddleware);
//app.use(rateLimit);
app.use(securityHeaders);

// Serve uploads directory for profile images
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', tokenValidator, roleRoutes);
app.use('/api/groups', tokenValidator, groupRoutes);
app.use('/api/nav', tokenValidator, navRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/telco', telcoRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/bills', billingRoutes);
app.use('/api/importer', tokenValidator, importRoutes);

app.use(errorHandler);

export default app;