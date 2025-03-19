// filepath: /src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  res.status(500).json({ message: 'Internal server error' });
};

export default errorHandler;