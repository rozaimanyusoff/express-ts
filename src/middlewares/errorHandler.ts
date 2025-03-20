import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err);

  const statusCode = err.status || 500;

  res.status(statusCode).json({
    status: false,
    message: err.message || 'Internal Server Error',
    // Optional for debugging (remove in production!)
    // error: err,
  });
};

export default errorHandler;