// filepath: /src/app.ts
import express, { Express, urlencoded, json } from 'express';
import authRoutes from './routes/authRoutes';
import errorHandler from './middlewares/errorHandler';
import corsMiddleware from './middlewares/cors';

const app: Express = express();

app.use(urlencoded({ extended: true }));
app.use(json());
app.use(corsMiddleware);
app.use('/api/auth', authRoutes);
app.use(errorHandler);

export default app;