import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log full error on the server for diagnosis, but avoid sending internal details to clients
  console.error('Global error handler:', err);

  const statusCode = err && err.status ? err.status : 500;

  // Expose message only for expected client errors (status < 500) or when explicitly flagged
  const exposeMessage = (statusCode < 500) || err && err.isPublic;

  res.status(statusCode).json({
    status: false,
    message: exposeMessage ? (err && err.message) : 'Internal Server Error',
  });
};

export default errorHandler;