// filepath: /src/app.ts
import express from 'express';
import authRoutes from './routes/authRoutes';
import errorHandler from './middlewares/errorHandler';

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

export default app;